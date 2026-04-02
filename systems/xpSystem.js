const guildSystem = require("./guildSystem")
const planGateSystem = require("./planGateSystem")
const logger = require("./loggerSystem")

// ✅ FIX: كان ناقص async — الآن مع نظام الخطط
async function ensureXPEnabled(message) {
  if (!message || !message.guild) {
    return false
  }

  const guildId = message.guild.id

  // 🔒 تحقق من الخطة
  const planCheck = await planGateSystem.checkFeature(guildId, "xp")
  if (!planCheck.allowed) {
    return false // صامت — ما نرسل رسالة لكل رسالة
  }

  const enabled = await guildSystem.isXPEnabled(guildId)

  if (!enabled) {
    return false
  }

  return true
}

module.exports = {
  ensureXPEnabled
}
