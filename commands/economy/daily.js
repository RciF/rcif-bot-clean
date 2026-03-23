const { SlashCommandBuilder } = require("discord.js")
const economyRepository = require("../../repositories/economyRepository")

const DAILY_COOLDOWN = 86400000 // 24 ساعة

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("الحصول على المكافأة اليومية"),

  async execute(interaction) {
    try {
      const userId = interaction.user.id

      let user = await economyRepository.getUser(userId)

      if (!user) {
        user = await economyRepository.createUser(userId)
      }

      const now = Date.now()
      const lastDaily = user.last_daily || 0

      if (now - lastDaily < DAILY_COOLDOWN) {

        const remaining = Math.ceil(
          (DAILY_COOLDOWN - (now - lastDaily)) / (1000 * 60 * 60)
        )

        return interaction.reply({
          content: `⏳ يمكنك استخدام الأمر بعد **${remaining} ساعة**`,
          ephemeral: true
        })
      }

      const reward = 100

      user.coins = (user.coins || 0) + reward
      user.last_daily = now

      await economyRepository.updateUser(userId, user)

      await interaction.reply({
        content: `💰 حصلت على **${reward}** كوين كمكافأة يومية!`
      })

    } catch (error) {

      console.error("DAILY_COMMAND_ERROR", error)

      await interaction.reply({
        content: "❌ حصل خطأ في المكافأة اليومية",
        ephemeral: true
      })

    }
  }
}