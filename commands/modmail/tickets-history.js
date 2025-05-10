const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  name: "tickets-history",
  description: "Muestra el historial de todos los tickets creados",
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

    try {
      const db = client.mongoClient.db("Info");
      const modmailCollection = db.collection(`MdMail-${interaction.guild.id}`);

      const tickets = await modmailCollection.find({}).toArray();

      if (tickets.length <= 1) {
        return interaction.reply({
          content: "No hay suficientes tickets registrados en el historial.",
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`Historial de Tickets | ${interaction.guild.name}`)
        .setDescription(
          "Aquí está el historial de todos los tickets (excepto el primero):"
        )
        .setFooter({
          text: `Solicitado el ${new Date().toLocaleString()}`,
          iconURL: "https://cdn.broslunas.com/favicon.png",
        });

      tickets
        .slice(1) // Excluir el primer ticket
        .reverse() // Mostrar desde el final hasta el inicio
        .forEach((ticket, index) => {
          embed.addFields({
            name: `Ticket ${tickets.length - index - 1}`,
            value: `Usuario: <@${ticket.userId}>\nCanal: ${
              ticket.channelName
            }\nEstado: ${
              ticket.status === "open" ? "Abierto" : "Cerrado"
            }\nCreado: ${new Date(ticket.createdAt).toLocaleString()}`,
          });
        });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      console.error(err);

      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setDescription("❌ Hubo un error al obtener el historial de tickets.")
        .setFooter({
          text: `Solicitado el ${new Date().toLocaleString()}`,
          iconURL: "https://cdn.broslunas.com/favicon.png",
        });

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
