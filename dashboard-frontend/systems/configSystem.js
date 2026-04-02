const guildManager = require("../utils/guildManager")

function updateSystem(guildId, system, enabled) {

  let update = {}

  if (system === "ai") update.aiEnabled = enabled
  if (system === "xp") update.xpEnabled = enabled
  if (system === "economy") update.economyEnabled = enabled

  if (Object.keys(update).length === 0) return false

  return guildManager.updateGuild(guildId, update)
}

module.exports = {
  updateSystem
}