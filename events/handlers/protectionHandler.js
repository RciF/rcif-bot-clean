// ══════════════════════════════════════════════════════════════════
//  Protection Handler — anti-spam check
// ══════════════════════════════════════════════════════════════════

const protectionSystem = require("../../systems/protectionSystem")
const logger = require("../../systems/loggerSystem")

async function handleProtection(message) {
  try {
    await protectionSystem.checkSpam(message)
  } catch (err) {
    logger.error("ANTISPAM_CHECK_FAILED", { error: err.message })
  }
}

module.exports = { handleProtection }