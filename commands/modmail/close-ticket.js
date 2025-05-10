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

      const config = await modmailCollection.findOne({
        guildId: interaction.guild.id,
      });

      if (!config || !config.logChannelId) {
        console.error("No se encontró el canal de logs configurado.");
        return;
      }

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

      // Actualizar el estado del ticket a "closed"
      await modmailCollection.updateOne(
        { channelId },
        { $set: { status: "closed" } }
      );

      // Eliminar el canal
      const channel = interaction.guild.channels.cache.get(channelId);
      const channelName = channel?.name || "Canal desconocido";
      if (channel) await channel.delete();

      // Enviar mensaje al canal de logs
      const logChannel = interaction.guild.channels.cache.get(
        config.logChannelId
      );
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle(`Broslunas Modmail | ${interaction.guild.name}`)
          .setDescription(
            `❌ Se ha cerrado el ticket: **${channelName}**\nUsuario: <@${ticket.userId}> (${ticket.userId})`
          )
          .setFooter({
            text: `Enviado el ${new Date().toLocaleString()}`,
            iconURL: "https://cdn.broslunas.com/favicon.png",
          });

        await logChannel.send({
          embeds: [logEmbed],
        });
      }
    } catch (err) {
      console.error("Error al cerrar el ticket:", err);
    }
  },
};
