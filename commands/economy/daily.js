const { SlashCommandBuilder } = require("discord.js")
const dataManager = require("../../utils/dataManager")
const cooldownSystem = require("../../systems/commandCooldownSystem")

module.exports = {

data: new SlashCommandBuilder()
.setName("daily")
.setDescription("الحصول على المكافأة اليومية"),

async execute(interaction) {

const userId = interaction.user.id

const remaining = cooldownSystem.checkCooldown(userId, "daily", 86400)

if (remaining > 0) {

return interaction.reply({
content: `⏳ يمكنك استخدام الأمر بعد **${remaining} ثانية**`,
ephemeral: true
})

}

let users = dataManager.load("users.json")

if (!users[userId]) {
users[userId] = {
coins: 0
}
}

const reward = 100

users[userId].coins += reward

dataManager.save("users.json", users)

await interaction.reply({
content: `💰 حصلت على **${reward}** كوين كمكافأة يومية!`
})

}

}