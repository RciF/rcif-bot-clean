const { SlashCommandBuilder } = require("discord.js")
const dataManager = require("../../utils/dataManager")

module.exports = {
data: new SlashCommandBuilder()
.setName("levels")
.setDescription("عرض ترتيب أعلى اللاعبين في المستوى"),

async execute(interaction) {

let xpData = dataManager.readData("xp.json")

const users = Object.entries(xpData)

users.sort((a, b) => {
if (b[1].level === a[1].level) {
return b[1].xp - a[1].xp
}
return b[1].level - a[1].level
})

const topUsers = users.slice(0, 10)

let leaderboard = ""

for (let i = 0; i < topUsers.length; i++) {

const userId = topUsers[i][0]
const level = topUsers[i][1].level
const xp = topUsers[i][1].xp

leaderboard += `**#${i + 1}** <@${userId}> - المستوى ${level} (XP: ${xp})\n`

}

if (leaderboard === "") {
leaderboard = "لا يوجد بيانات بعد."
}

await interaction.reply({
content: `🏆 **Leaderboard المستويات**\n\n${leaderboard}`
})

}
}