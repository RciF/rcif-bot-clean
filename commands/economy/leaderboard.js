const { SlashCommandBuilder } = require("discord.js")
const economyRepository = require("../../repositories/economyRepository")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("عرض أغنى اللاعبين"),

  async execute(interaction) {
    try {
      await interaction.deferReply()

      const topUsers = await economyRepository.getTopUsers(10)

      if (!topUsers.length) {
        return interaction.editReply("لا يوجد بيانات بعد")
      }

      let text = "🏆 أغنى اللاعبين:\n\n"

      for (let i = 0; i < topUsers.length; i++) {
        const userData = topUsers[i]
        let username = "Unknown"

        try {
          const user = await interaction.client.users.fetch(userData.user_id)
          username = user.username
        } catch {}

        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`
        text += `${medal} ${username} — ${userData.coins.toLocaleString()} كوين\n`
      }

      await interaction.editReply(text)

    } catch (error) {
      console.error("LEADERBOARD_COMMAND_ERROR", error)
      const reply = interaction.deferred ? "editReply" : "reply"
      await interaction[reply]({ content: "❌ حدث خطأ", ephemeral: true })
    }
  },
}