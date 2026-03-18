const dataManager = require("./dataManager")

function getGuild(guildId) {

  if (!guildId) return null

  const guilds = dataManager.load("guilds.json")

  if (!guilds[guildId]) {

    guilds[guildId] = {
      prefix: "/",
      aiEnabled: true,
      xpEnabled: true,
      economyEnabled: true
    }

    dataManager.save("guilds.json", guilds)
  }

  return guilds[guildId]
}

function updateGuild(guildId, data) {

  if (!guildId) return null
  if (!data || typeof data !== "object") return null

  const guilds = dataManager.load("guilds.json")

  if (!guilds[guildId]) {
    guilds[guildId] = {}
  }

  guilds[guildId] = {
    ...guilds[guildId],
    ...data
  }

  dataManager.save("guilds.json", guilds)

  return guilds[guildId]
}

module.exports = {
  getGuild,
  updateGuild
}