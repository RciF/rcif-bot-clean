const { SlashCommandBuilder } = require("discord.js")
const shopSystem = require("../../systems/shopSystem")

module.exports = {

data: new SlashCommandBuilder()
.setName("buy")
.setDescription("شراء عنصر من المتجر")
.addStringOption(option =>
option
.setName("item")
.setDescription("اسم العنصر")
.setRequired(true)
),

async execute(interaction) {

const userId = interaction.user.id
const itemId = interaction.options.getString("item")

const result = shopSystem.buyItem(userId, itemId)

if (!result.success) {

return interaction.reply({
content: `❌ ${result.message}`,
ephemeral: true
})

}

await interaction.reply({
content: `✅ اشتريت **${result.item.name}** بنجاح!`
})

}

}