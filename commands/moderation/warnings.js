const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js")
const warningSystem = require("../../systems/warningSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("التحذيرات")
    .setDescription("عرض تحذيرات عضو")
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
      const warnings = await warningSystem.getWarnings(interaction.guild.id, user.id)

      if (!warnings || warnings.length === 0) {
        return interaction.reply({ content: `✅ لا يوجد تحذيرات لـ ${user.username}`, ephemeral: true })
      }

      let text = `⚠️ تحذيرات ${user.username} (${warnings.length}):\n\n`

      warnings.forEach((w, i) => {
        const date = w.created_at ? new Date(w.created_at).toLocaleDateString("ar-SA") : ""
        text += `${i + 1}. ${w.reason}${date ? ` — ${date}` : ""}\n`
      })

      await interaction.reply(text)

    } catch (error) {
      console.error("WARNINGS_ERROR", error)
      if (!interaction.replied) {
        await interaction.reply({ content: "❌ حصل خطأ في عرض التحذيرات", ephemeral: true })
      }
    }
  },
}