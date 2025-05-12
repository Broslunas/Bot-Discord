const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  name: "kick",
  description: "Expulsa a un usuario del servidor",
  options: [
    {
      name: "usuario",
      type: 6, // User type
      description: "El usuario que deseas expulsar",
      required: true,
    },
    {
      name: "razon",
      type: 3, // String type
      description: "La razón de la expulsión",
      required: false,
    },
  ],
  async execute(interaction, client) {
    if (
      !interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)
    ) {
      return interaction.reply({
        content: "No tienes permisos para usar este comando.",
        ephemeral: true,
      });
    }

    const user = interaction.options.getUser("usuario");
    const reason =
      interaction.options.getString("razon") || "Sin razón especificada";

    try {
      const member = interaction.guild.members.cache.get(user.id);
      if (!member) {
        return interaction.reply({
          content: "No se pudo encontrar al usuario en este servidor.",
          ephemeral: true,
        });
      }

      // Check if the bot has the necessary permissions
      if (
        !interaction.guild.members.me.permissions.has(
          PermissionsBitField.Flags.KickMembers
        )
      ) {
        return interaction.reply({
          content: "El bot no tiene permisos para expulsar miembros.",
          ephemeral: true,
        });
      }

      await member.kick(reason);

      const embed = new EmbedBuilder()
        .setColor(0xffa500)
        .setTitle("Usuario Expulsado")
        .setDescription(
          `✅ ${user.tag} ha sido expulsado.\n**Razón:** ${reason}`
        )
        .setFooter({
          text: `Acción realizada el ${new Date().toLocaleString()}`,
        });

      await interaction.reply({ embeds: [embed] });

      // Log the action in the database
      const db = client.mongoClient.db("Info");
      const modCollection = db.collection(`Mod-${interaction.guild.id}`);
      await modCollection.insertOne({
        action: "kick",
        userId: user.id,
        userTag: user.tag,
        reason,
        moderatorId: interaction.user.id,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error(err);

      if (!interaction.replied && !interaction.deferred) {
        if (err.code === 50013) {
          return interaction.reply({
            content:
              "No se pudo expulsar al usuario debido a permisos insuficientes.",
            ephemeral: true,
          });
        }

        const errorEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setDescription("❌ Hubo un error al intentar expulsar al usuario.")
          .setFooter({
            text: `Error ocurrido el ${new Date().toLocaleString()}`,
          });

        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },
};
