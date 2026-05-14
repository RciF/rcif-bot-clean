// ══════════════════════════════════════════════════════════════════
//  AutoMod Handler
//  المسار: events/handlers/automodHandler.js
//
//  يُستدعى من messageCreate.js بعد Anti-Spam وقبل AI
// ══════════════════════════════════════════════════════════════════

const automodSystem = require("../../systems/automodSystem")
const logger = require("../../systems/loggerSystem")

async function handleAutoMod(message) {
  try {
    await automodSystem.checkMessage(message)
  } catch (err) {
    logger.error("AUTOMOD_HANDLER_FAILED", { error: err.message })
  }
}

module.exports = { handleAutoMod }