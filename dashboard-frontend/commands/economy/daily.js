const { SlashCommandBuilder } = require("discord.js")
const economyRepository = require("../../repositories/economyRepository")

const DAILY_COOLDOWN = 86400000 // 24 ساعة

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("الحصول على المكافأة اليومية"),

  async execute(interaction, client) {
    try {

      const userId = interaction.user.id
      const now = Date.now()
      const reward = 100

      let user = await economyRepository.getUser(userId)

      if (!user) {
        user = await economyRepository.createUser(userId)
      }

      const lastDaily = user.last_daily || 0

      if (now - lastDaily < DAILY_COOLDOWN) {
        return interaction.reply({
          content: "⏳ انتظر 24 ساعة",
          ephemeral: true
        })
      }

      // 💰 إضافة الكوين فقط
      await economyRepository.addCoins(userId, reward)

      // 🕒 تحديث الوقت فقط
      await economyRepository.updateDaily(userId, now)

      await interaction.reply(`🎁 استلمت ${reward} كوين!`)

    } catch (error) {

      console.error("DAILY_COMMAND_ERROR", error)

      await interaction.reply({
        content: "❌ خطأ",
        ephemeral: true
      })

    }
  }
}