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

    const member = interaction.options.getUser("العضو")
    const warnings = dataManager.load("warnings.json")

    if (!warnings[member.id] || warnings[member.id].length === 0) {
      return interaction.reply("لا يوجد تحذيرات لهذا العضو")
    }

    let text = `⚠️ تحذيرات ${member.username}:\n\n`

    warnings[member.id].forEach((w, i) => {
      text += `${i + 1}. ${w.reason}\n`
    })

    await interaction.reply(text)

  },
}