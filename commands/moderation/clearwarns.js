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

    const member = interaction.options.getUser("العضو")
    const warnings = dataManager.load("warnings.json")

    warnings[member.id] = []

    dataManager.save("warnings.json", warnings)

    await interaction.reply(`🧹 تم مسح تحذيرات ${member.username}`)

  },
}