// ══════════════════════════════════════════════════════════════════
//  LEVEL SYSTEM
//  المسار: systems/levelSystem.js
//
//  يحترم بالكامل إعدادات xp_settings من الداش:
//   - enabled
//   - min_xp_per_message / max_xp_per_message
//   - cooldown (بالثواني)
//   - xp_multiplier (global)
//   - disabled_channels (JSONB array)
//   - disabled_roles (JSONB array)
//   - multipliers (JSONB array of {type, target_id, value})
//   - role_rewards (JSONB array of {level, role_id, type})
// ══════════════════════════════════════════════════════════════════

const xpRepository = require("../repositories/xpRepository")
const databaseSystem = require("./databaseSystem")
const scheduler = require("./schedulerSystem")
const logger = require("./loggerSystem")

// ───────────────────────────────────────────────────────────────────
//  XP COOLDOWN — per (userId, guildId)
// ───────────────────────────────────────────────────────────────────

const xpCooldown = new Map()
const DEFAULT_COOLDOWN_MS = 60 * 1000 // 60s default (يطابق الفرونت)
const MAX_COOLDOWN_ENTRIES = 10000

scheduler.register(
  "xp-cooldown-cleanup",
  5 * 60 * 1000,
  () => {
    const now = Date.now()
    for (const [key, lastTime] of xpCooldown.entries()) {
      // امسح أي entry فات عليه أكثر من 10 دقائق (آمن لأي cooldown معقول)
      if (now - lastTime > 10 * 60 * 1000) {
        xpCooldown.delete(key)
      }
    }
    if (xpCooldown.size > MAX_COOLDOWN_ENTRIES) {
      xpCooldown.clear()
    }
  },
  false
)

// ───────────────────────────────────────────────────────────────────
//  Helpers
// ───────────────────────────────────────────────────────────────────

function parseJsonArray(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function randomInt(min, max) {
  if (max < min) [min, max] = [max, min]
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function calculateLevelFromXP(totalXP) {
  let xp = totalXP
  let level = 1
  while (true) {
    const required = level * 100
    if (xp < required) break
    xp -= required
    level++
  }
  const currentXP = xp
  const requiredXP = level * 100
  const progressPercent = Math.floor((currentXP / requiredXP) * 100)
  return { level, currentXP, requiredXP, totalXP, progressPercent }
}

// ───────────────────────────────────────────────────────────────────
//  Settings loader
// ───────────────────────────────────────────────────────────────────

async function getSettings(guildId) {
  try {
    const result = await databaseSystem.query(
      "SELECT * FROM xp_settings WHERE guild_id = $1",
      [guildId]
    )
    return result.rows[0] || null
  } catch (error) {
    logger.error("XP_SETTINGS_LOAD_FAILED", { error: error.message })
    return null
  }
}

// ───────────────────────────────────────────────────────────────────
//  Check if user/channel is excluded from XP
// ───────────────────────────────────────────────────────────────────

function isExcluded(message, settings) {
  if (!settings) return false

  // disabled_channels
  const disabledChannels = parseJsonArray(settings.disabled_channels)
  if (disabledChannels.includes(message.channel.id)) return true
  // دعم تصنيفات (parent category)
  if (message.channel.parentId && disabledChannels.includes(message.channel.parentId)) {
    return true
  }

  // disabled_roles
  const disabledRoles = parseJsonArray(settings.disabled_roles)
  if (disabledRoles.length > 0 && message.member?.roles?.cache) {
    for (const roleId of disabledRoles) {
      if (message.member.roles.cache.has(roleId)) return true
    }
  }

  return false
}

// ───────────────────────────────────────────────────────────────────
//  Calculate effective XP multiplier
//  multipliers entries: { type: 'channel' | 'role', target_id, value }
// ───────────────────────────────────────────────────────────────────

function calculateMultiplier(message, settings) {
  let mult = settings?.xp_multiplier ? parseFloat(settings.xp_multiplier) : 1
  if (!isFinite(mult) || mult <= 0) mult = 1

  const customMults = parseJsonArray(settings?.multipliers)
  if (customMults.length === 0) return mult

  for (const entry of customMults) {
    if (!entry || !entry.target_id || !entry.value) continue
    const value = parseFloat(entry.value)
    if (!isFinite(value) || value <= 0) continue

    if (entry.type === "channel") {
      if (
        message.channel.id === entry.target_id ||
        message.channel.parentId === entry.target_id
      ) {
        mult *= value
      }
    } else if (entry.type === "role") {
      if (message.member?.roles?.cache?.has(entry.target_id)) {
        mult *= value
      }
    }
  }

  return mult
}

// ───────────────────────────────────────────────────────────────────
//  Apply role rewards on level-up
//  role_rewards entries: { level: number, role_id: string, type?: 'add'|'replace' }
// ───────────────────────────────────────────────────────────────────

async function applyRoleRewards(message, settings, oldLevel, newLevel) {
  const rewards = parseJsonArray(settings?.role_rewards)
  if (rewards.length === 0) return []

  // كل level وصل له العضو من oldLevel+1 إلى newLevel
  const reachedLevels = []
  for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
    reachedLevels.push(lvl)
  }
  if (reachedLevels.length === 0) return []

  const grantedRoles = []
  const member = message.member
  if (!member) return []

  // اجمع كل الأدوار اللي العضو يستحقها بناءً على المستوى الجديد
  const eligibleRewards = rewards.filter(r => {
    if (!r || !r.role_id) return false
    const lvl = parseInt(r.level)
    return isFinite(lvl) && lvl <= newLevel
  })

  // وضع 'replace' — اشيل الأدوار القديمة المرتبطة بمستويات أقل
  const replaceMode = eligibleRewards.some(r => r.type === "replace")
  if (replaceMode) {
    const lowerRewards = rewards.filter(r => {
      const lvl = parseInt(r.level)
      return isFinite(lvl) && lvl < newLevel && r.role_id
    })
    for (const r of lowerRewards) {
      if (member.roles.cache.has(r.role_id)) {
        try {
          await member.roles.remove(r.role_id, "XP role reward replace")
        } catch (err) {
          logger.error("ROLE_REWARD_REMOVE_FAILED", {
            error: err.message,
            role_id: r.role_id
          })
        }
      }
    }
  }

  // اضف الأدوار اللي وصل لها الآن (لو مش موجودة)
  for (const r of eligibleRewards) {
    const lvl = parseInt(r.level)
    // امنح فقط الأدوار اللي مستواها ضمن المستويات اللي وصل لها الآن
    if (!reachedLevels.includes(lvl)) continue
    if (member.roles.cache.has(r.role_id)) continue
    try {
      await member.roles.add(r.role_id, `XP reward لمستوى ${lvl}`)
      grantedRoles.push({ level: lvl, role_id: r.role_id })
    } catch (err) {
      logger.error("ROLE_REWARD_ADD_FAILED", {
        error: err.message,
        role_id: r.role_id,
        level: lvl
      })
    }
  }

  return grantedRoles
}

// ───────────────────────────────────────────────────────────────────
//  addXP — main entry
// ───────────────────────────────────────────────────────────────────

async function addXP(userId, guildId, message) {
  // 1) جلب الإعدادات
  const settings = await getSettings(guildId)

  // 2) فحص exclusions (channel/role)
  if (isExcluded(message, settings)) return null

  // 3) Cooldown (يحترم settings.cooldown بالثواني)
  const cooldownMs = settings?.cooldown
    ? Math.max(0, parseInt(settings.cooldown)) * 1000
    : DEFAULT_COOLDOWN_MS

  const key = `${userId}_${guildId}`
  const now = Date.now()
  const last = xpCooldown.get(key)
  if (last && now - last < cooldownMs) return null
  xpCooldown.set(key, now)

  // 4) جلب/إنشاء بيانات العضو
  const userData = await xpRepository.getOrCreateXP(userId, guildId)
  if (!userData) return null

  // 5) حساب XP العشوائي حسب min/max
  const minXp = settings?.min_xp_per_message
    ? parseInt(settings.min_xp_per_message)
    : 15
  const maxXp = settings?.max_xp_per_message
    ? parseInt(settings.max_xp_per_message)
    : 25
  const baseXp = randomInt(
    isFinite(minXp) && minXp >= 0 ? minXp : 15,
    isFinite(maxXp) && maxXp >= 0 ? maxXp : 25
  )

  // 6) تطبيق المضاعف (global + per-channel/role)
  const multiplier = calculateMultiplier(message, settings)
  const xpToAdd = Math.max(1, Math.floor(baseXp * multiplier))

  // 7) إضافة XP وحساب الترقيات
  const oldLevel = userData.level
  userData.xp += xpToAdd

  let currentLevel = userData.level
  let requiredXP = currentLevel * 100
  let leveledUp = false

  while (userData.xp >= requiredXP && requiredXP > 0) {
    userData.xp -= requiredXP
    userData.level += 1
    leveledUp = true
    currentLevel = userData.level
    requiredXP = currentLevel * 100
  }

  if (userData.xp < 0) userData.xp = 0

  await xpRepository.setXP(userId, guildId, userData.xp, userData.level)

  // 8) منح role rewards عند الترقية
  let grantedRoles = []
  if (leveledUp) {
    try {
      grantedRoles = await applyRoleRewards(message, settings, oldLevel, userData.level)
    } catch (err) {
      logger.error("ROLE_REWARDS_APPLY_FAILED", { error: err.message })
    }
  }

  return {
    leveledUp,
    level: userData.level,
    oldLevel,
    xpAdded: xpToAdd,
    multiplier,
    grantedRoles,
    settings
  }
}

// ───────────────────────────────────────────────────────────────────
//  User XP data + rank
// ───────────────────────────────────────────────────────────────────

async function getUserXPData(userId, guildId) {
  try {
    const userData = await xpRepository.getXP(userId, guildId)
    if (!userData) return null

    let totalXP = 0
    for (let lvl = 1; lvl < userData.level; lvl++) {
      totalXP += lvl * 100
    }
    totalXP += userData.xp

    const currentXP = userData.xp
    const requiredXP = userData.level * 100
    const progressPercent = Math.floor((currentXP / requiredXP) * 100)

    const rankResult = await databaseSystem.query(
      `SELECT COUNT(*) + 1 as rank FROM xp
       WHERE guild_id = $1
       AND (level > $2 OR (level = $2 AND xp > $3))`,
      [guildId, userData.level, userData.xp]
    )
    const rank = parseInt(rankResult.rows[0]?.rank || 1)

    return {
      level: userData.level,
      currentXP,
      requiredXP,
      totalXP,
      progressPercent,
      rank
    }
  } catch (error) {
    logger.error("LEVEL_GET_USER_XP_FAILED", { error: error.message })
    return null
  }
}

// ───────────────────────────────────────────────────────────────────
//  Leaderboard
// ───────────────────────────────────────────────────────────────────

async function getLeaderboard(guildId, limit = 10) {
  try {
    const result = await databaseSystem.query(
      `SELECT user_id, xp, level FROM xp
       WHERE guild_id = $1
       ORDER BY level DESC, xp DESC
       LIMIT $2`,
      [guildId, limit]
    )

    return (result.rows || []).map(row => {
      let totalXP = 0
      for (let lvl = 1; lvl < row.level; lvl++) {
        totalXP += lvl * 100
      }
      totalXP += row.xp
      return {
        user_id: row.user_id,
        level: row.level,
        xp: totalXP
      }
    })
  } catch (error) {
    logger.error("LEVEL_LEADERBOARD_FAILED", { error: error.message })
    return []
  }
}

module.exports = {
  addXP,
  getUserXPData,
  getLeaderboard,
  calculateLevelFromXP,
  getSettings
}