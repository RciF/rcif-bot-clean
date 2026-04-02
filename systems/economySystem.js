const guildSystem = require("./guildSystem")
const planGateSystem = require("./planGateSystem")
const logger = require("./loggerSystem")

// ✅ FIX: كان ناقص async — الآن مع نظام الخطط
async function ensureEconomyEnabled(interaction) {
  if (!interaction || !interaction.guild) {
    return false
  }

  const guildId = interaction.guild.id

  // 🔒 تحقق من الخطة أولاً
  const planCheck = await planGateSystem.checkFeature(guildId, "economy")
  if (!planCheck.allowed) {
    safeReply(interaction, planCheck.message)
    return false
  }

  // ✅ تحقق من إعدادات السيرفر
  const enabled = await guildSystem.isEconomyEnabled(guildId)

  if (!enabled) {
    safeReply(interaction, "❌ نظام الاقتصاد معطل في هذا السيرفر")
    return false
  }

  return true
}

function safeReply(interaction, content) {
  try {
    if (interaction.replied || interaction.deferred) {
      return interaction.followUp({ content, ephemeral: true })
    } else {
      return interaction.reply({ content, ephemeral: true })
    }
  } catch (error) {
    logger.error("ECONOMY_SAFE_REPLY_FAILED", { error: error.message })
    return null
  }
}

module.exports = {
  ensureEconomyEnabled
}