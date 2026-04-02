const guildSystem = require("./guildSystem")
const planGateSystem = require("./planGateSystem")
const logger = require("./loggerSystem")

// ✅ FIX: كان ناقص async — الآن مع نظام الخطط
async function ensureAIEnabled(message) {

  try {

    if (!message) return false
    if (!message.guild) return false

    const guildId = message.guild.id

    // 🔒 تحقق من الخطة
    const planCheck = await planGateSystem.checkFeature(guildId, "ai")
    if (!planCheck.allowed) {
      return false
    }

    // 🔒 النظام مطفي في الإعدادات
    const aiEnabled = await guildSystem.isAIEnabled(guildId)
    if (!aiEnabled) return false

    // ❌ تجاهل الرسائل القصيرة جدًا
    if (!message.content || message.content.length < 3) return false

    // 🧠 تحديد التفاعل مع البوت
    const botId = message.client?.user?.id

    const isMention = botId
      ? message.mentions?.users?.has(botId)
      : false

    const isReply = message.reference?.messageId

    // 🔥 لازم يكون فيه تفاعل
    if (!isMention && !isReply) return false

    // ✅ فلترة ذكية
    const clean = message.content.trim()

    if (clean.length < 6) return false

    if (isMention) {
      const withoutMention = clean.replace(/<@!?\d+>/g, "").trim()
      if (!withoutMention) return false
    }

    return true

  } catch (error) {

    logger.error("AI_SYSTEM_FAILED", {
      error: error.message
    })

    return false
  }
}

module.exports = {
  ensureAIEnabled
}