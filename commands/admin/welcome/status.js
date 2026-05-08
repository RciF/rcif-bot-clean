// ══════════════════════════════════════════════════════════════════
//  /ترحيب حالة — عرض الإعدادات الحالية
//  المسار: commands/admin/welcome/status.js
//
//  يعرض كل الحقول الجديدة:
//   - type (text/embed)
//   - embed_data (لو موجود)
//   - mention_user, leave_enabled
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const databaseSystem = require("../../../systems/databaseSystem")
const { COLORS } = require("./_shared")

function parseEmbedData(raw) {
  if (!raw) return null
  if (typeof raw === "object") return raw
  if (typeof raw === "string") {
    try { return JSON.parse(raw) } catch { return null }
  }
  return null
}

module.exports = async function handleStatus(interaction, guildId) {
  const settings = await databaseSystem.queryOne(
    "SELECT * FROM welcome_settings WHERE guild_id = $1",
    [guildId]
  )

  if (!settings) {
    return interaction.reply({
      content: "❌ لم يتم الإعداد بعد",
      ephemeral: true
    })
  }

  const welcomeCh = settings.welcome_channel_id
    ? `<#${settings.welcome_channel_id}>`
    : "غير محددة"

  const goodbyeCh = settings.goodbye_channel_id
    ? `<#${settings.goodbye_channel_id}>`
    : "غير محددة"

  const isEmbed = settings.type === "embed"
  const embedData = parseEmbedData(settings.embed_data)
  const mentionUser = settings.mention_user !== false
  const leaveEnabled = settings.leave_enabled === true

  const fields = [
    {
      name: "📊 الحالة",
      value: settings.enabled ? "🟢 مفعّل" : "🔴 معطّل",
      inline: true
    },
    {
      name: "📥 قناة الترحيب",
      value: welcomeCh,
      inline: true
    },
    {
      name: "📤 قناة الوداع",
      value: goodbyeCh,
      inline: true
    },
    {
      name: "🎨 النوع",
      value: isEmbed ? "📦 Embed" : "💬 نص عادي",
      inline: true
    },
    {
      name: "🔔 منشن العضو",
      value: mentionUser ? "✅" : "❌",
      inline: true
    },
    {
      name: "👋 الوداع",
      value: leaveEnabled ? "✅ مفعّل" : "❌ معطّل",
      inline: true
    }
  ]

  // ── لو نوع embed وعنده بيانات ──
  if (isEmbed && embedData) {
    if (embedData.title) {
      fields.push({
        name: "📌 عنوان الـ Embed",
        value: `\`\`\`${String(embedData.title).slice(0, 200)}\`\`\``,
        inline: false
      })
    }
    if (embedData.description) {
      fields.push({
        name: "📝 وصف الـ Embed",
        value: `\`\`\`${String(embedData.description).slice(0, 300)}\`\`\``,
        inline: false
      })
    }
  } else {
    // ── النص العادي ──
    fields.push({
      name: "💬 رسالة الترحيب",
      value: settings.welcome_message
        ? `\`\`\`${String(settings.welcome_message).slice(0, 300)}\`\`\``
        : "افتراضية",
      inline: false
    })
  }

  // ── رسالة الوداع (دائماً نعرضها لو الوداع مفعّل) ──
  if (leaveEnabled) {
    fields.push({
      name: "💬 رسالة الوداع",
      value: settings.goodbye_message
        ? `\`\`\`${String(settings.goodbye_message).slice(0, 300)}\`\`\``
        : "افتراضية",
      inline: false
    })
  }

  const embed = new EmbedBuilder()
    .setColor(settings.enabled ? COLORS.success : COLORS.danger)
    .setTitle("📋 إعدادات الترحيب")
    .addFields(fields)
    .setFooter({ text: "للتعديل المتقدم استخدم الداشبورد — \\n للسطر الجديد" })
    .setTimestamp()

  return interaction.reply({ embeds: [embed] })
}