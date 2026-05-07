// ══════════════════════════════════════════════════════════════════
//  guildMemberRemove Event — Goodbye System
//  المسار: events/logs/guildMemberRemove.js
//
//  يدعم:
//   - leave_enabled: تفعيل/تعطيل رسالة الوداع منفصلاً
//   - leave_message (JSONB): { type, content, embed: { title, description, color, footer } }
//   - goodbye_message (string): fallback للنص العادي
//   - متغيرات: {user} {username} {server} {count}
//   - استبدال global لكل المتغيرات
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const databaseSystem = require("../../systems/databaseSystem")
const statsSystem = require("../../systems/statsSystem")
const logger = require("../../systems/loggerSystem")

// ──────────────────────────────────────────────────────────────────
//  Variable replacement (global)
// ──────────────────────────────────────────────────────────────────

function applyVariables(text, member) {
  if (!text || typeof text !== "string") return text
  return text
    .replace(/\{user\}/g, `<@${member.user.id}>`)
    .replace(/\{username\}/g, member.user.username)
    .replace(/\{server\}/g, member.guild.name)
    .replace(/\{count\}/g, String(member.guild.memberCount))
}

// ──────────────────────────────────────────────────────────────────
//  Settings loader
// ──────────────────────────────────────────────────────────────────

async function getWelcomeSettings(guildId) {
  try {
    return await databaseSystem.queryOne(
      "SELECT * FROM welcome_settings WHERE guild_id = $1",
      [guildId]
    )
  } catch {
    return null
  }
}

// ──────────────────────────────────────────────────────────────────
//  JSONB parser
// ──────────────────────────────────────────────────────────────────

function parseJsonField(raw) {
  if (!raw) return null
  if (typeof raw === "object") return raw
  if (typeof raw === "string") {
    try { return JSON.parse(raw) } catch { return null }
  }
  return null
}

// ──────────────────────────────────────────────────────────────────
//  Build goodbye embed
//  أولوية:
//    1) leave_message JSONB من الداش (لو موجود وعنده embed)
//    2) leave_message JSONB type=text → نص عادي + embed افتراضي
//    3) goodbye_message string → fallback
// ──────────────────────────────────────────────────────────────────

function buildGoodbyeEmbed(settings, member) {
  const leaveData = parseJsonField(settings.leave_message)

  // ── الحالة 1: leave_message عبارة عن embed من الداش ──
  if (leaveData && leaveData.embed && typeof leaveData.embed === "object") {
    const e = leaveData.embed
    const embed = new EmbedBuilder()

    if (e.title) {
      embed.setTitle(applyVariables(e.title, member).slice(0, 256))
    } else {
      embed.setTitle("👋 عضو غادر")
    }
    if (e.description) {
      embed.setDescription(applyVariables(e.description, member).slice(0, 4096))
    } else {
      embed.setDescription(`**${member.user.username}** غادر السيرفر`)
    }
    if (typeof e.color === "number") {
      embed.setColor(e.color)
    } else {
      embed.setColor(0xef4444)
    }
    if (e.footer) {
      embed.setFooter({ text: applyVariables(e.footer, member).slice(0, 2048) })
    }

    embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
    embed.addFields({
      name: "👥 عدد الأعضاء الآن",
      value: `${member.guild.memberCount}`,
      inline: true
    })
    embed.setTimestamp()
    return embed
  }

  // ── الحالة 2: leave_message عبارة عن { type:'text', content } ──
  if (leaveData && typeof leaveData.content === "string") {
    return new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle("👋 عضو غادر")
      .setDescription(applyVariables(leaveData.content, member))
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
      .addFields({
        name: "👥 عدد الأعضاء الآن",
        value: `${member.guild.memberCount}`,
        inline: true
      })
      .setTimestamp()
  }

  // ── الحالة 3: goodbye_message قديم (string) ──
  const msg = settings.goodbye_message
    ? applyVariables(settings.goodbye_message, member)
    : `**${member.user.username}** غادر السيرفر`

  return new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle("👋 عضو غادر")
    .setDescription(msg)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
    .addFields({
      name: "👥 عدد الأعضاء الآن",
      value: `${member.guild.memberCount}`,
      inline: true
    })
    .setTimestamp()
}

// ──────────────────────────────────────────────────────────────────
//  Event
// ──────────────────────────────────────────────────────────────────

module.exports = {
  name: "guildMemberRemove",

  async execute(member, client) {
    try {
      if (!member.guild) return

      // 📊 Stats snapshot
      try {
        await statsSystem.recordSnapshot(member.guild.id, member.guild.memberCount, 0, 1)
      } catch {}

      const settings = await getWelcomeSettings(member.guild.id)
      if (!settings) return

      // ✅ يحترم leave_enabled (مستقل عن enabled العام)
      // لو leave_enabled = false → ما يرسل وداع
      // لو leave_enabled = undefined (DB قديم) → نرجع للسلوك القديم (يرسل لو فيه قناة)
      if (settings.leave_enabled === false) return

      if (!settings.goodbye_channel_id) return

      const channel = member.guild.channels.cache.get(settings.goodbye_channel_id)
      if (!channel) return

      const embed = buildGoodbyeEmbed(settings, member)

      await channel.send({ embeds: [embed] })

    } catch (err) {
      logger.error("GOODBYE_FAILED", { error: err.message })
    }
  }
}