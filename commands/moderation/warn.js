const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js")
const dataManager = require("../../utils/dataManager")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("تحذير")
    .setDescription("إعطاء تحذير لعضو")
    .addUserOption(option =>
      option.setName("العضو")
        .setDescription("العضو المراد تحذيره")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("السبب")
        .setDescription("سبب التحذير")
        .setRequired(false)
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
      const reason = interaction.options.getString("السبب") || "بدون سبب"

      let warnings = dataManager.load("warnings.json") || {}

      if (!warnings[user.id]) {
        warnings[user.id] = []
      }

      warnings[user.id].push({
        reason: reason,
        moderator: interaction.user.id,
        date: Date.now()
      })

      dataManager.save("warnings.json", warnings)

      await interaction.reply(`⚠️ تم تحذير ${user.username}\nالسبب: ${reason}`)

    } catch (error) {
      await interaction.reply({
        content: "❌ حصل خطأ في التحذير",
        ephemeral: true
      })
    }
  },
}