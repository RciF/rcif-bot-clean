const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js")
const dataManager = require("../../utils/dataManager")

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
      let warnings = dataManager.load("warnings.json") || {}

      warnings[user.id] = []

      dataManager.save("warnings.json", warnings)

      await interaction.reply(`🧹 تم مسح تحذيرات ${user.username}`)

    } catch (error) {
      await interaction.reply({
        content: "❌ حصل خطأ في مسح التحذيرات",
        ephemeral: true
      })
    }
  },
}