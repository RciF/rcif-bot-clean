const guildRepository = require("../repositories/guildRepository")

// ✅ FIX: field name mapping — config uses camelCase, DB uses snake_case
const FIELD_MAP = {
  aiEnabled: "ai_enabled",
  xpEnabled: "xp_enabled",
  economyEnabled: "economy_enabled"
}

async function getGuild(guildId) {
  if (!guildId) return null

  const guild = await guildRepository.getOrCreateGuild(guildId)

  if (!guild) return null

  // ✅ normalize field names for the system
  return {
    id: guild.id,
    aiEnabled: guild.ai_enabled !== false,
    xpEnabled: guild.xp_enabled !== false,
    economyEnabled: guild.economy_enabled !== false
  }
}

async function updateGuild(guildId, data) {
  if (!guildId || !data) return null

  let result = null

  for (const key in data) {
    const dbField = FIELD_MAP[key]
    if (!dbField) continue

    result = await guildRepository.updateGuildSetting(guildId, dbField, data[key])
  }

  return result
}

module.exports = {
  getGuild,
  updateGuild
}