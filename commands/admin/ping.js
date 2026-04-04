const { SlashCommandBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("قياس سرعة البوت"),

  async execute(interaction) {
    const gatewayPing = interaction.client.ws.ping
    const latency = Date.now() - interaction.createdTimestamp

    await interaction.reply(`🏓 Pong!\n📡 Gateway: ${gatewayPing}ms\n⚡ Latency: ${latency}ms`)
  },
}