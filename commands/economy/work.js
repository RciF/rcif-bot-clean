const { SlashCommandBuilder } = require("discord.js")
const economyRepository = require("../../repositories/economyRepository")

const WORK_COOLDOWN = 60 * 60 * 1000 // ساعة

module.exports = {
  data: new SlashCommandBuilder()
    .setName("work")
    .setDescription("العمل لكسب كوين"),

  async execute(interaction) {
    try {

      const userId = interaction.user.id

      let user = await economyRepository.getUser(userId)

      if (!user) {
        user = await economyRepository.createUser(userId)
      }

      const now = Date.now()
      const lastWork = user.last_work || 0

      // ✅ cooldown
      if (now - lastWork < WORK_COOLDOWN) {

        const remaining = Math.ceil(
          (WORK_COOLDOWN - (now - lastWork)) / (1000 * 60)
        )

        return interaction.reply({
          content: `⏳ تقدر تشتغل بعد ${remaining} دقيقة`,
          ephemeral: true
        })
      }

      const reward = Math.floor(Math.random() * 50) + 10

      user.coins = (user.coins || 0) + reward
      user.last_work = now

      await economyRepository.updateUser(userId, user)

      await interaction.reply(`💼 عملت وكسبت **${reward}** كوين`)

    } catch (error) {

      console.error("WORK_COMMAND_ERROR", error)

      await interaction.reply({
        content: "❌ حصل خطأ في العمل",
        ephemeral: true
      })

    }
  },
}