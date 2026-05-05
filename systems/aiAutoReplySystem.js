// systems/aiAutoReplySystem.js
const aiHandler = require("./aiHandler")
const aiRateLimitSystem = require("./aiRateLimitSystem")
const aiTokenUsageSystem = require("./aiTokenUsageSystem")
const aiBrainSystem = require("./aiBrainSystem")
const aiMemorySystem = require("./aiMemorySystem")
const logger = require("./loggerSystem")
const devModeSystem = require("./devModeSystem")
const planGateSystem = require("./planGateSystem")
const scheduler = require("./schedulerSystem")

const OWNER_ID = "529320108032786433"

// ══════════════════════════════════════
//  COOLDOWNS — لمنع الـ spam على البوت
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
//  CLEANUP — يعمل كل دقيقة عبر scheduler
//  ينظف cooldowns القديمة و userSpam القديم
//  (بدل ما نستدعي cleanup يدوياً عند كل رسالة)
// ══════════════════════════════════════
scheduler.register(
  "ai-auto-reply-cleanup",
  60 * 1000, // دقيقة
  () => {
    const now = Date.now()

    // تنظيف cooldowns لو وصلوا الحد الأعلى
    if (cooldowns.size > MAX_COOLDOWNS) {
      cooldowns.clear()
    }

    // تنظيف userSpam المنتهي
    for (const [userId, data] of userSpam.entries()) {
      if (now - data.last > SPAM_WINDOW) {
        userSpam.delete(userId)
      }
    }
  },
  false
)

function randomDelay() {
  return 400 + Math.floor(Math.random() * 700)
}

function sanitize(text) {

  if (!text) return ""

  return String(text)
    .replace(/@everyone/g, "@ everyone")
    .replace(/@here/g, "@ here")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_REPLY_LENGTH)
}

function removeBotMention(message, content) {

  const botId = message.client.user.id

  return content
    .replace(`<@${botId}>`, "")
    .replace(`<@!${botId}>`, "")
}

function detectSpam(userId) {

  const now = Date.now()

  const data = userSpam.get(userId) || {
    count: 0,
    last: now
  }

  if (now - data.last < SPAM_WINDOW) {
    data.count++
  } else {
    data.count = 1
  }

  data.last = now

  userSpam.set(userId, data)

  return data.count >= SPAM_LIMIT
}

module.exports = async (message) => {

  try {

    if (!message?.author || message.author.bot) return
    if (!message.content) return

    // 🔒 منع المعالجة المزدوجة — قفل فوري بـ message.id
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

    const botName = message.client.user.username.toLowerCase()

    const mentioned = message.mentions.has(message.client.user)
    const calledByName = message.content.toLowerCase().startsWith(botName)

    if (!mentioned && !calledByName) return

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

    // ✅ checkUserRateLimit مع رسائل ذكية
    const rateLimitCheck = aiRateLimitSystem.checkUserRateLimit(userId)

    if (!rateLimitCheck.allowed) {
      return message.reply(rateLimitCheck.message)
    }

    // ✅ تحقق من حد السيرفر اليومي للمنشن
    if (message.guild) {
      const aiLimit = await planGateSystem.checkAILimit(message.guild.id, "mention")
      if (!aiLimit.allowed) {
        return message.reply(aiLimit.message)
      }
    }

    let content = removeBotMention(message, message.content)
    content = sanitize(content)

    if (content.toLowerCase().startsWith(botName)) {
      content = content.slice(botName.length).trim()
    }

    if (!content || content.length < 2) return

    // 🔥 brain intent detection (economy etc.)
    const intent = aiBrainSystem.detectIntent(content)

    if (intent) {

      const result = await aiBrainSystem.handleIntent(
        intent,
        userId,
        content,
        message
      )

      if (result) {
        return message.reply(sanitize(result))
      }
    }

    const estimatedTokens = Math.ceil(content.length / 4)

    const tokenAllowed = aiTokenUsageSystem.canUseTokens(userId, estimatedTokens)

    if (!tokenAllowed) {
      return message.reply("⚠️ الحد المؤقت تم تجاوزه.")
    }

    const reply = await aiHandler.askAI(userId, content, {
      user: message.author,
      guild: message.guild,
      channel: message.channel
    })

    if (!reply) return

    const safeReply = sanitize(reply)

    await new Promise(r => setTimeout(r, randomDelay()))

    await message.reply(safeReply)

    // ✅ سجّل استخدام المنشن بعد الرد الناجح
    if (message.guild) {
      planGateSystem.recordAIUsage(message.guild.id, "mention")
    }

    // 🔥 behavior memory
    if (content.length > 5 && message.guild) {
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