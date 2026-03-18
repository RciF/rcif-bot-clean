const { SlashCommandBuilder } = require("discord.js")
const dataManager = require("../../utils/dataManager")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("تحويل")
    .setDescription("تحويل كوين لشخص")
    .addUserOption(option =>
      option.setName("المستخدم")
      .setDescription("الشخص الذي تريد التحويل له")
      .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName("المبلغ")
      .setDescription("عدد الكوين")
      .setRequired(true)
    ),

  async execute(interaction) {

    const users = dataManager.load("users.json")

    const sender = interaction.user.id
    const target = interaction.options.getUser("المستخدم")
    const amount = interaction.options.getInteger("المبلغ")

    if (!users[sender]) users[sender] = { coins: 0 }
    if (!users[target.id]) users[target.id] = { coins: 0 }

    if (users[sender].coins < amount) {
      return interaction.reply("❌ ليس لديك كوين كافي")
    }

    users[sender].coins -= amount
    users[target.id].coins += amount

    dataManager.save("users.json", users)

    await interaction.reply(`💸 تم تحويل ${amount} كوين إلى ${target.username}`)
  },
}