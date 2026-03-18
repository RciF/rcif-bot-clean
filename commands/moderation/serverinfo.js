const { SlashCommandBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("السيرفر")
    .setDescription("عرض معلومات السيرفر"),

  async execute(interaction) {

    const guild = interaction.guild

    const name = guild.name
    const members = guild.memberCount
    const created = guild.createdAt.toLocaleDateString()

    await interaction.reply(
      `🏠 اسم السيرفر: ${name}
👥 عدد الأعضاء: ${members}
📅 تاريخ الإنشاء: ${created}`
    )

  },
}