const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
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
  async execute(interaction, client) {
    const OWNER_ID = "787989194919772170";
    const msg = interaction.options.getString("mensaje");
    const isAnonymous = interaction.options.getBoolean("anonimo") || false;

    try {
      const owner = await client.users.fetch(OWNER_ID);

      const embedToOwner = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("📬 Nuevo Mensaje")
        .setDescription(
          isAnonymous
            ? "De: **Anónimo**"
            : `De: **${interaction.user.tag}** (ID: ${interaction.user.id})`
        )
        .addFields({ name: "Mensaje", value: `**${msg}**` });

      await owner.send({ embeds: [embedToOwner] });

      const embedToUser = new EmbedBuilder()
        .setColor(0x00ff00)
        .setDescription("¡Mensaje enviado al owner!");

      await interaction.reply({
        embeds: [embedToUser],
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      console.error(err);

      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setDescription("Error al enviar mensaje.");

      await interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
