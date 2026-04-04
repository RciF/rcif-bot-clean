const guildManager = require("../utils/guildManager")

// ✅ FIX: all functions are now async and await guildManager
async function isAIEnabled(guildId) {
  const guild = await guildManager.getGuild(guildId)
  if (!guild) return true
  return guild.aiEnabled === true
}

async function isXPEnabled(guildId) {
  const guild = await guildManager.getGuild(guildId)
  if (!guild) return true
  return guild.xpEnabled === true
}

async function isEconomyEnabled(guildId) {
  const guild = await guildManager.getGuild(guildId)
  if (!guild) return true
  return guild.economyEnabled === true
}

module.exports = {
  isAIEnabled,
  isXPEnabled,
  isEconomyEnabled
}