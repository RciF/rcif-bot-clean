const { SlashCommandBuilder } = require("discord.js")
const { requireOwner } = require("../../systems/commandGuardSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("owner")
    .setDescription("اختبار صلاحية مالك البوت"),

  async execute(interaction) {

    if (!requireOwner(interaction)) return

    await interaction.reply("✅ تم التحقق من صلاحية مالك البوت")

  }
}