// ══════════════════════════════════════════════════════════════════
//  AI AUTO REPLY SYSTEM
//  المسار: systems/aiAutoReplySystem.js
//
//  يحترم بالكامل ai_settings من الداش:
//   - enabled, respond_to_mentions, respond_to_replies
//   - allowed_channels (whitelist) — لو فاضي = كل القنوات
//   - always_respond_channels (يرد على كل رسالة بدون منشن)
//   - persona, custom_prompt
//   - blocked_words (يتجاهل الرسائل اللي تحويها)
//   - max_response_length (يقص الرد)
//   - messages_per_day (تحقق إضافي)
//
//  هذا هو الـ entry point للرد التلقائي على الرسائل.
//  يُستدعى من events/handlers/aiHandler.js
//
//  انظر: systems/_README.md للخريطة الكاملة
// ══════════════════════════════════════════════════════════════════

const aiHandler = require("./aiHandler")
const aiRateLimitSystem = require("./aiRateLimitSystem")
const aiTokenUsageSystem = require("./aiTokenUsageSystem")
const aiBrainSystem = require("./aiBrainSystem")
const aiMemorySystem = require("./aiMemorySystem")
const databaseSystem = require("./databaseSystem")
const logger = require("./loggerSystem")
const devModeSystem = require("./devModeSystem")
const planGateSystem = require("./planGateSystem")
const scheduler = require("./schedulerSystem")
const cacheSystem = require("../utils/cacheSystem")

const OWNER_ID = "529320108032786433"

// ══════════════════════════════════════
//  COOLDOWNS
// ══════════════════════════════════════
const cooldowns = new Map()
const COOLDOWN_TIME = 6000
const MAX_COOLDOWNS = 500
const MAX_REPLY_LENGTH = 1900

// ══════════════════════════════════════
//  USER SPAM TRACKING
// ══════════════════════════════════════
const userSpam = new Map()
const SPAM_WINDOW = 4000
const SPAM_LIMIT = 4

// ══════════════════════════════════════
//  AI SETTINGS CACHE — 60s TTL (موحّد عبر cacheSystem)
// ══════════════════════════════════════
const aiSettingsCache = cacheSystem.ns("ai-settings")
const SETTINGS_TTL = 60 * 1000

scheduler.register(
  "ai-auto-reply-cleanup",
  60 * 1000,
  () => {
    const now = Date.now()

    if (cooldowns.size > MAX_COOLDOWNS) cooldowns.clear()

    for (const [userId, data] of userSpam.entries()) {
      if (now - data.last > SPAM_WINDOW) userSpam.delete(userId)
    }
    // settings cache يُنظف تلقائياً عبر cacheSystem
  },
  false
)

// ══════════════════════════════════════
//  Helpers
// ══════════════════════════════════════

function randomDelay() {
  return 400 + Math.floor(Math.random() * 700)
}

function parseJsonArray(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === "string") {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}

function sanitize(text, maxLen = MAX_REPLY_LENGTH) {
  if (!text) return ""
  return String(text)
    .replace(/@everyone/g, "@ everyone")
    .replace(/@here/g, "@ here")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, Math.min(maxLen, MAX_REPLY_LENGTH))
}

function removeBotMention(message, content) {
  const botId = message.client.user.id
  return content
    .replace(`<@${botId}>`, "")
    .replace(`<@!${botId}>`, "")
}

function detectSpam(userId) {
  const now = Date.now()
  const data = userSpam.get(userId) || { count: 0, last: now }
  if (now - data.last < SPAM_WINDOW) data.count++
  else data.count = 1
  data.last = now
  userSpam.set(userId, data)
  return data.count >= SPAM_LIMIT
}

function containsBlockedWord(content, blockedWords) {
  if (!Array.isArray(blockedWords) || blockedWords.length === 0) return false
  const lower = content.toLowerCase()
  for (const w of blockedWords) {
    if (typeof w !== "string" || !w.trim()) continue
    if (lower.includes(w.toLowerCase())) return true
  }
  return false
}

// ══════════════════════════════════════
//  Settings loader (مع cache موحّد)
// ══════════════════════════════════════

async function getAISettings(guildId) {
  if (!guildId) return null

  const cached = aiSettingsCache.get(guildId)
  if (cached !== null) return cached

  let row = null
  try {
    row = await databaseSystem.queryOne(
      "SELECT * FROM ai_settings WHERE guild_id = $1",
      [guildId]
    )
  } catch (err) {
    logger.error("AI_SETTINGS_LOAD_FAILED", { error: err.message })
  }

  const data = row ? {
    enabled: row.enabled !== false,
    respond_to_mentions: row.respond_to_mentions !== false,
    respond_to_replies: row.respond_to_replies !== false,
    always_respond_channels: parseJsonArray(row.always_respond_channels),
    allowed_channels: parseJsonArray(row.allowed_channels),
    blocked_words: parseJsonArray(row.blocked_words),
    persona: row.persona || "friendly",
    custom_prompt: row.custom_prompt || null,
    max_response_length: parseInt(row.max_response_length) || 500,
    messages_per_day: parseInt(row.messages_per_day) || 50,
    creative_model_enabled: row.creative_model_enabled === true
  } : null

  aiSettingsCache.set(guildId, data, SETTINGS_TTL)
  return data
}

// ══════════════════════════════════════
//  Trigger detection (mention / always-respond / reply-to-bot)
// ══════════════════════════════════════

async function shouldRespond(message, settings) {
  const botId = message.client.user.id
  const channelId = message.channel.id

  // 1) القنوات اللي ترد فيها على كل شيء
  if (settings.always_respond_channels.includes(channelId)) {
    return { respond: true, type: "always" }
  }

  // 2) منشن مباشر للبوت
  if (settings.respond_to_mentions && message.mentions.has(message.client.user)) {
    return { respond: true, type: "mention" }
  }

  // 3) رد على رسالة سابقة من البوت
  if (settings.respond_to_replies && message.reference?.messageId) {
    try {
      const referenced = await message.channel.messages.fetch(message.reference.messageId)
      if (referenced?.author?.id === botId) {
        return { respond: true, type: "reply" }
      }
    } catch {}
  }

  // 4) النداء بالاسم (سلوك قديم — نتركه كـ trigger للمنشن)
  if (settings.respond_to_mentions) {
    const botName = message.client.user.username.toLowerCase()
    if (message.content.toLowerCase().startsWith(botName)) {
      return { respond: true, type: "mention" }
    }
  }

  return { respond: false }
}

// ══════════════════════════════════════
//  Main handler
// ══════════════════════════════════════

module.exports = async (message) => {
  try {
    if (!message?.author || message.author.bot) return
    if (!message.content) return
    if (!message.guild) return

    if (message._aiProcessed) return
    message._aiProcessed = true

    const userId = message.author.id

    // 🔥 dev mode commands
    if (userId === OWNER_ID) {
      if (message.content === "!dev on") {
        devModeSystem.enable()
        return message.reply("✅ تم تفعيل وضع المطور")
      }
      if (message.content === "!dev off") {
        devModeSystem.disable()
        return message.reply("❌ تم إيقاف وضع المطور")
      }
    }

    // ✅ جلب الإعدادات
    const settings = await getAISettings(message.guild.id)

    // لو ما عنده row بعد، نطبق defaults معقولة
    const effective = settings || {
      enabled: true,
      respond_to_mentions: true,
      respond_to_replies: true,
      always_respond_channels: [],
      allowed_channels: [],
      blocked_words: [],
      persona: "friendly",
      custom_prompt: null,
      max_response_length: 500,
      messages_per_day: 50,
      creative_model_enabled: false
    }

    if (!effective.enabled) return

    // ✅ allowed_channels — whitelist (لو فاضي = الكل مسموح)
    if (effective.allowed_channels.length > 0) {
      const channelOk =
        effective.allowed_channels.includes(message.channel.id) ||
        (message.channel.parentId && effective.allowed_channels.includes(message.channel.parentId))
      // استثناء: always_respond_channels تُسمح حتى لو مش في القائمة البيضاء
      if (!channelOk && !effective.always_respond_channels.includes(message.channel.id)) {
        return
      }
    }

    // ✅ تحديد هل نرد أصلاً
    const trigger = await shouldRespond(message, effective)
    if (!trigger.respond) return

    if (!devModeSystem.canRespond(userId)) return

    // 🔥 anti spam
    if (userId !== OWNER_ID && detectSpam(userId)) {
      return message.reply("⚠️ لا ترسل رسائل بسرعة.")
    }

    const now = Date.now()
    if (userId !== OWNER_ID && cooldowns.has(userId)) {
      const expiration = cooldowns.get(userId) + COOLDOWN_TIME
      if (now < expiration) {
        const remaining = Math.ceil((expiration - now) / 1000)
        return message.reply(`⏳ انتظر ${remaining} ثانية.`)
      }
    }
    cooldowns.set(userId, now)

    const rateLimitCheck = aiRateLimitSystem.checkUserRateLimit(userId)
    if (!rateLimitCheck.allowed) {
      return message.reply(rateLimitCheck.message)
    }

    // ✅ تحقق من حد السيرفر اليومي
    const aiLimit = await planGateSystem.checkAILimit(message.guild.id, "mention")
    if (!aiLimit.allowed) {
      return message.reply(aiLimit.message)
    }

    // ✅ معالجة المحتوى
    let content = removeBotMention(message, message.content)
    content = sanitize(content, MAX_REPLY_LENGTH)

    const botName = message.client.user.username.toLowerCase()
    if (content.toLowerCase().startsWith(botName)) {
      content = content.slice(botName.length).trim()
    }

    if (!content || content.length < 2) return

    // ✅ blocked_words filter
    if (containsBlockedWord(content, effective.blocked_words)) {
      return // صامت — لا ترد
    }

    // 🔥 brain intent detection
    const intent = aiBrainSystem.detectIntent(content)
    if (intent) {
      const result = await aiBrainSystem.handleIntent(intent, userId, content, message)
      if (result) {
        return message.reply(sanitize(result, effective.max_response_length))
      }
    }

    const estimatedTokens = Math.ceil(content.length / 4)
    if (!aiTokenUsageSystem.canUseTokens(userId, estimatedTokens)) {
      return message.reply("⚠️ الحد المؤقت تم تجاوزه.")
    }

    // ✅ تمرير الإعدادات للـ aiHandler (persona/custom_prompt)
    const reply = await aiHandler.askAI(userId, content, {
      user: message.author,
      guild: message.guild,
      channel: message.channel,
      persona: effective.persona,
      customPrompt: effective.custom_prompt,
      maxResponseLength: effective.max_response_length,
      creativeModel: effective.creative_model_enabled,
      triggerType: trigger.type
    })

    if (!reply) return

    const safeReply = sanitize(reply, effective.max_response_length)
    if (!safeReply) return

    await new Promise(r => setTimeout(r, randomDelay()))
    await message.reply(safeReply)

    // ✅ سجّل الاستخدام
    planGateSystem.recordAIUsage(message.guild.id, "mention")

    // ✅ AI usage log للداش
    try {
      await databaseSystem.query(
        `INSERT INTO ai_usage_log (guild_id, user_id, model, tokens_used)
         VALUES ($1, $2, $3, $4)`,
        [
          message.guild.id,
          userId,
          effective.creative_model_enabled ? "creative" : "default",
          estimatedTokens
        ]
      )
    } catch (err) {
      logger.error("AI_USAGE_LOG_FAILED", { error: err.message })
    }

    // 🔥 behavior memory
    if (content.length > 5) {
      try {
        await aiMemorySystem.storeServerMemory(
          `${message.author.username} نشط في ${message.guild.name}`
        )
      } catch (err) {
        logger.error("SERVER_MEMORY_STORE_FAILED", { error: err.message })
      }
    }

  } catch (error) {
    logger.error("AI_AUTO_REPLY_ERROR", {
      error: error.message,
      stack: error.stack
    })

    try {
      await message.reply("❌ صار خطأ.")
    } catch {}
  }
}

// invalidate cache (يُستخدم لو الداش غيّرت الإعدادات)
module.exports.invalidateCache = (guildId) => {
  if (guildId) aiSettingsCache.del(guildId)
  else aiSettingsCache.clear()
}