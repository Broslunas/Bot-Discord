const {
  EmbedBuilder,
  PermissionsBitField,
  MessageFlags,
} = require("discord.js");

module.exports = {
  name: "close-ticket",
  description: "Cierra el ticket actual si está registrado en la base de datos",
  async execute(interaction, client) {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.ManageChannels
      )
    ) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          content: "No tienes permisos para usar este comando.",
          flags: MessageFlags.Ephemeral,
        });
      }
      return;
    }

    const channelId = interaction.channel?.id;

    if (!channelId) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          content: "No se pudo identificar el canal. Intenta nuevamente.",
          flags: MessageFlags.Ephemeral,
        });
      }
      return;
    }

    try {
      const db = client.mongoClient.db("Info");
      const modmailCollection = db.collection(`MdMail-${interaction.guild.id}`);

      // Verificar si el canal está registrado como ticket
      const ticket = await modmailCollection.findOne({ channelId });

      if (!ticket) {
        if (!interaction.replied && !interaction.deferred) {
          return interaction.reply({
            content: "Este canal no está registrado como un ticket.",
            flags: MessageFlags.Ephemeral,
          });
        }
        return;
      }

      // Verificar si el canal aún existe
      const channel = interaction.guild.channels.cache.get(channelId);
      if (!channel) {
        await modmailCollection.deleteOne({ channelId });
        if (!interaction.replied && !interaction.deferred) {
          return interaction.reply({
            content:
              "El canal ya no existe, pero se eliminó de la base de datos.",
            flags: MessageFlags.Ephemeral,
          });
        }
        return;
      }

      // Enviar mensaje de advertencia
      const warningEmbed = new EmbedBuilder()
        .setColor(0xffa500)
        .setTitle(`Broslunas Modmail | ${interaction.guild.name}`)
        .setDescription(
          "⚠️ Este ticket será eliminado en 10 segundos. Si deseas cancelar, usa `/reopen ticket`."
        )
        .setFooter({
          text: `Enviado el ${new Date().toLocaleString()}`,
          iconURL: "https://cdn.broslunas.com/favicon.png",
        });

      await interaction.reply({
        embeds: [warningEmbed],
        flags: MessageFlags.Ephemeral,
      });

      // Esperar 10 segs antes de eliminar
      setTimeout(async () => {
        try {
          // Verificar si el canal aún existe antes de eliminar
          const channelToDelete =
            interaction.guild.channels.cache.get(channelId);
          if (channelToDelete) {
            await channelToDelete.delete();
          }

          // Eliminar el registro de la base de datos
          await modmailCollection.deleteOne({ channelId });

          // Enviar mensaje al MD del usuario
          const user = await client.users.fetch(ticket.userId);
          const dmEmbed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle(`Broslunas Modmail | ${interaction.guild.name}`)
            .setDescription(
              "✅ Tu ticket ha sido eliminado correctamente. Si necesitas más ayuda, no dudes en abrir otro ticket."
            )
            .setFooter({
              text: `Enviado el ${new Date().toLocaleString()}`,
              iconURL: "https://cdn.broslunas.com/favicon.png",
            });

          await user.send({ embeds: [dmEmbed] });
        } catch (err) {
          console.error(
            "Error al eliminar el ticket o enviar mensaje al MD:",
            err
          );
        }
      }, 10000); // 1 minuto en milisegundos
    } catch (err) {
      console.error(err);

      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(`Broslunas Modmail | ${interaction.guild.name}`)
        .setDescription("❌ Hubo un error al procesar el cierre del ticket.")
        .setFooter({
          text: `Enviado el ${new Date().toLocaleString()}`,
          iconURL: "https://cdn.broslunas.com/favicon.png",
        });

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          embeds: [errorEmbed],
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.followUp({
          embeds: [errorEmbed],
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
