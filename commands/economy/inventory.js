const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const inventorySystem = require("../../systems/inventorySystem")
const shopSystem = require("../../systems/shopSystem")

module.exports = {

data: new SlashCommandBuilder()
.setName("inventory")
.setDescription("عرض العناصر التي تملكها"),

async execute(interaction) {

const userId = interaction.user.id

const items = inventorySystem.getInventory(userId)

if (items.length === 0) {

return interaction.reply({
content: "📦 حقيبتك فارغة.",
ephemeral: true
})

}

const shopItems = shopSystem.getShopItems()

let description = ""

for (const itemId of items) {

const item = shopItems.find(i => i.id === itemId)

if (item) {
description += `• ${item.name}\n`
}

}

const embed = new EmbedBuilder()
.setTitle("🎒 حقيبتك")
.setDescription(description)
.setColor(0x00aeff)

await interaction.reply({
embeds: [embed]
})

}

}