const guildManager = require("../utils/guildManager")

function getSettings(guildId) {

  const guild = guildManager.getGuild(guildId)

  return {
    ai: guild.aiEnabled,
    xp: guild.xpEnabled,
    economy: guild.economyEnabled
  }

}

module.exports = {
  getSettings
}