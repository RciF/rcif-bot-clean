const guildManager = require("../utils/guildManager")

function isAIEnabled(guildId) {

  const guild = guildManager.getGuild(guildId)
  return guild.aiEnabled === true

}

function isXPEnabled(guildId) {

  const guild = guildManager.getGuild(guildId)
  return guild.xpEnabled === true

}

function isEconomyEnabled(guildId) {

  const guild = guildManager.getGuild(guildId)
  return guild.economyEnabled === true

}

module.exports = {
  isAIEnabled,
  isXPEnabled,
  isEconomyEnabled
}