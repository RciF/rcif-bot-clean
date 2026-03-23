const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js")
const dataManager = require("../../utils/dataManager")

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
        return interaction.reply({
          content: "❌ هذا الأمر داخل السيرفر فقط",
          ephemeral: true
        })
      }

      const user = interaction.options.getUser("العضو")
      const warnings = dataManager.load("warnings.json") || {}

      if (!warnings[user.id] || warnings[user.id].length === 0) {
        return interaction.reply({
          content: "لا يوجد تحذيرات لهذا العضو",
          ephemeral: true
        })
      }

      let text = `⚠️ تحذيرات ${user.username}:\n\n`

      warnings[user.id].forEach((w, i) => {
        text += `${i + 1}. ${w.reason}\n`
      })

      await interaction.reply(text)

    } catch (error) {
      await interaction.reply({
        content: "❌ حصل خطأ في عرض التحذيرات",
        ephemeral: true
      })
    }
  },
}