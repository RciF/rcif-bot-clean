const { EmbedBuilder } = require("discord.js")
const { COLORS, premiumEmbed, cardCustomizationSystem } = require("./_shared")

module.exports = async function handleColor(interaction) {
  await interaction.deferReply({ flags: 64 })

  const isPremium = await cardCustomizationSystem.isPremium(interaction.user.id)
  if (!isPremium) return interaction.editReply({ embeds: [premiumEmbed()] })

  const theme = interaction.options.getString("الثيم")
  const saved = await cardCustomizationSystem.saveCustomization(interaction.user.id, { theme_color: theme })
  if (!saved) return interaction.editReply({ content: "❌ فشل الحفظ، حاول مرة ثانية." })

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