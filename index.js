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
  { name: "ping", description: "Responde con pong y muestra botones" },
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
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  try {
    console.log("Registrando comandos…");
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );
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

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Map();

// Load commands dynamically
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.name, command);
}

client.once(Events.ClientReady, () => {
  console.log(`Bot listo! ${client.user.tag}`);
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

client.login(process.env.DISCORD_TOKEN);
