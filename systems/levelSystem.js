const xpRepository = require("../repositories/xpRepository")
const databaseSystem = require("./databaseSystem")

const xpCooldown = new Map()
const XP_COOLDOWN = 10000

async function addXP(userId, guildId) {
  const key = `${userId}_${guildId}`
  const now = Date.now()
  const last = xpCooldown.get(key)

  if (last && now - last < XP_COOLDOWN) return null
  xpCooldown.set(key, now)

  const userData = await xpRepository.getOrCreateXP(userId, guildId)
  if (!userData) return null

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

  return { leveledUp, level: userData.level }
}

function calculateLevelFromXP(totalXP) {
  let level = 1
  let remaining = totalXP

  while (remaining >= level * 100) {
    remaining -= level * 100
    level++
  }

  return {
    level,
    currentXP: remaining,
    requiredXP: level * 100
  }
}

async function getUserXPData(userId, guildId) {
  try {
    const data = await xpRepository.getOrCreateXP(userId, guildId)
    if (!data) return null

    // جلب الترتيب
    const rankResult = await databaseSystem.query(
      `SELECT COUNT(*) + 1 as rank FROM xp 
       WHERE guild_id = $1 AND (xp > $2 OR (xp = $2 AND level > $3))`,
      [guildId, data.xp, data.level]
    )
    const rank = parseInt(rankResult.rows[0]?.rank || 1)

    // حساب إجمالي XP
    let totalXP = 0
    for (let i = 1; i < data.level; i++) {
      totalXP += i * 100
    }
    totalXP += data.xp

    const requiredXP = data.level * 100
    const progressPercent = Math.floor((data.xp / requiredXP) * 100)

    return {
      xp: data.xp,
      level: data.level,
      totalXP,
      currentXP: data.xp,
      requiredXP,
      progressPercent,
      rank
    }
  } catch {
    return null
  }
}

async function getLeaderboard(guildId, limit = 10) {
  try {
    const result = await databaseSystem.query(
      `SELECT user_id, xp, level FROM xp 
       WHERE guild_id = $1 
       ORDER BY level DESC, xp DESC 
       LIMIT $2`,
      [guildId, limit]
    )

    return result.rows.map(row => {
      let totalXP = 0
      for (let i = 1; i < row.level; i++) totalXP += i * 100
      totalXP += row.xp

      return { ...row, totalXP }
    })
  } catch {
    return []
  }
}

module.exports = {
  addXP,
  getUserXPData,
  getLeaderboard,
  calculateLevelFromXP
}