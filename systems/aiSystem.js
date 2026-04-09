const guildSystem = require("./guildSystem")
const planGateSystem = require("./planGateSystem")
const logger = require("./loggerSystem")

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

    // ✅ التحقق من المنشن يصير في aiAutoReplySystem فقط
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