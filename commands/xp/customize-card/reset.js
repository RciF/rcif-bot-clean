// ══════════════════════════════════════════════════════════════════
//  /تخصيص_بطاقة إعادة_تعيين — إعادة البطاقة للشكل الافتراضي
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const cardCustomizationSystem = require("../../../systems/cardCustomizationSystem")
const { COLORS, requirePremium } = require("./_shared")

module.exports = async function handleReset(interaction) {
  const isPremium = await requirePremium(interaction)
  if (!isPremium) return

  await interaction.deferReply({ flags: 64 })

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
