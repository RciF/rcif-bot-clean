// ══════════════════════════════════════════════════════════════════
//  /إعلان حذف — حذف إعلان أرسله البوت
//  المسار: commands/admin/announce/delete.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const { COLORS } = require("./_shared")

module.exports = async function handleDelete(interaction) {
  await interaction.deferReply({ ephemeral: true })

  const channel   = interaction.options.getChannel("القناة")
  const messageId = interaction.options.getString("معرف_الرسالة").trim()

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
      content: "❌ الرسالة هذي مو من البوت، ما أقدر أحذفها"
    })
  }

  // ══════════════════════════════════════
  //  الحذف
  // ══════════════════════════════════════
  try {
    await targetMsg.delete()
  } catch (err) {
    return interaction.editReply({
      content: `❌ فشل الحذف: ${err.message}`
    })
  }

  // ══════════════════════════════════════
  //  رسالة التأكيد
  // ══════════════════════════════════════
  const confirmEmbed = new EmbedBuilder()
    .setColor(COLORS.red)
    .setTitle("🗑️ تم حذف الإعلان")
    .addFields(
      { name: "📢 القناة",          value: `${channel}`,       inline: true },
      { name: "🆔 معرف الرسالة",    value: `\`${messageId}\``, inline: true }
    )
    .setTimestamp()

  return interaction.editReply({ embeds: [confirmEmbed] })
}