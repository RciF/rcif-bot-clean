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
    try {
      if (!interaction.guild) {
        return interaction.reply({
          content: "❌ هذا الأمر داخل السيرفر فقط",
          ephemeral: true
        })
      }

      const user = interaction.options.getUser("العضو")
      const member = await interaction.guild.members.fetch(user.id).catch(() => null)

      if (!member) {
        return interaction.reply({
          content: "❌ لم يتم العثور على العضو",
          ephemeral: true
        })
      }

      const joined = member.joinedAt?.toLocaleDateString() || "غير معروف"

      await interaction.reply(
        `👤 المستخدم: ${user.username}
🆔 ID: ${user.id}
📅 دخل السيرفر: ${joined}`
      )

    } catch (error) {
      await interaction.reply({
        content: "❌ حصل خطأ في معلومات العضو",
        ephemeral: true
      })
    }
  },
}