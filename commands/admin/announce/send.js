// ══════════════════════════════════════════════════════════════════
//  /إعلان إرسال — إرسال إعلان جديد بشكل Embed احترافي
//  المسار: commands/admin/announce/send.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder, PermissionFlagsBits } = require("discord.js")
const { COLORS, isValidUrl } = require("./_shared")

module.exports = async function handleSend(interaction) {
  await interaction.deferReply({ ephemeral: true })

  const channel  = interaction.options.getChannel("القناة")
  const title    = interaction.options.getString("العنوان")
  const content  = interaction.options.getString("المحتوى")
  const colorKey = interaction.options.getString("اللون") || "blue"
  const imageUrl = interaction.options.getString("الصورة")
  const thumbUrl = interaction.options.getString("صورة_مصغرة")
  const footer   = interaction.options.getString("التذييل")
  const mention  = interaction.options.getString("منشن") || "none"

  // ══════════════════════════════════════
  //  تحقق من صلاحيات البوت في القناة المستهدفة
  // ══════════════════════════════════════
  const botPerms = channel.permissionsFor(interaction.guild.members.me)
  if (!botPerms?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
    return interaction.editReply({
      content: `❌ البوت ما عنده صلاحيات إرسال الرسائل أو embeds في ${channel}`
    })
  }

  // ══════════════════════════════════════
  //  تحقق من الروابط
  // ══════════════════════════════════════
  if (imageUrl && !isValidUrl(imageUrl)) {
    return interaction.editReply({ content: "❌ رابط الصورة غير صالح" })
  }
  if (thumbUrl && !isValidUrl(thumbUrl)) {
    return interaction.editReply({ content: "❌ رابط الصورة المصغرة غير صالح" })
  }

  // ══════════════════════════════════════
  //  تحويل \n النصي لسطر جديد حقيقي
  // ══════════════════════════════════════
  const parsedContent = content.replace(/\\n/g, "\n")

  // ══════════════════════════════════════
  //  بناء الـ embed
  // ══════════════════════════════════════
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(parsedContent)
    .setColor(COLORS[colorKey] || COLORS.blue)
    .setTimestamp()

  if (imageUrl) embed.setImage(imageUrl)
  if (thumbUrl) embed.setThumbnail(thumbUrl)

  if (footer) {
    embed.setFooter({
      text: footer,
      iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
    })
  } else {
    embed.setFooter({
      text: interaction.guild.name,
      iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
    })
  }

  // ══════════════════════════════════════
  //  بناء الـ content (المنشن)
  // ══════════════════════════════════════
  let messageContent = null
  let allowedMentions = { parse: [] }

  if (mention === "everyone") {
    messageContent = "@everyone"
    allowedMentions = { parse: ["everyone"] }
  } else if (mention === "here") {
    messageContent = "@here"
    allowedMentions = { parse: ["everyone"] }
  }

  // ══════════════════════════════════════
  //  الإرسال
  // ══════════════════════════════════════
  const sentMsg = await channel.send({
    content: messageContent,
    embeds: [embed],
    allowedMentions
  })

  // ══════════════════════════════════════
  //  رسالة تأكيد للأدمن
  // ══════════════════════════════════════
  const confirmEmbed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle("✅ تم إرسال الإعلان")
    .addFields(
      { name: "📢 القناة",       value: `${channel}`,              inline: true },
      { name: "🎨 اللون",        value: colorKey,                  inline: true },
      { name: "🔔 المنشن",       value: mention,                   inline: true },
      { name: "🆔 معرف الرسالة", value: `\`${sentMsg.id}\``,       inline: false },
      { name: "🔗 الرابط",       value: `[اضغط هنا](${sentMsg.url})` }
    )
    .setFooter({ text: "احفظ معرف الرسالة لتعديلها لاحقاً بـ /إعلان تعديل" })
    .setTimestamp()

  return interaction.editReply({ embeds: [confirmEmbed] })
}