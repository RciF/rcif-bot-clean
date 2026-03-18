const guildSystem = require("./guildSystem")

function ensureXPEnabled(message) {
  if (!message || !message.guild) {
    return false
  }

  const enabled = guildSystem.isXPEnabled(message.guild.id)

  if (!enabled) {
    return false
  }

  return true
}

module.exports = {
  ensureXPEnabled
}