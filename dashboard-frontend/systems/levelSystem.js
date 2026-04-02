// systems/levelSystem.js
const xpRepository = require("../repositories/xpRepository")

const xpCooldown = new Map()
const XP_COOLDOWN = 10000 // 10 seconds

async function addXP(userId, guildId) {

  const key = `${userId}_${guildId}`
  const now = Date.now()

  const last = xpCooldown.get(key)

  if (last && now - last < XP_COOLDOWN) {
    return null
  }

  xpCooldown.set(key, now)

  const userData = await xpRepository.getOrCreateXP(userId, guildId)

  if (!userData) {
    return null
  }

  userData.xp += 10

  let currentLevel = userData.level
  let requiredXP = currentLevel * 100
  let leveledUp = false

  while (userData.xp >= requiredXP) {
    userData.xp -= requiredXP
    userData.level += 1
    leveledUp = true
    currentLevel = userData.level
    requiredXP = currentLevel * 100
  }

  await xpRepository.setXP(userId, guildId, userData.xp, userData.level)

  return {
    leveledUp,
    level: userData.level
  }
}

module.exports = {
  addXP
}