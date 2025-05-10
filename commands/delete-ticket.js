const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  name: "delete-ticket",
  description:
    "Elimina el ticket actual si está registrado en la base de datos",
  async execute(interaction, client) {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.ManageChannels
      )
    ) {
      return interaction.reply({
        content: "No tienes permisos para usar este comando.",
        ephemeral: true,
      });
    }

    const channelId = interaction.channel.id;

    try {
      const db = client.mongoClient.db("Info");
      const modmailCollection = db.collection(`MdMail-${interaction.guild.id}`);

      const ticket = await modmailCollection.findOne({ channelId });

      if (!ticket) {
        return interaction.reply({
          content: "Este canal no está registrado como un ticket.",
          ephemeral: true,
        });
      }

      // Check if the channel still exists
      const channel = interaction.guild.channels.cache.get(channelId);
      if (!channel) {
        await modmailCollection.deleteOne({ channelId });
        return interaction.reply({
          content:
            "El canal ya no existe, pero se eliminó de la base de datos.",
          ephemeral: true,
        });
      }

      await channel.delete();
      await modmailCollection.deleteOne({ channelId });

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setDescription("✅ El ticket ha sido eliminado correctamente.");

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } catch (err) {
      console.error(err);

      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setDescription("❌ Hubo un error al eliminar el ticket.");

      // Ensure the interaction is valid before replying
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },
};
