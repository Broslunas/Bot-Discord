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

    const user = interaction.user; // Obtener el usuario que ejecuta el comando
    const ticketId = Math.floor(10000 + Math.random() * 90000).toString(); // Generar un número aleatorio de 5 dígitos

    try {
      const db = client.mongoClient.db("Info");
      const modmailCollection = db.collection(`MdMail-${interaction.guild.id}`);

      const config = await modmailCollection.findOne({
        guildId: interaction.guild.id,
      });

      if (!config || !config.categoryId || !config.logChannelId) {
        return interaction.reply({
          content: "El sistema de modmail no está configurado correctamente.",
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

      const channelName = `ticket-${user.username}-${ticketId}`; // Nombre del canal con el ticketId
      const ticketChannel = await interaction.guild.channels.create({
        name: channelName,
        type: 0, // Canal de texto
        parent: category.id,
        topic: `Ticket de modmail para ${user.tag}`,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel], // Denegar acceso al resto del servidor
          },
          {
            id: user.id,
            allow: [PermissionsBitField.Flags.ViewChannel], // Permitir acceso al usuario que creó el ticket
          },
          {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel], // Asegurar que el rol @everyone no tenga acceso
          },
        ],
      });

      // Guardar información del ticket en la base de datos
      await modmailCollection.insertOne({
        guildId: interaction.guild.id,
        userId: user.id,
        channelId: ticketChannel.id,
        channelName: channelName, // Añadir el nombre del canal
        createdAt: new Date(),
        status: "open", // Añadir el estado del ticket como "open"
      });

      // Enviar mensaje al canal de logs
      const logChannel = interaction.guild.channels.cache.get(
        config.logChannelId
      );
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle(`Broslunas Modmail | ${interaction.guild.name}`)
          .setDescription(
            `🎫 Se ha creado un nuevo ticket: ${ticketChannel}\nUsuario: ${user.tag} (${user.id})`
          )
          .setFooter({
            text: `Enviado el ${new Date().toLocaleString()}`,
            iconURL: "https://cdn.broslunas.com/favicon.png",
          });

        await logChannel.send({ embeds: [logEmbed] });
      }

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle(`Broslunas Modmail | ${interaction.guild.name}`)
        .setDescription(`✅ Ticket creado correctamente: ${ticketChannel}`)
        .setFooter({
          text: `Enviado el ${new Date().toLocaleString()}`,
          iconURL: "https://cdn.broslunas.com/favicon.png",
        });

      await interaction.reply({ embeds: [embed], ephemeral: true });

      const ticketEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`Broslunas Modmail | ${interaction.guild.name}`)
        .setDescription(
          `Hola ${user}, este es tu ticket de modmail. Un miembro del equipo te asistirá pronto.`
        )
        .setFooter({
          text: `Enviado el ${new Date().toLocaleString()}`,
          iconURL: "https://cdn.broslunas.com/favicon.png",
        });

      await ticketChannel.send({
        content: `${user}`,
        embeds: [ticketEmbed],
      });
    } catch (err) {
      console.error(err);

      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setDescription("❌ Hubo un error al crear el ticket.")
        .setFooter({
          text: `Enviado el ${new Date().toLocaleString()}`,
          iconURL: "https://cdn.broslunas.com/favicon.png",
        });

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
