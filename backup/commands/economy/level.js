const { SlashCommandBuilder } = require("discord.js")
const dataManager = require("../../utils/dataManager")

module.exports = {
data: new SlashCommandBuilder()
.setName("level")
.setDescription("عرض مستوى المستخدم و XP"),

async execute(interaction) {

const userId = interaction.user.id

let xpData = dataManager.readData("xp.json")

if (!xpData[userId]) {
xpData[userId] = {
xp: 0,
level: 1
}
dataManager.writeData("xp.json", xpData)
}

const userXP = xpData[userId].xp
const userLevel = xpData[userId].level
const requiredXP = userLevel * 100

const users = Object.entries(xpData)

users.sort((a, b) => {
if (b[1].level === a[1].level) {
return b[1].xp - a[1].xp
}
return b[1].level - a[1].level
})

const rank = users.findIndex(user => user[0] === userId) + 1

const progress = Math.floor((userXP / requiredXP) * 20)

let bar = ""

for (let i = 0; i < 20; i++) {
if (i < progress) {
bar += "🟩"
} else {
bar += "⬜"
}
}

await interaction.reply({
content:
`📊 مستوى ${interaction.user.username}

🏆 الترتيب: **#${rank}**

المستوى: **${userLevel}**
XP: **${userXP}/${requiredXP}**

${bar}`
})

}
}