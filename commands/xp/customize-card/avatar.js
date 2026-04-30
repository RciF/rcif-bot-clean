const { EmbedBuilder } = require("discord.js")
const { COLORS, premiumEmbed, cardCustomizationSystem } = require("./_shared")

module.exports = async function handleAvatar(interaction) {
  await interaction.deferReply({ flags: 64 })

  const isPremium = await cardCustomizationSystem.isPremium(interaction.user.id)
  if (!isPremium) return interaction.editReply({ embeds: [premiumEmbed()] })

  const url = interaction.options.getString("الرابط")
  if (!cardCustomizationSystem.isValidImageUrl(url)) {
    return interaction.editReply({ content: "❌ الرابط غير صحيح — يجب أن ينتهي بـ jpg/png/gif/webp" })
  }

  const saved = await cardCustomizationSystem.saveCustomization(interaction.user.id, { avatar_url: url })
  if (!saved) return interaction.editReply({ content: "❌ فشل الحفظ، حاول مرة ثانية." })

  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle("✅ تم تغيير الصورة الشخصية")
        .setDescription("استخدم `/تخصيص_بطاقة معاينة` لترى النتيجة")
        .setThumbnail(url)
        .setTimestamp()
    ]
  })
}