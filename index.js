/*
  Bot de Discord con Node.js y discord.js v14
  - Usa slash commands, panels y sistema de modmail
  - Comando /ping y /mail
*/

// 1. Instalar:
// npm init -y
// npm install discord.js dotenv @discordjs/rest discord-api-types

// 2. Crear archivo .env con:
// DISCORD_TOKEN=TU_TOKEN
// CLIENT_ID=ID_DE_TU_APP
// GUILD_ID=ID_DE_TU_SERVIDOR
// OWNER_ID=TU_ID_DE_USUARIO

// 3. register-commands.js: registra los slash commands
require("dotenv").config();
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
const { MongoClient } = require("mongodb");

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
const mongoClient = new MongoClient(process.env.MONGO_URI);

// 4. index.js: carga comandos y maneja modmail
require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Map();

let db;

// Load commands dynamically
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter(
    (file) =>
      file.endsWith(".js") ||
      fs.statSync(path.join(commandsPath, file)).isDirectory()
  );

for (const file of commandFiles) {
  const commandPath = path.join(commandsPath, file);
  if (fs.statSync(commandPath).isDirectory()) {
    const subCommandFiles = fs
      .readdirSync(commandPath)
      .filter((subFile) => subFile.endsWith(".js"));
    for (const subFile of subCommandFiles) {
      const command = require(path.join(commandPath, subFile));
      client.commands.set(command.name, command);
    }
  } else {
    const command = require(commandPath);
    client.commands.set(command.name, command);
  }
}

// Agregar el nuevo comando de economía
const economyCommand = require("./commands/economy");
client.commands.set(economyCommand.name, economyCommand);

// Asegurar que el cliente tenga acceso al cliente de MongoDB
client.mongoClient = mongoClient;

client.once(Events.ClientReady, async () => {
  console.log(`Bot listo! ${client.user.tag}`);

  try {
    await mongoClient.connect();
    db = mongoClient.db("Info");
    console.log("Conectado a MongoDB");

    const serversCollection = db.collection("Servers");
    const serverData = [];

    for (const guild of client.guilds.cache.values()) {
      const owner = await guild.fetchOwner();
      serverData.push({
        id: guild.id,
        name: guild.name,
        owner: {
          id: owner.id,
          name: owner.user.tag,
        },
      });
    }

    if (serverData.length > 0) {
      await serversCollection.deleteMany({}); // Limpia la tabla antes de insertar
      await serversCollection.insertMany(serverData);
      console.log("Datos de servidores añadidos a la base de datos");
    } else {
      console.log("No hay servidores para actualizar en la base de datos.");
    }
  } catch (error) {
    console.error("Error al conectar a MongoDB:", error);
  }
});

(async () => {
  console.log("Actualizando lista de servidores…");

  try {
    await mongoClient.connect();
    const db = mongoClient.db("Info");
    const serversCollection = db.collection("Servers");

    const serverData = [];
    for (const guild of client.guilds.cache.values()) {
      const owner = await guild.fetchOwner();
      serverData.push({
        id: guild.id,
        name: guild.name,
        owner: {
          id: owner.id,
          name: owner.user.tag,
        },
      });
    }

    if (serverData.length > 0) {
      await serversCollection.deleteMany({}); // Limpia la tabla antes de insertar
      await serversCollection.insertMany(serverData);
      console.log("Lista de servidores actualizada.");
    } else {
      console.log("No hay servidores para actualizar en la base de datos.");
    }
  } catch (error) {
    console.error("Error al actualizar la lista de servidores:", error);
  }

  console.log("Registrando comandos…");

  // Extraer datos del comando economy
  const economyCommandData = require("./commands/economy").data.toJSON();

  const commands = [
    require("./commands/mail"),
    require("./commands/ping"),
    require("./commands/modmail/setup-modmail"),
    require("./commands/modmail/create-ticket"),
    require("./commands/modmail/close-ticket"),
    economyCommandData,
  ];

  // Registra comandos globalmente
  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
    body: commands,
  });

  try {
    const db = mongoClient.db("Info");
    const serversCollection = db.collection("Servers");

    const guilds = await serversCollection.find({}).toArray();

    for (const guild of guilds) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, guild.id),
        { body: commands }
      );
      console.log(`Comandos registrados para el servidor: ${guild.id}`);
    }
  } catch (error) {
    console.error("Error al registrar comandos en los servidores:", error);
  }

  console.log("Comandos registrados correctamente.");
})();

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (command) {
      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: "Hubo un error al ejecutar este comando.",
            flags: MessageFlags.Ephemeral,
          });
        }
      }
    }
  }

  // botones ping
  if (interaction.isButton()) {
    if (interaction.customId === "refresh") {
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("Pong!")
        .setDescription(
          `Latencia actualizada: ${
            Date.now() - interaction.message.createdTimestamp
          }ms`
        );

      if (!interaction.replied && !interaction.deferred) {
        await interaction.update({
          embeds: [embed],
        });
      }
    }
    if (interaction.customId === "close") {
      try {
        await interaction.message.delete();
      } catch (error) {
        console.error("Error al eliminar el mensaje:", error);
      }
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  // Ignorar mensajes de bots
  if (message.author.bot) return;

  try {
    const db = client.mongoClient.db("Info");
    const modmailCollection = db.collection(`MdMail-${message.guild.id}`);

    // Verificar si el canal es un ticket
    const ticket = await modmailCollection.findOne({
      channelId: message.channel.id,
    });
    if (!ticket) return; // Si no es un canal de ticket, salir
  } catch (err) {
    console.error("Error al procesar el mensaje:", err);
  }
});

client.on("error", (error) => {
  console.error("Client error:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("exit", async () => {
  await mongoClient.close();
  console.log("Conexión a MongoDB cerrada");
});

client.login(process.env.DISCORD_TOKEN);
