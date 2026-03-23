const { SlashCommandBuilder } = require("discord.js")
const economySystem = require("../../systems/economySystem")
const dataManager = require("../../utils/dataManager")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("رصيدي")
    .setDescription("عرض رصيدك"),

  async execute(interaction) {

    if (!economySystem.ensureEconomyEnabled(interaction)) return

    const userId = interaction.user.id

    let users = dataManager.load("users.json")

    if (!users[userId]) {
      users[userId] = { coins: 0 }
    }

    const coins = users[userId].coins || 0

    await interaction.reply(`💰 رصيدك: ${coins} كوين`)

  },
}
