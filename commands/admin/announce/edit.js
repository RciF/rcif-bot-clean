// ══════════════════════════════════════════════════════════════════
//  /إعلان تعديل — تعديل إعلان أرسله البوت سابقاً
//  المسار: commands/admin/announce/edit.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const { COLORS, isValidUrl } = require("./_shared")

module.exports = async function handleEdit(interaction) {
  await interaction.deferReply({ ephemeral: true })

  const channel    = interaction.options.getChannel("القناة")
  const messageId  = interaction.options.getString("معرف_الرسالة").trim()
  const newTitle   = interaction.options.getString("العنوان")
  const newContent = interaction.options.getString("المحتوى")
  const newColor   = interaction.options.getString("اللون")
  const newImage   = interaction.options.getString("الصورة")
  const newThumb   = interaction.options.getString("صورة_مصغرة")
  const newFooter  = interaction.options.getString("التذييل")

  // ══════════════════════════════════════
  //  تحقق إن في خيار واحد على الأقل
  // ══════════════════════════════════════
  if (!newTitle && !newContent && !newColor && !newImage && !newThumb && !newFooter) {
    return interaction.editReply({
      content: "❌ حدد خيار واحد على الأقل للتعديل"
    })
  }

  // ══════════════════════════════════════
  //  جلب الرسالة
  // ══════════════════════════════════════
  let targetMsg
  try {
    targetMsg = await channel.messages.fetch(messageId)
  } catch {
    return interaction.editReply({
      content: `❌ ما لقيت رسالة بهذا المعرف في ${channel}`
    })
  }

  // ══════════════════════════════════════
  //  تحقق إن الرسالة من البوت
  // ══════════════════════════════════════
  if (targetMsg.author.id !== interaction.client.user.id) {
    return interaction.editReply({
      content: "❌ الرسالة هذي مو من البوت، ما أقدر أعدلها"
    })
  }

  // ══════════════════════════════════════
  //  تحقق إن فيها embed
  // ══════════════════════════════════════
  if (!targetMsg.embeds || targetMsg.embeds.length === 0) {
    return interaction.editReply({
      content: "❌ الرسالة هذي ما فيها embed للتعديل"
    })
  }

  // ══════════════════════════════════════
  //  تحقق من الروابط الجديدة
  // ══════════════════════════════════════
  if (newImage && newImage !== "إزالة" && !isValidUrl(newImage)) {
    return interaction.editReply({ content: "❌ رابط الصورة الجديدة غير صالح" })
  }
  if (newThumb && newThumb !== "إزالة" && !isValidUrl(newThumb)) {
    return interaction.editReply({ content: "❌ رابط الصورة المصغرة الجديدة غير صالح" })
  }

  // ══════════════════════════════════════
  //  بناء embed جديد من الـ embed القديم
  // ══════════════════════════════════════
  const oldEmbed = targetMsg.embeds[0]
  const newEmbed = EmbedBuilder.from(oldEmbed)

  if (newTitle)   newEmbed.setTitle(newTitle)
  if (newContent) newEmbed.setDescription(newContent.replace(/\\n/g, "\n"))
  if (newColor)   newEmbed.setColor(COLORS[newColor] || COLORS.blue)

  if (newImage) {
    if (newImage === "إزالة") newEmbed.setImage(null)
    else newEmbed.setImage(newImage)
  }

  if (newThumb) {
    if (newThumb === "إزالة") newEmbed.setThumbnail(null)
    else newEmbed.setThumbnail(newThumb)
  }

  if (newFooter) {
    if (newFooter === "إزالة") {
      newEmbed.setFooter({
        text: interaction.guild.name,
        iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
      })
    } else {
      newEmbed.setFooter({
        text: newFooter,
        iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
      })
    }
  }

  newEmbed.setTimestamp()

  // ══════════════════════════════════════
  //  التعديل
  // ══════════════════════════════════════
  try {
    await targetMsg.edit({ embeds: [newEmbed] })
  } catch (err) {
    return interaction.editReply({
      content: `❌ فشل التعديل: ${err.message}`
    })
  }

  // ══════════════════════════════════════
  //  رسالة التأكيد
  // ══════════════════════════════════════
  const changedFields = []
  if (newTitle)   changedFields.push("العنوان")
  if (newContent) changedFields.push("المحتوى")
  if (newColor)   changedFields.push("اللون")
  if (newImage)   changedFields.push(newImage === "إزالة" ? "الصورة (حُذفت)" : "الصورة")
  if (newThumb)   changedFields.push(newThumb === "إزالة" ? "الصورة المصغرة (حُذفت)" : "الصورة المصغرة")
  if (newFooter)  changedFields.push(newFooter === "إزالة" ? "التذييل (حُذف)" : "التذييل")

  const confirmEmbed = new EmbedBuilder()
    .setColor(COLORS.yellow)
    .setTitle("✏️ تم تعديل الإعلان")
    .addFields(
      { name: "📢 القناة",          value: `${channel}`,                 inline: true },
      { name: "🆔 معرف الرسالة",    value: `\`${targetMsg.id}\``,        inline: true },
      { name: "📝 الحقول المعدّلة", value: changedFields.join("، ") },
      { name: "🔗 الرابط",          value: `[اضغط هنا](${targetMsg.url})` }
    )
    .setTimestamp()

  return interaction.editReply({ embeds: [confirmEmbed] })
}