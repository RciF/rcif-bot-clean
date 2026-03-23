const { SlashCommandBuilder } = require("discord.js")
const dataManager = require("../../utils/dataManager")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("الترتيب")
    .setDescription("عرض أغنى اللاعبين"),

  async execute(interaction) {

    const users = dataManager.load("users.json")

    const sorted = Object.entries(users)
      .sort((a, b) => b[1].coins - a[1].coins)
      .slice(0, 10)

    let text = "🏆 أغنى اللاعبين:\n\n"

    let i = 1
    for (const [id, data] of sorted) {

      const user = await interaction.client.users.fetch(id)

      text += `${i}. ${user.username} — ${data.coins} كوين\n`
      i++
    }

    if (sorted.length === 0) {
      text = "لا يوجد بيانات بعد"
    }

    await interaction.reply(text)

  },
}