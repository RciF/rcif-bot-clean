const { SlashCommandBuilder } = require("discord.js")
const statusSystem = require("../../systems/statusSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("عرض حالة البوت"),

  async execute(interaction, client) {
    try {

      if (!statusSystem || typeof statusSystem.getStatus !== "function") {
        return interaction.reply("❌ نظام status غير متوفر")
      }

      const status = statusSystem.getStatus()

      const bot = status.bot || "unknown"
      const time = status.time || new Date().toLocaleString()

      await interaction.reply(
        `🤖 Bot: ${bot}\n🕒 Time: ${time}`
      )

    } catch (error) {
      console.error("STATUS_COMMAND_ERROR", error)
      await interaction.reply("❌ حصل خطأ في عرض الحالة")
    }
  },
}