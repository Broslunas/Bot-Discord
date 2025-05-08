const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  name: "ping",
  description: "Responde con pong y muestra botones",
  async execute(interaction) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("refresh")
        .setLabel("🔄 Actualizar")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("close")
        .setLabel("❌ Cerrar")
        .setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle("Pong!")
      .setDescription(
        `Latencia: ${Date.now() - interaction.createdTimestamp}ms`
      );

    await interaction.reply({
      embeds: [embed],
      components: [row],
    });
  },
};
