const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js")
const warningRepository = require("../../repositories/warningRepository")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("مسح_التحذيرات")
    .setDescription("مسح تحذيرات عضو")
    .addUserOption(option =>
      option.setName("العضو")
        .setDescription("العضو")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    try {

      if (!interaction.guild) {
        return interaction.reply({
          content: "❌ هذا الأمر داخل السيرفر فقط",
          ephemeral: true
        })
      }

      const user = interaction.options.getUser("العضو")

      // ✅ حذف من الداتابيس
      await warningRepository.clearWarnings(
        interaction.guild.id,
        user.id
      )

      await interaction.reply(`🧹 تم مسح تحذيرات ${user.username}`)

    } catch (error) {

      console.error("CLEAR_WARNINGS_ERROR", error)

      await interaction.reply({
        content: "❌ حصل خطأ في مسح التحذيرات",
        ephemeral: true
      })

    }
  },
}