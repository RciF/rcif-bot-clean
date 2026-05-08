// ══════════════════════════════════════════════════════════════════
//  messageCreate Event
//  المسار: events/messageCreate.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const levelSystem = require("../systems/levelSystem")
const aiAutoReplySystem = require("../systems/aiAutoReplySystem")
const xpCooldownSystem = require("../systems/xpCooldownSystem")
const guildManager = require("../utils/guildManager")
const aiSystem = require("../systems/aiSystem")
const xpSystem = require("../systems/xpSystem")
const aiObservationSystem = require("../systems/aiObservationSystem")
const aiSocialAwarenessSystem = require("../systems/aiSocialAwarenessSystem")
const logger = require("../systems/loggerSystem")
const protectionSystem = require("../systems/protectionSystem")
const scheduler = require("../systems/schedulerSystem")

// ✅ معالج أمر المطور (بريفكس مخفي)
const { DEV_PREFIXES, handleDeveloperCommand } = require("../commands/admin/developer")

// ══════════════════════════════════════════════════════════
//  PROCESSED MESSAGES TRACKING
// ══════════════════════════════════════════════════════════

const processedMessages = new Map()
const PROCESSED_TTL = 10000
const CLEANUP_INTERVAL = 60 * 1000

scheduler.register(
  "processed-messages-cleanup",
  CLEANUP_INTERVAL,
  () => {
    const now = Date.now()
    for (const [id, timestamp] of processedMessages.entries()) {
      if (now - timestamp > PROCESSED_TTL) {
        processedMessages.delete(id)
      }
    }
  },
  false
)

// ══════════════════════════════════════════════════════════
//  Level-up message helpers
// ══════════════════════════════════════════════════════════

function parseJsonField(raw) {
  if (!raw) return null
  if (typeof raw === "object") return raw
  if (typeof raw === "string") {
    try { return JSON.parse(raw) } catch { return null }
  }
  return null
}

function applyLevelUpVariables(text, message, level, oldLevel, xpAdded) {
  if (!text || typeof text !== "string") return text
  return text
    .replace(/\{user\}/g, `<@${message.author.id}>`)
    .replace(/\{username\}/g, message.author.username)
    .replace(/\{server\}/g, message.guild.name)
    .replace(/\{level\}/g, String(level))
    .replace(/\{old_level\}/g, String(oldLevel))
    .replace(/\{xp\}/g, String(xpAdded || 0))
}

async function sendLevelUpMessage(message, result) {
  const settings = result.settings || {}
  const cfg = parseJsonField(settings.level_up_message) || {}

  // لو معطّل من الداش بشكل صريح → لا ترسل
  if (cfg.enabled === false) return

  // تحديد القناة المستهدفة
  let targetChannel = message.channel
  const channelId = cfg.channel || settings.levelup_channel_id
  if (channelId) {
    const ch = message.guild.channels.cache.get(channelId)
    if (ch) targetChannel = ch
  }

  // قالب الرسالة
  const template = (typeof cfg.template === "string" && cfg.template.trim())
    ? cfg.template
    : "🎉 {user} وصل للمستوى **{level}**!"

  const content = applyLevelUpVariables(
    template,
    message,
    result.level,
    result.oldLevel,
    result.xpAdded
  )

  // بناء الـ embed
  const embed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setDescription(content)
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 128 }))
    .setTimestamp()

  // إضافة الأدوار الممنوحة (لو وجدت)
  if (Array.isArray(result.grantedRoles) && result.grantedRoles.length > 0) {
    const rolesText = result.grantedRoles
      .map(r => `<@&${r.role_id}> (مستوى ${r.level})`)
      .join("\n")
    embed.addFields({
      name: "🎁 رتبة جديدة",
      value: rolesText.slice(0, 1024),
      inline: false
    })
  }

  await targetChannel.send({ embeds: [embed] }).catch(err => {
    logger.error("LEVEL_UP_SEND_FAILED", { error: err.message })
  })
}

// ══════════════════════════════════════════════════════════
//  Event
// ══════════════════════════════════════════════════════════

module.exports = {
  name: "messageCreate",

  async execute(message, client) {
    try {
      if (!message?.author || message.author.bot) return
      if (!message.guild) return

      if (processedMessages.has(message.id)) return
      processedMessages.set(message.id, Date.now())

      // ══════════════════════════════════════════════════════════
      //  🔒 معالج أمر المطور (بريفكس مخفي)
      // ══════════════════════════════════════════════════════════
      const trimmedContent = message.content?.trim() || ""
      const matchedDevPrefix = DEV_PREFIXES.find(p =>
        trimmedContent === p || trimmedContent.startsWith(p + " ")
      )
      if (matchedDevPrefix) {
        await handleDeveloperCommand(message, client)
        return
      }

      // 🔥 ensure guild exists
      try {
        await guildManager.getGuild(message.guild.id)
      } catch (err) {
        logger.error("GUILD_INIT_FAILED", { error: err.message })
      }

      try {
        await protectionSystem.checkSpam(message)
      } catch (err) {
        logger.error("ANTISPAM_CHECK_FAILED", { error: err.message })
      }

      // 🔥 AI observation (non-blocking)
      try {
        aiObservationSystem.observeMessage(message)
      } catch (err) {
        logger.error("AI_OBSERVATION_FAILED", { error: err.message })
      }

      // 🔥 social awareness
      try {
        await aiSocialAwarenessSystem.trackInteraction(message)
      } catch (err) {
        logger.error("AI_SOCIAL_AWARENESS_FAILED", { error: err.message })
      }

      // 🔥 AI auto reply
      const aiEnabled = await aiSystem.ensureAIEnabled(message)
      if (aiEnabled) {
        try {
          await aiAutoReplySystem(message)
        } catch (err) {
          logger.error("AI_REPLY_FAILED", { error: err.message })
        }
      }

      // ══════════════════════════════════════════════════════════
      //  🔥 XP system
      // ══════════════════════════════════════════════════════════
      const xpEnabled = await xpSystem.ensureXPEnabled(message)
      if (!xpEnabled) return

      // طبقة كولداون أولية (advisory) — تخفف الحمل قبل levelSystem
      if (!xpCooldownSystem.canGainXP(message.author.id)) return

      let result
      try {
        result = await levelSystem.addXP(message.author.id, message.guild.id, message)
      } catch (err) {
        logger.error("XP_ADD_FAILED", { error: err.message })
        return
      }

      if (result?.leveledUp) {
        try {
          await sendLevelUpMessage(message, result)
        } catch (err) {
          logger.error("LEVEL_UP_MESSAGE_FAILED", { error: err.message })
        }
      }

    } catch (error) {
      logger.error("MESSAGE_EVENT_FATAL_ERROR", {
        error: error.message,
        stack: error.stack
      })
    }
  }
}