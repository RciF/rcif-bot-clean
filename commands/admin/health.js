const { SlashCommandBuilder } = require("discord.js")
const healthSystem = require("../../systems/healthSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("health")
    .setDescription("عرض حالة البوت"),

  async execute(interaction) {

    const health = healthSystem.getHealth()

    await interaction.reply(
      `🟢 Status: ${health.status}\n⏱ Uptime: ${Math.floor(health.uptime)}s\n💾 Memory: ${health.memory}`
    )

  },
}