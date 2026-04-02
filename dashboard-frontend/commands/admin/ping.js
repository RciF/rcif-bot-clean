const { SlashCommandBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("قياس سرعة البوت"),

  async execute(interaction, client) {

    const latency = Date.now() - interaction.createdTimestamp

    await interaction.reply(`🏓 Pong!\nLatency: ${latency}ms`)

  },
}