const { SlashCommandBuilder } = require("discord.js")
const economyRepository = require("../../repositories/economyRepository")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("transfer")
    .setDescription("تحويل كوين لشخص")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("الشخص الذي تريد التحويل له")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName("amount")
        .setDescription("عدد الكوين")
        .setRequired(true)
    ),

  async execute(interaction) {
    try {

      const senderId = interaction.user.id
      const targetUser = interaction.options.getUser("user")
      const amount = interaction.options.getInteger("amount")

      if (amount <= 0) {
        return interaction.reply({ content: "❌ مبلغ غير صالح", ephemeral: true })
      }

      if (targetUser.id === senderId) {
        return interaction.reply({ content: "❌ لا يمكنك التحويل لنفسك", ephemeral: true })
      }

      let sender = await economyRepository.getUser(senderId)
      if (!sender) sender = await economyRepository.createUser(senderId)

      let target = await economyRepository.getUser(targetUser.id)
      if (!target) target = await economyRepository.createUser(targetUser.id)

      if ((sender.coins || 0) < amount) {
        return interaction.reply({ content: "❌ ليس لديك كوين كافي", ephemeral: true })
      }

      // ✅ الأفضل (آمن)
      await economyRepository.removeCoins(senderId, amount)
      await economyRepository.addCoins(targetUser.id, amount)

      await interaction.reply(
        `💸 تم تحويل **${amount}** كوين إلى ${targetUser.username}`
      )

    } catch (error) {

      console.error("TRANSFER_COMMAND_ERROR", error)

      await interaction.reply({
        content: "❌ حصل خطأ في التحويل",
        ephemeral: true
      })

    }
  },
}