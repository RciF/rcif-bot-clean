const { SlashCommandBuilder } = require("discord.js")
const statusSystem = require("../../systems/statusSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("عرض حالة البوت"),

  async execute(interaction) {

    const status = statusSystem.getStatus()

    await interaction.reply(
      `🤖 Bot: ${status.bot}\n🕒 Time: ${status.time}`
    )

  },
}