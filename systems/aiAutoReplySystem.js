const aiHandler = require("./aiHandler")
const aiRateLimitSystem = require("./aiRateLimitSystem")
const aiTokenUsageSystem = require("./aiTokenUsageSystem")
const aiBrainSystem = require("./aiBrainSystem")
const aiMemorySystem = require("./aiMemorySystem")
const logger = require("./loggerSystem")

const OWNER_ID = "529320108032786433"

const cooldowns = new Map()
const COOLDOWN_TIME = 6000
const MAX_COOLDOWNS = 500
const MAX_REPLY_LENGTH = 1900

// ✅ NEW: response deduplication (منع spam الردود المكررة)
const recentReplies = new Map()
const RECENT_REPLY_TTL = 5000

function randomDelay() {
  return 600 + Math.floor(Math.random() * 900)
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

function cleanupCooldowns() {

  if (cooldowns.size > MAX_COOLDOWNS) {
    cooldowns.clear()
  }

  // ✅ NEW: تنظيف الردود المؤقتة
  const now = Date.now()
  for (const [key, time] of recentReplies.entries()) {
    if (now - time > RECENT_REPLY_TTL) {
      recentReplies.delete(key)
    }
  }

}

function removeBotMention(message, content) {

  const botId = message.client.user.id

  return content
    .replace(`<@${botId}>`, "")
    .replace(`<@!${botId}>`, "")
}

module.exports = async (message) => {

  try {

    if (!message) return
    if (!message.author) return
    if (message.author.bot) return
    if (!message.content) return

    const botName = message.client.user.username.toLowerCase()

    const mentioned = message.mentions.has(message.client.user)
    const calledByName = message.content.toLowerCase().startsWith(botName)

    if (!mentioned && !calledByName) return

    const userId = message.author.id
    const now = Date.now()

    cleanupCooldowns()

    if (userId !== OWNER_ID && cooldowns.has(userId)) {

      const expiration = cooldowns.get(userId) + COOLDOWN_TIME

      if (now < expiration) {

        const remaining = Math.ceil((expiration - now) / 1000)

        return message.reply(`⏳ انتظر ${remaining} ثانية قبل التحدث معي مرة أخرى.`)
      }
    }

    cooldowns.set(userId, now)

    const allowed = aiRateLimitSystem.canUseAI(userId)

    if (!allowed) {
      return message.reply("⚠️ استخدمت الذكاء الاصطناعي كثيراً، حاول بعد قليل.")
    }

    let content = removeBotMention(message, message.content)

    content = sanitize(content)

    if (content.toLowerCase().startsWith(botName)) {
      content = content.slice(botName.length).trim()
    }

    if (!content) return
    if (content.length < 2) return

    // ✅ NEW: منع تكرار نفس الرسالة بسرعة
    const dedupeKey = `${userId}:${content}`
    if (recentReplies.has(dedupeKey)) {
      return
    }
    recentReplies.set(dedupeKey, now)

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
      return message.reply("⚠️ الحد المؤقت لاستخدام الذكاء الاصطناعي تم تجاوزه.")
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

    if (message.guild) {

      try {

        await aiMemorySystem.storeServerMemory(
          `${message.author.username} تحدث في ${message.guild.name}`
        )

      } catch (err) {

        logger.error("SERVER_MEMORY_STORE_FAILED", {
          error: err.message
        })

      }

    }

  } catch (error) {

    logger.error("AI_AUTO_REPLY_ERROR", {
      error: error.message,
      stack: error.stack
    })

    try {
      await message.reply("❌ حدث خطأ أثناء التفكير.")
    } catch {}

  }

}