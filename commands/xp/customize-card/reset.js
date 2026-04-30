const { EmbedBuilder } = require("discord.js")
const { COLORS, premiumEmbed, cardCustomizationSystem } = require("./_shared")

module.exports = async function handleReset(interaction) {
  await interaction.deferReply({ flags: 64 })

  const isPremium = await cardCustomizationSystem.isPremium(interaction.user.id)
  if (!isPremium) return interaction.editReply({ embeds: [premiumEmbed()] })

  await cardCustomizationSystem.resetCustomization(interaction.user.id)

  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.danger)
        .setTitle("🔄 تم إعادة التعيين")
        .setDescription("تم مسح كل تخصيصاتك، البطاقة رجعت للشكل الافتراضي")
        .setTimestamp()
    ]
  })
}