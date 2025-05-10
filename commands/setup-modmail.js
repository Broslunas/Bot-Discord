const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  name: "setup",
  description: "Configura el sistema de modmail",
  options: [
    {
      name: "categoria",
      type: 3, // String type
      description:
        "ID de la categoría donde se enviarán los mensajes de modmail",
      required: true,
    },
  ],
  async execute(interaction, client) {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return interaction.reply({
        content: "No tienes permisos para usar este comando.",
        ephemeral: true,
      });
    }

    const categoryId = interaction.options.getString("categoria");
    const category = interaction.guild.channels.cache.get(categoryId);

    if (!category || category.type !== 4) {
      // 4 is the type for categories
      return interaction.reply({
        content: "Por favor introduce una ID de categoría válida.",
        ephemeral: true,
      });
    }

    try {
      const db = client.mongoClient.db("Info");
      const modmailCollection = db.collection(`MdMail-${interaction.guild.id}`);

      await modmailCollection.updateOne(
        { guildId: interaction.guild.id },
        { $set: { categoryId: category.id } },
        { upsert: true }
      );

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setDescription(
          `✅ El sistema de modmail ha sido configurado correctamente en la categoría ${category.name}.`
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      console.error(err);

      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setDescription(
          "❌ Hubo un error al configurar el sistema de modmail."
        );

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
