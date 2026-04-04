const guildManager = require("../utils/guildManager")
const logger = require("./loggerSystem")

async function updateSystem(guildId, system, enabled) {
  try {
    let update = {}

    if (system === "ai") update.aiEnabled = enabled
    if (system === "xp") update.xpEnabled = enabled
    if (system === "economy") update.economyEnabled = enabled

    if (Object.keys(update).length === 0) {
      logger.warn("CONFIG_INVALID_SYSTEM", { system })
      return false
    }

    await guildManager.updateGuild(guildId, update)
    return true

  } catch (error) {
    logger.error("CONFIG_UPDATE_FAILED", { error: error.message })
    return false
  }
}

module.exports = {
  updateSystem
}