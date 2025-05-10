const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  name: "create-ticket",
  description: "Crea un nuevo ticket de modmail",
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

    const user = interaction.user; // Get the user executing the command
    const userIdShort = user.id.slice(-5); // Last 5 characters of the user ID

    try {
      const db = client.mongoClient.db("Info");
      const modmailCollection = db.collection(`MdMail-${interaction.guild.id}`);

      const config = await modmailCollection.findOne({
        guildId: interaction.guild.id,
      });

      if (!config || !config.categoryId) {
        return interaction.reply({
          content: "El sistema de modmail no está configurado.",
          ephemeral: true,
        });
      }

      const category = interaction.guild.channels.cache.get(config.categoryId);

      if (!category || category.type !== 4) {
        return interaction.reply({
          content: "La categoría configurada no es válida.",
          ephemeral: true,
        });
      }

      const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${user.username}-${userIdShort}`,
        type: 0, // Text channel
        parent: category.id,
        topic: `Ticket de modmail para ${user.tag}`,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: user.id,
            allow: [PermissionsBitField.Flags.ViewChannel],
          },
        ],
      });

      // Save ticket info to the database
      await modmailCollection.insertOne({
        guildId: interaction.guild.id,
        userId: user.id,
        channelId: ticketChannel.id,
        createdAt: new Date(),
      });

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setDescription(`✅ Ticket creado correctamente: ${ticketChannel}`);

      await interaction.reply({ embeds: [embed], ephemeral: true });

      const ticketEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setDescription(
          `Hola ${user}, este es tu ticket de modmail. Un miembro del equipo te asistirá pronto.`
        );

      await ticketChannel.send({
        content: `${user}`,
        embeds: [ticketEmbed],
      });
    } catch (err) {
      console.error(err);

      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setDescription("❌ Hubo un error al crear el ticket.");

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
