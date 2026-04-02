const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js")
const warningRepository = require("../../repositories/warningRepository")

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

      // ✅ حفظ في الداتابيس بدل JSON
      await warningRepository.addWarning(
        interaction.guild.id,
        user.id,
        interaction.user.id,
        reason
      )

      await interaction.reply(
        `⚠️ تم تحذير ${user.username}\nالسبب: ${reason}`
      )

    } catch (error) {

      console.error("WARN_COMMAND_ERROR", error)

      await interaction.reply({
        content: "❌ حصل خطأ في التحذير",
        ephemeral: true
      })

    }
  },
}