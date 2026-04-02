const { SlashCommandBuilder } = require("discord.js")
const economyRepository = require("../../repositories/economyRepository")

const WORK_COOLDOWN = 60 * 60 * 1000 // ساعة

module.exports = {
  data: new SlashCommandBuilder()
    .setName("work")
    .setDescription("العمل لكسب كوين"),

  async execute(interaction, client) {
    try {

      const userId = interaction.user.id
      const now = Date.now()
      const reward = Math.floor(Math.random() * 50) + 10

      let user = await economyRepository.getUser(userId)

      if (!user) {
        user = await economyRepository.createUser(userId)
      }

      const lastWork = user.last_work || 0

      if (now - lastWork < WORK_COOLDOWN) {
        return interaction.reply({
          content: "⏳ انتظر قبل العمل مرة أخرى",
          ephemeral: true
        })
      }

      // 💰 إضافة الكوين فقط
      await economyRepository.addCoins(userId, reward)

      // 🕒 تحديث وقت work فقط
      await economyRepository.updateWork(userId, now)

      await interaction.reply(`💼 عملت وكسبت **${reward}** كوين`)

    } catch (error) {

      console.error("WORK_COMMAND_ERROR", error)

      await interaction.reply({
        content: "❌ خطأ",
        ephemeral: true
      })

    }
  }
}