// ══════════════════════════════════════════════════════════════════
//  guildMemberAdd Event — Welcome System
//  المسار: events/logs/guildMemberAdd.js
//
//  يدعم:
//   - type: 'text' أو 'embed' (من الداش)
//   - embed_data: { title, description, color, footer }
//   - mention_user: تفعيل/تعطيل منشن العضو
//   - متغيرات: {user} {username} {server} {count}
//   - استبدال global لكل المتغيرات
//   - صورة ترحيب canvas مرفقة
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const { createCanvas, loadImage } = require("@napi-rs/canvas")
const databaseSystem = require("../../systems/databaseSystem")
const protectionSystem = require("../../systems/protectionSystem")
const statsSystem = require("../../systems/statsSystem")
const logger = require("../../systems/loggerSystem")

// ──────────────────────────────────────────────────────────────────
//  Variable replacement (global, supports all variables)
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
//  Welcome canvas image
// ──────────────────────────────────────────────────────────────────

async function generateWelcomeImage(member, guild) {
  const canvas = createCanvas(1000, 350)
  const ctx = canvas.getContext("2d")

  const gradient = ctx.createLinearGradient(0, 0, 1000, 350)
  gradient.addColorStop(0, "#0a0f1e")
  gradient.addColorStop(1, "#0d1525")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1000, 350)

  ctx.fillStyle = "#00c8ff"
  ctx.fillRect(0, 0, 6, 350)

  ctx.beginPath()
  ctx.arc(175, 175, 105, 0, Math.PI * 2)
  ctx.fillStyle = "rgba(0, 200, 255, 0.1)"
  ctx.fill()

  ctx.beginPath()
  ctx.arc(175, 175, 95, 0, Math.PI * 2)
  ctx.strokeStyle = "#00c8ff"
  ctx.lineWidth = 4
  ctx.stroke()

  try {
    const avatarURL = member.user.displayAvatarURL({ extension: "png", size: 256 })
    const avatar = await loadImage(avatarURL)
    ctx.save()
    ctx.beginPath()
    ctx.arc(175, 175, 90, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(avatar, 85, 85, 180, 180)
    ctx.restore()
  } catch {}

  ctx.fillStyle = "#ffffff"
  ctx.font = "bold 42px Sans"
  ctx.fillText(member.user.username.slice(0, 20), 300, 145)

  ctx.fillStyle = "#00c8ff"
  ctx.font = "28px Sans"
  ctx.fillText("مرحباً بك في السيرفر!", 300, 200)

  ctx.fillStyle = "rgba(255,255,255,0.5)"
  ctx.font = "22px Sans"
  ctx.fillText(`عضو رقم #${guild.memberCount}`, 300, 245)

  ctx.fillStyle = "rgba(0, 200, 255, 0.3)"
  ctx.fillRect(300, 265, 650, 1)

  ctx.fillStyle = "rgba(255,255,255,0.4)"
  ctx.font = "18px Sans"
  ctx.fillText(guild.name, 300, 295)

  return canvas.toBuffer("image/png")
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
//  Embed data parser (from JSONB column)
// ──────────────────────────────────────────────────────────────────

function parseEmbedData(raw) {
  if (!raw) return null
  if (typeof raw === "object") return raw
  if (typeof raw === "string") {
    try { return JSON.parse(raw) } catch { return null }
  }
  return null
}

// ──────────────────────────────────────────────────────────────────
//  Build welcome embed (text mode OR embed mode)
// ──────────────────────────────────────────────────────────────────

function buildWelcomeEmbed(settings, member) {
  const isEmbedMode = settings.type === "embed"
  const embedData = parseEmbedData(settings.embed_data)

  // ── Embed mode: use embed_data from dashboard ──
  if (isEmbedMode && embedData) {
    const embed = new EmbedBuilder()

    if (embedData.title) {
      embed.setTitle(applyVariables(embedData.title, member).slice(0, 256))
    }
    if (embedData.description) {
      embed.setDescription(applyVariables(embedData.description, member).slice(0, 4096))
    }
    if (typeof embedData.color === "number") {
      embed.setColor(embedData.color)
    } else {
      embed.setColor(0x00c8ff)
    }
    if (embedData.footer) {
      embed.setFooter({ text: applyVariables(embedData.footer, member).slice(0, 2048) })
    } else {
      embed.setFooter({ text: `عضو رقم ${member.guild.memberCount}` })
    }
    embed.setTimestamp()
    return embed
  }

  // ── Text mode (or fallback): build embed from welcome_message ──
  const msg = applyVariables(
    settings.welcome_message || "أهلاً وسهلاً بك!",
    member
  )

  return new EmbedBuilder()
    .setColor(0x00c8ff)
    .setDescription(msg)
    .setFooter({ text: `عضو رقم ${member.guild.memberCount}` })
    .setTimestamp()
}

// ──────────────────────────────────────────────────────────────────
//  Event
// ──────────────────────────────────────────────────────────────────

module.exports = {
  name: "guildMemberAdd",

  async execute(member, client) {
    try {
      if (!member.guild) return

      // 🛡️ Anti-Raid
      try {
        await protectionSystem.checkRaid(member)
      } catch (err) {
        logger.error("ANTIRAID_FAILED", { error: err.message })
      }

      // 📊 Stats snapshot
      try {
        await statsSystem.recordSnapshot(member.guild.id, member.guild.memberCount, 1, 0)
      } catch {}

      // 👋 Welcome system
      const settings = await getWelcomeSettings(member.guild.id)
      if (!settings || !settings.enabled) return

      const channel = member.guild.channels.cache.get(settings.welcome_channel_id)
      if (!channel) return

      // ✅ صورة الترحيب (تُرفق مع الرسالة)
      let imageBuffer = null
      try {
        imageBuffer = await generateWelcomeImage(member, member.guild)
      } catch (err) {
        logger.error("WELCOME_IMAGE_FAILED", { error: err.message })
      }

      // ✅ بناء الـ embed (يحترم type + embed_data من الداش)
      const embed = buildWelcomeEmbed(settings, member)

      // ✅ منشن العضو (افتراضي: مفعّل، يحترم mention_user من الداش)
      const shouldMention = settings.mention_user !== false
      const content = shouldMention ? `${member}` : null

      const messagePayload = {
        embeds: [embed],
      }
      if (content) messagePayload.content = content
      if (imageBuffer) {
        messagePayload.files = [{ attachment: imageBuffer, name: "welcome.png" }]
      }

      await channel.send(messagePayload)

    } catch (err) {
      logger.error("GUILD_MEMBER_ADD_EVENT_FAILED", { error: err.message })
    }
  }
}