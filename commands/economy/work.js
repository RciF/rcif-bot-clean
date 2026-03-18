const { SlashCommandBuilder } = require("discord.js")
const dataManager = require("../../utils/dataManager")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("عمل")
    .setDescription("العمل لكسب كوين"),

  async execute(interaction) {

    const users = dataManager.load("users.json")
    const id = interaction.user.id

    if (!users[id]) {
      users[id] = { coins: 0 }
    }

    const reward = Math.floor(Math.random() * 50) + 10

    users[id].coins += reward

    dataManager.save("users.json", users)

    await interaction.reply(`💼 عملت وكسبت ${reward} كوين`)
  },
}