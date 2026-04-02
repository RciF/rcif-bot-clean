const guildSystem = require("./guildSystem")
const loggerSystem = require("./loggerSystem")

function ensureAIEnabled(message) {

  try {

    if (!message) {
      loggerSystem.warn("AI_SYSTEM", "ensureAIEnabled called with no message")
      return false
    }

    if (!message.guild) {
      loggerSystem.warn("AI_SYSTEM", "AI request outside guild context")
      return false
    }

    const guildId = message.guild.id

    if (!guildSystem.isAIEnabled(guildId)) {
      return false
    }

    return true

  } catch (error) {

    loggerSystem.error("AI_SYSTEM", "ensureAIEnabled failed", {
      error: error.message
    })

    return false
  }
}

module.exports = {
  ensureAIEnabled
}