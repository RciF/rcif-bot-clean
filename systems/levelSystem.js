const xpRepository = require("../repositories/xpRepository")
const databaseSystem = require("./databaseSystem")
const scheduler = require("./schedulerSystem")

// ═══════════════════════════════════════════════════
//  XP COOLDOWN — per (userId, guildId)
//  ═════════════════════════════════════════════════
//  ⚠️ ملاحظة: هذا هو الكولداون الفعلي لكسب XP.
//   xpCooldownSystem.js كان يدوبل هذه الوظيفة لكن
//   بدون التمييز بين السيرفرات (مشكلة) — الآن نعتمد
//   على هذا فقط من messageCreate.
// ═══════════════════════════════════════════════════
const xpCooldown = new Map()
const XP_COOLDOWN = 10000 // 10 ثوانٍ
const MAX_COOLDOWN_ENTRIES = 10000 // حد أقصى للحماية من النمو غير المنتظم

// ✅ FIX: cleanup تلقائي عبر scheduler
//  (بدل ما تكبر الـ Map بدون نهاية مع الوقت)
scheduler.register(
  "xp-cooldown-cleanup",
  5 * 60 * 1000, // كل 5 دقائق
  () => {
    const now = Date.now()

    // امسح القديم اللي فات عليه أكثر من دقيقة (أي 6× الكولداون = آمن)
    for (const [key, lastTime] of xpCooldown.entries()) {
      if (now - lastTime > 60 * 1000) {
        xpCooldown.delete(key)
      }
    }

    // safety net — لو لسه كبير مع عدم نشاط، امسحه كله
    if (xpCooldown.size > MAX_COOLDOWN_ENTRIES) {
      xpCooldown.clear()
    }
  },
  false
)

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

async function addXP(userId, guildId, message) {
  // 1. جلب إعدادات السيرفر من قاعدة البيانات
  let settings = await databaseSystem.query(
    "SELECT * FROM xp_settings WHERE guild_id = $1",
    [guildId]
  ).then(res => res.rows[0]).catch(() => null)

  // 2. التحقق من القنوات المعطلة
  if (settings && settings.disabled_channels) {
    const disabledChannels = typeof settings.disabled_channels === 'string'
      ? JSON.parse(settings.disabled_channels)
      : settings.disabled_channels

    if (disabledChannels.includes(message.channel.id)) {
      return null
    }
  }

  const key = `${userId}_${guildId}`
  const now = Date.now()
  const last = xpCooldown.get(key)

  if (last && now - last < XP_COOLDOWN) {
    return null
  }

  xpCooldown.set(key, now)

  const userData = await xpRepository.getOrCreateXP(userId, guildId)
  if (!userData) return null

  // 3. تطبيق مضاعف النقاط
  const multiplier = settings ? parseFloat(settings.xp_multiplier) : 1
  const xpToAdd = Math.floor(10 * multiplier)

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

  return {
    leveledUp,
    level: userData.level,
    settings: settings
  }
}

async function getUserXPData(userId, guildId) {
  try {
    const userData = await xpRepository.getXP(userId, guildId)
    if (!userData) return null

    // حساب الإجمالي التراكمي
    let totalXP = 0
    for (let lvl = 1; lvl < userData.level; lvl++) {
      totalXP += lvl * 100
    }
    totalXP += userData.xp

    const currentXP = userData.xp
    const requiredXP = userData.level * 100
    const progressPercent = Math.floor((currentXP / requiredXP) * 100)

    // جلب الترتيب
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
    console.error("[LEVEL_SYSTEM] getUserXPData failed:", error.message)
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
    console.error("[LEVEL_SYSTEM] getLeaderboard failed:", error.message)
    return []
  }
}

module.exports = {
  addXP,
  getUserXPData,
  getLeaderboard,
  calculateLevelFromXP
}