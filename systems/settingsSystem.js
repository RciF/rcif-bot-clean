const guildManager = require("../utils/guildManager")

async function getSettings(guildId) {
  const guild = await guildManager.getGuild(guildId)

  if (!guild) {
    return { ai: true, xp: true, economy: true }
  }

  return {
    ai: guild.aiEnabled,
    xp: guild.xpEnabled,
    economy: guild.economyEnabled
  }
}

module.exports = {
  getSettings
}