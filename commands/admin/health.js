const { SlashCommandBuilder } = require("discord.js")
const healthSystem = require("../../systems/healthSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("health")
    .setDescription("عرض حالة البوت"),

  async execute(interaction) {
    try {
      const health = healthSystem.getHealth?.() || {}

      const status = health.status || "unknown"
      const uptime = health.uptime ? Math.floor(health.uptime) : 0
      const memory = health.memory || "N/A"

      await interaction.reply(
        `🟢 Status: ${status}\n⏱ Uptime: ${uptime}s\n💾 Memory: ${memory}`
      )
    } catch (error) {
      await interaction.reply("❌ حصل خطأ في عرض حالة البوت")
    }
  },
}