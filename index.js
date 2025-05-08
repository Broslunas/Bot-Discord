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

const commands = [
  {
    name: "mail",
    description: "Envía un modmail al owner",
    options: [
      {
        name: "mensaje",
        type: 3,
        description: "Contenido del mensaje",
        required: true,
      },
      {
        name: "anonimo",
        type: 5,
        description: "Enviar el mensaje de forma anónima",
        required: false,
      },
    ],
  },
  {
    name: "set-custom-join-msg",
    description: "Configura un mensaje de bienvenida personalizado",
    options: [
      {
        name: "canal",
        type: 7, // Channel type
        description: "Canal donde se enviará el mensaje de bienvenida",
        required: true,
      },
      {
        name: "mensaje",
        type: 3, // String type
        description: "Mensaje antes del nombre del usuario",
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  try {
    console.log("Registrando comandos…");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log("Comandos registrados correctamente");
  } catch (error) {
    console.error(error);
  }
})();

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
const { MongoClient } = require("mongodb");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Map();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

// Load commands dynamically
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.name, command);
}

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

    await serversCollection.deleteMany({}); // Limpia la tabla antes de insertar
    await serversCollection.insertMany(serverData);

    console.log("Datos de servidores añadidos a la base de datos");
  } catch (error) {
    console.error("Error al conectar a MongoDB:", error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (command) {
      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: "Hubo un error al ejecutar este comando.",
          ephemeral: true,
        });
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

      await interaction.update({
        embeds: [embed],
      });
    }
    if (interaction.customId === "close") {
      await interaction.message.delete();
    }
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  console.log(
    `Nuevo miembro detectado: ${member.user.tag} (${member.user.id}) en el servidor ${member.guild.name} (${member.guild.id})`
  );

  try {
    const db = client.mongoClient.db("Info");
    const joinMsgCollection = db.collection("JoinMsg");

    console.log(
      "Buscando configuración de mensaje de bienvenida en la base de datos..."
    );
    const config = await joinMsgCollection.findOne({
      guildId: member.guild.id,
    });

    if (config) {
      console.log(
        `Configuración encontrada: Canal ID: ${config.channelId}, Mensaje: "${config.message}"`
      );
      const channel = await member.guild.channels.fetch(config.channelId);

      if (channel && channel.isTextBased()) {
        console.log(
          `Enviando mensaje de bienvenida en el canal ${channel.name} (${channel.id})`
        );
        await channel.send(`${config.message} ${member.user}`);
      } else {
        console.error(
          `El canal configurado no es válido o no es accesible: ${config.channelId}`
        );
      }
    } else {
      console.log(
        "No se encontró configuración de mensaje de bienvenida para este servidor."
      );
    }
  } catch (error) {
    console.error("Error al enviar el mensaje de bienvenida:", error);
  }
});

process.on("exit", async () => {
  await mongoClient.close();
  console.log("Conexión a MongoDB cerrada");
});

client.login(process.env.DISCORD_TOKEN);
