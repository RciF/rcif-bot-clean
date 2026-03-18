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

    const member = interaction.options.getUser("العضو")
    const reason = interaction.options.getString("السبب") || "بدون سبب"

    const warnings = dataManager.load("warnings.json")

    if (!warnings[member.id]) {
      warnings[member.id] = []
    }

    warnings[member.id].push({
      reason: reason,
      moderator: interaction.user.id,
      date: Date.now()
    })

    dataManager.save("warnings.json", warnings)

    await interaction.reply(`⚠️ تم تحذير ${member.username}\nالسبب: ${reason}`)
  },
}