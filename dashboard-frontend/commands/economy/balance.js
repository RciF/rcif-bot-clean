const { SlashCommandBuilder } = require("discord.js");
const economyRepository = require("../../repositories/economyRepository");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("عرض رصيدك"),

  async execute(interaction) {
    try {

      const userId = interaction.user.id;

      let user = await economyRepository.getUser(userId);

      if (!user) {
        user = await economyRepository.createUser(userId);
      }

      const coins = user.coins || 0;

      await interaction.reply({
        content: `💰 رصيدك: **${coins}** كوين`,
        ephemeral: false
      });

    } catch (error) {

      console.error("BALANCE_COMMAND_ERROR", error);

      await interaction.reply({
        content: "❌ حدث خطأ",
        ephemeral: true
      });

    }
  }
};