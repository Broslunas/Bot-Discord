const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "economy",
  data: new SlashCommandBuilder()
    .setName("economy")
    .setDescription("Sistema de economía")
    .addSubcommand((subcommand) =>
      subcommand.setName("balance").setDescription("Muestra tu saldo actual")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add-money")
        .setDescription("Agrega dinero a un usuario")
        .addUserOption((option) =>
          option
            .setName("usuario")
            .setDescription("Usuario objetivo")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("cantidad")
            .setDescription("Cantidad de dinero")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove-money")
        .setDescription("Quita dinero a un usuario")
        .addUserOption((option) =>
          option
            .setName("usuario")
            .setDescription("Usuario objetivo")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("cantidad")
            .setDescription("Cantidad de dinero")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("leaderboard")
        .setDescription("Muestra la tabla de clasificación")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("crime")
        .setDescription("Comete un crimen para ganar o perder dinero")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("rob")
        .setDescription("Roba dinero a otro usuario")
        .addUserOption((option) =>
          option
            .setName("usuario")
            .setDescription("Usuario objetivo")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("work").setDescription("Trabaja para ganar dinero")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("gamble")
        .setDescription("Apuesta dinero para ganar o perder")
        .addIntegerOption((option) =>
          option
            .setName("cantidad")
            .setDescription("Cantidad a apostar")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("daily").setDescription("Reclama tu recompensa diaria")
    ),

  async execute(interaction, client) {
    const db = client.mongoClient.db("Info");
    const economyCollection = db.collection("Economy");

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id; // Obtener el ID del servidor

    if (subcommand === "balance") {
      const userId = interaction.user.id;
      const user = await economyCollection.findOne({ guildId, userId });
      const balance = user ? user.balance : 0;

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("💰 Tu Saldo Actual")
        .setDescription(
          `✨ **Tu saldo actual en este servidor es:**\n\n**${balance} monedas** 🪙`
        )
        .setFooter({ text: "¡Sigue acumulando monedas!" });
      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === "add-money") {
      if (!interaction.member.permissions.has("Administrator")) {
        return interaction.reply({
          content: "Solo los administradores pueden usar este comando.",
          ephemeral: true,
        });
      }

      const targetUser = interaction.options.getUser("usuario");
      const amount = interaction.options.getInteger("cantidad");

      await economyCollection.updateOne(
        { guildId, userId: targetUser.id },
        { $inc: { balance: amount } },
        { upsert: true }
      );

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("✅ Dinero Añadido")
        .setDescription(
          `💵 **Se han añadido** \`${amount}\` **monedas a** ${targetUser.tag}.\n\n¡Ahora tienen más para gastar! 🎉`
        )
        .setFooter({ text: "Comando ejecutado por un administrador." });
      await interaction.reply({ embeds: [embed] });
    } else if (
      subcommand === "remove-money" &&
      !interaction.member.permissions.has("Administrator")
    ) {
      const targetUser = interaction.options.getUser("usuario");
      const amount = interaction.options.getInteger("cantidad");

      await economyCollection.updateOne(
        { guildId, userId: targetUser.id },
        { $inc: { balance: -amount } },
        { upsert: true }
      );

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("❌ Dinero Removido")
        .setDescription(
          `💸 **Se han quitado** \`${amount}\` **monedas a** ${targetUser.tag}.\n\n¡Esperemos que no lo noten! 😅`
        )
        .setFooter({ text: "Comando ejecutado por un administrador." });
      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === "leaderboard") {
      const topUsers = await economyCollection
        .find({ guildId })
        .sort({ balance: -1 })
        .limit(10)
        .toArray();

      const leaderboard = topUsers
        .map(
          (user, index) =>
            `${index + 1}. <@${user.userId}>: ${user.balance} monedas`
        )
        .join("\n");

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("🏆 Tabla de Clasificación")
        .setDescription(
          `✨ **Los mejores usuarios en este servidor:**\n\n${leaderboard}\n\n¡Sigue trabajando para alcanzar la cima! 🚀`
        )
        .setFooter({ text: "¡Compite con tus amigos!" });
      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === "crime") {
      const userId = interaction.user.id;
      const cooldownField = "crimeCooldown";
      const cooldown = 5 * 60 * 1000; // 5 minutos
      const now = Date.now();

      const user = await economyCollection.findOne({ guildId, userId });
      if (user && user[cooldownField] && now - user[cooldownField] < cooldown) {
        const timeLeft = Math.ceil(
          (cooldown - (now - user[cooldownField])) / 1000
        );
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;

        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle("Enfriamiento Activo")
          .setDescription(
            `Debes esperar ${minutes} minutos y ${seconds} segundos antes de cometer otro crimen.`
          );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const outcome = Math.random() < 0.5 ? "win" : "lose";
      const amount = Math.floor(Math.random() * 500) + 100;

      if (outcome === "win") {
        await economyCollection.updateOne(
          { guildId, userId },
          { $inc: { balance: amount }, $set: { [cooldownField]: now } },
          { upsert: true }
        );
      } else {
        await economyCollection.updateOne(
          { guildId, userId },
          { $inc: { balance: -amount }, $set: { [cooldownField]: now } },
          { upsert: true }
        );
      }

      const embed = new EmbedBuilder()
        .setColor(outcome === "win" ? 0x00ff00 : 0xff0000)
        .setTitle(outcome === "win" ? "🎉 ¡Éxito!" : "🚨 ¡Fallaste!")
        .setDescription(
          outcome === "win"
            ? `🕵️‍♂️ **Cometiste un crimen y ganaste** \`${amount}\` **monedas!**\n\n¡Qué suerte! 🍀`
            : `👮‍♂️ **Fuiste atrapado y perdiste** \`${amount}\` **monedas!**\n\n¡Mejor suerte la próxima vez! 😔`
        )
        .setFooter({ text: "¡Juega con cuidado!" });
      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === "rob") {
      const targetUser = interaction.options.getUser("usuario");
      const userId = interaction.user.id;
      const target = await economyCollection.findOne({
        guildId,
        userId: targetUser.id,
      });

      if (!target || target.balance < 100) {
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle("Robo Fallido")
          .setDescription(
            `${targetUser.tag} no tiene suficiente dinero para robar.`
          );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const success = Math.random() < 0.5;
      const amount = Math.floor(Math.random() * target.balance * 0.5);

      if (success) {
        await economyCollection.updateOne(
          { guildId, userId },
          { $inc: { balance: amount } },
          { upsert: true }
        );
        await economyCollection.updateOne(
          { guildId, userId: targetUser.id },
          { $inc: { balance: -amount } }
        );
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle("🤑 ¡Robo Exitoso!")
          .setDescription(
            `💰 **Robaste** \`${amount}\` **monedas de** ${targetUser.tag}.\n\n¡Qué golpe maestro! 🦹‍♂️`
          );
        await interaction.reply({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle("😓 ¡Robo Fallido!")
          .setDescription(
            `😢 **Fallaste al intentar robar a** ${targetUser.tag}.\n\n¡Mejor suerte la próxima vez!`
          );
        await interaction.reply({ embeds: [embed] });
      }
    } else if (subcommand === "work") {
      const userId = interaction.user.id;
      const cooldownField = "workCooldown";
      const cooldown = 10 * 60 * 1000; // 10 minutos
      const now = Date.now();

      const user = await economyCollection.findOne({ guildId, userId });
      if (user && user[cooldownField] && now - user[cooldownField] < cooldown) {
        const timeLeft = Math.ceil(
          (cooldown - (now - user[cooldownField])) / 1000
        );

        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle("Enfriamiento Activo")
          .setDescription(
            `Debes esperar ${timeLeft} segundos antes de trabajar nuevamente.`
          );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const amount = Math.floor(Math.random() * 300) + 100;

      await economyCollection.updateOne(
        { guildId, userId },
        { $inc: { balance: amount }, $set: { [cooldownField]: now } },
        { upsert: true }
      );

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("💼 Trabajo Exitoso")
        .setDescription(
          `💪 **Trabajaste duro y ganaste** \`${amount}\` **monedas!**\n\n¡Sigue así para ganar más! 🏆`
        )
        .setFooter({ text: "¡El esfuerzo siempre vale la pena!" });
      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === "gamble") {
      const userId = interaction.user.id;
      const amount = interaction.options.getInteger("cantidad");
      const user = await economyCollection.findOne({ guildId, userId });

      if (!user || user.balance < amount) {
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle("Fondos Insuficientes")
          .setDescription("No tienes suficiente dinero para apostar.");
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const win = Math.random() < 0.5;

      if (win) {
        await economyCollection.updateOne(
          { guildId, userId },
          { $inc: { balance: amount } }
        );
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle("🎲 ¡Apuesta Ganada!")
          .setDescription(
            `🎉 **Ganaste** \`${amount}\` **monedas apostando!**\n\n¡Qué suerte tienes! 🍀`
          );
        await interaction.reply({ embeds: [embed] });
      } else {
        await economyCollection.updateOne(
          { guildId, userId },
          { $inc: { balance: -amount } }
        );
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle("🎲 ¡Apuesta Perdida!")
          .setDescription(
            `😔 **Perdiste** \`${amount}\` **monedas apostando.**\n\n¡Inténtalo de nuevo!`
          );
        await interaction.reply({ embeds: [embed] });
      }
    } else if (subcommand === "daily") {
      const userId = interaction.user.id;
      const cooldownField = "dailyCooldown";
      const cooldown = 24 * 60 * 60 * 1000; // 24 horas
      const now = Date.now();

      const user = await economyCollection.findOne({ guildId, userId });
      if (user && user[cooldownField] && now - user[cooldownField] < cooldown) {
        const timeLeft = Math.ceil(
          (cooldown - (now - user[cooldownField])) / 1000
        );
        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        const seconds = timeLeft % 60;

        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle("Enfriamiento Activo")
          .setDescription(
            `Debes esperar ${hours} horas, ${minutes} minutos y ${seconds} segundos antes de reclamar tu recompensa diaria nuevamente.`
          );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const dailyReward = 500;

      await economyCollection.updateOne(
        { guildId, userId },
        { $inc: { balance: dailyReward }, $set: { [cooldownField]: now } },
        { upsert: true }
      );

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("🎁 Recompensa Diaria")
        .setDescription(
          `✨ **Reclamaste tu recompensa diaria de** \`${dailyReward}\` **monedas!**\n\n¡Vuelve mañana para más! 🌟`
        )
        .setFooter({ text: "¡No olvides reclamar todos los días!" });
      await interaction.reply({ embeds: [embed] });
    }
  },
};
