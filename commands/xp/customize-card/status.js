// ══════════════════════════════════════════════════════════════════
//  /تخصيص_بطاقة حالة — عرض التخصيصات الحالية وحالة الاشتراك
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const cardCustomizationSystem = require("../../../systems/cardCustomizationSystem")
const { COLORS } = require("./_shared")

module.exports = async function handleStatus(interaction) {
  await interaction.deferReply({ flags: 64 })

  const userId  = interaction.user.id
  const premium = await cardCustomizationSystem.isPremium(userId)
  const custom  = await cardCustomizationSystem.getCustomization(userId)

  const embed = new EmbedBuilder()
    .setColor(premium ? COLORS.premium : 0x64748b)
    .setTitle("🎨 حالة تخصيص البطاقة")
    .addFields(
      { name: "👑 حالة الاشتراك",    value: premium ? "✅ **مفعّل**" : "❌ **غير مفعّل**", inline: true  },
      { name: "🎨 الثيم الحالي",     value: custom?.theme_color || "amber (افتراضي)",       inline: true  },
      { name: "🖼️ الخلفية",          value: custom?.background_url ? "✅ مخصصة" : "❌ افتراضية", inline: true },
      { name: "🧑 الصورة الشخصية",   value: custom?.avatar_url ? "✅ مخصصة" : "❌ من Discord", inline: true }
    )
    .setTimestamp()

  if (!premium) {
    embed.addFields({
      name: "💳 كيف أشترك؟",
      value: "تواصل مع إدارة البوت للاشتراك\n**$2.99/شهر** أو **$18/سنة**",
      inline: false
    })
  }

  return interaction.editReply({ embeds: [embed] })
}
