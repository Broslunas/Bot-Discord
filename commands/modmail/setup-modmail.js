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

      // Crear el canal de logs dentro de la categoría
      const logChannel = await interaction.guild.channels.create({
        name: "modmail-logs",
        type: 0, // Text channel
        parent: category.id,
        topic: "Canal de logs para el sistema de modmail",
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
        ],
      });

      // Guardar la configuración en la base de datos
      await modmailCollection.updateOne(
        { guildId: interaction.guild.id },
        { $set: { categoryId: category.id, logChannelId: logChannel.id } }, // Guardar logChannelId
        { upsert: true }
      );

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle(`Broslunas Modmail | ${interaction.guild.name}`)
        .setDescription(
          `✅ El sistema de modmail ha sido configurado correctamente en la categoría ${category.name}. Se ha creado el canal de logs: ${logChannel}.`
        )
        .setFooter({
          text: `Enviado el ${new Date().toLocaleString()}`,
          iconURL: "https://cdn.broslunas.com/favicon.png",
        });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      console.error(err);

      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(`Broslunas Modmail | ${interaction.guild.name}`)
        .setDescription("❌ Hubo un error al configurar el sistema de modmail.")
        .setFooter({
          text: `Enviado el ${new Date().toLocaleString()}`,
          iconURL: "https://cdn.broslunas.com/favicon.png",
        });

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
