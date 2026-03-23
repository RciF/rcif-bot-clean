const { SlashCommandBuilder } = require("discord.js");
const economyRepository = require("../../repositories/economyRepository");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("عرض أغنى اللاعبين"),

  async execute(interaction) {
    try {

      const topUsers = await economyRepository.getTopUsers(10);

      if (!topUsers.length) {
        return interaction.reply("لا يوجد بيانات بعد");
      }

      let text = "🏆 أغنى اللاعبين:\n\n";

      let i = 1;

      for (const userData of topUsers) {

        let username = "Unknown";

        try {
          const user = await interaction.client.users.fetch(userData.user_id);
          username = user.username;
        } catch {}

        text += `${i}. ${username} — ${userData.coins} كوين\n`;
        i++;
      }

      await interaction.reply(text);

    } catch (error) {

      console.error("LEADERBOARD_COMMAND_ERROR", error);

      await interaction.reply({
        content: "❌ حدث خطأ",
        ephemeral: true
      });

    }
  },
};