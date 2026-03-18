const { SlashCommandBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("معلومات")
    .setDescription("عرض معلومات عضو")
    .addUserOption(option =>
      option.setName("العضو")
        .setDescription("اختر العضو")
        .setRequired(true)
    ),

  async execute(interaction) {

    const user = interaction.options.getUser("العضو")
    const member = await interaction.guild.members.fetch(user.id)

    const joined = member.joinedAt.toLocaleDateString()

    await interaction.reply(
      `👤 المستخدم: ${user.username}
🆔 ID: ${user.id}
📅 دخل السيرفر: ${joined}`
    )

  },
}