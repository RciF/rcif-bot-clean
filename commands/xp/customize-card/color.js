// ══════════════════════════════════════════════════════════════════
//  /تخصيص_بطاقة لون — تغيير لون ثيم البطاقة
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const cardCustomizationSystem = require("../../../systems/cardCustomizationSystem")
const { COLORS, requirePremium } = require("./_shared")

module.exports = async function handleColor(interaction) {
  const isPremium = await requirePremium(interaction)
  if (!isPremium) return

  await interaction.deferReply({ flags: 64 })

  const theme = interaction.options.getString("الثيم")
  const saved = await cardCustomizationSystem.saveCustomization(interaction.user.id, { theme_color: theme })

  if (!saved) {
    return interaction.editReply({ content: "❌ فشل الحفظ، حاول مرة ثانية." })
  }

  const themeData = cardCustomizationSystem.getTheme(theme)

  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(parseInt(themeData.accent.replace("#", ""), 16))
        .setTitle("✅ تم تغيير الثيم")
        .setDescription(`الثيم الجديد: **${theme}**\nاستخدم \`/تخصيص_بطاقة معاينة\` لترى النتيجة`)
        .setTimestamp()
    ]
  })
}
