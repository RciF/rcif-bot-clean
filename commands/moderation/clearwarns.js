const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js")
const warningSystem = require("../../systems/warningSystem")

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
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const user = interaction.options.getUser("العضو")

      // ✅ NEW: نشوف كم تحذير قبل المسح
      const warnings = await warningSystem.getWarnings(interaction.guild.id, user.id)
      const count = warnings?.length || 0

      if (count === 0) {
        return interaction.reply({ content: `✅ ${user.username} ما عنده تحذيرات أصلاً`, ephemeral: true })
      }

      await warningSystem.clearWarnings(interaction.guild.id, user.id)

      await interaction.reply(`🧹 تم مسح **${count}** تحذير لـ ${user.username}`)

    } catch (error) {
      console.error("CLEARWARNS_ERROR", error)
      if (!interaction.replied) {
        await interaction.reply({ content: "❌ حصل خطأ في مسح التحذيرات", ephemeral: true })
      }
    }
  },
}