const { SlashCommandBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("test")
    .setDescription("bot test command"),

  async execute(interaction) {

    await interaction.reply("✅ Bot system working")

  },
}