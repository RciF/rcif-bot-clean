const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const shopSystem = require("../../systems/shopSystem")

module.exports = {

data: new SlashCommandBuilder()
.setName("shop")
.setDescription("عرض متجر السيرفر"),

async execute(interaction) {

const items = shopSystem.getShopItems()

let description = ""

for (const item of items) {

description += 
`**${item.name}**
السعر: ${item.price} كوين
${item.description}

`

}

const embed = new EmbedBuilder()
.setTitle("🛒 متجر السيرفر")
.setDescription(description)
.setColor(0x00aeff)

await interaction.reply({
embeds: [embed]
})

}

}