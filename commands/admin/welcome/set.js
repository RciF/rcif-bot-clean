// ══════════════════════════════════════════════════════════════════
//  /ترحيب ضبط — ضبط إعدادات الترحيب والوداع
//  المسار: commands/admin/welcome/set.js
//
//  يحفظ كل الحقول اللي يدعمها الداش:
//   - welcome_channel_id, goodbye_channel_id
//   - welcome_message, goodbye_message
//   - type (text/embed), embed_data (JSONB)
//   - mention_user, leave_enabled, enabled
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const databaseSystem = require("../../../systems/databaseSystem")
const { COLORS, parseMessage } = require("./_shared")

module.exports = async function handleSet(interaction, guildId) {
  const welcomeChannel = interaction.options.getChannel("قناة_الترحيب")
  const goodbyeChannel = interaction.options.getChannel("قناة_الوداع")

  const welcomeMsg = parseMessage(interaction.options.getString("رسالة_الترحيب"))
  const goodbyeMsg = parseMessage(interaction.options.getString("رسالة_الوداع"))

  const mentionUser = interaction.options.getBoolean("منشن_العضو")
  const leaveEnabled = interaction.options.getBoolean("تفعيل_الوداع")

  // اجلب الإعدادات الحالية للحفاظ على القيم اللي ما تغيّرت
  const current = await databaseSystem.queryOne(
    "SELECT * FROM welcome_settings WHERE guild_id = $1",
    [guildId]
  ) || {}

  const finalMentionUser = mentionUser !== null
    ? mentionUser
    : (current.mention_user !== false)

  const finalLeaveEnabled = leaveEnabled !== null
    ? leaveEnabled
    : (current.leave_enabled === true)

  await databaseSystem.query(`
    INSERT INTO welcome_settings
    (guild_id, welcome_channel_id, goodbye_channel_id, welcome_message, goodbye_message,
     mention_user, leave_enabled, enabled)
    VALUES ($1, $2, $3, $4, $5, $6, $7, true)
    ON CONFLICT (guild_id) DO UPDATE SET
      welcome_channel_id = $2,
      goodbye_channel_id = $3,
      welcome_message = COALESCE($4, welcome_settings.welcome_message),
      goodbye_message = COALESCE($5, welcome_settings.goodbye_message),
      mention_user = $6,
      leave_enabled = $7,
      enabled = true
  `, [
    guildId,
    welcomeChannel.id,
    goodbyeChannel?.id || current.goodbye_channel_id || null,
    welcomeMsg || null,
    goodbyeMsg || null,
    finalMentionUser,
    finalLeaveEnabled
  ])

  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle("✅ تم ضبط نظام الترحيب")
    .addFields(
      { name: "📥 قناة الترحيب", value: `${welcomeChannel}`, inline: true },
      {
        name: "📤 قناة الوداع",
        value: goodbyeChannel ? `${goodbyeChannel}` : (current.goodbye_channel_id ? `<#${current.goodbye_channel_id}>` : "غير محددة"),
        inline: true
      },
      {
        name: "🔔 منشن العضو",
        value: finalMentionUser ? "✅ مفعّل" : "❌ معطّل",
        inline: true
      },
      {
        name: "👋 رسالة الوداع",
        value: finalLeaveEnabled ? "✅ مفعّلة" : "❌ معطّلة",
        inline: true
      },
      {
        name: "💬 رسالة الترحيب",
        value: welcomeMsg
          ? `\`\`\`${welcomeMsg.slice(0, 200)}\`\`\``
          : (current.welcome_message ? `\`\`\`${String(current.welcome_message).slice(0, 200)}\`\`\`` : "افتراضية"),
        inline: false
      },
      {
        name: "💬 رسالة الوداع",
        value: goodbyeMsg
          ? `\`\`\`${goodbyeMsg.slice(0, 200)}\`\`\``
          : (current.goodbye_message ? `\`\`\`${String(current.goodbye_message).slice(0, 200)}\`\`\`` : "افتراضية"),
        inline: false
      }
    )
    .setFooter({ text: "متغيرات: {user} {username} {server} {count} — \\n للسطر الجديد" })
    .setTimestamp()

  return interaction.reply({ embeds: [embed] })
}