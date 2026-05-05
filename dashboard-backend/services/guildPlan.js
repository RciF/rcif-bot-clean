/**
 * ═══════════════════════════════════════════════════════════
 *  Guild Plan Service
 *  جلب خطة السيرفر مع caching
 * ═══════════════════════════════════════════════════════════
 */

const { query } = require("../config/database")
const env = require("../config/env")

// Cache في الذاكرة
const cache = new Map()

/**
 * جلب خطة سيرفر معين
 *
 * @param {string} guildId
 * @returns {Promise<string>} plan_id ('free' | 'silver' | 'gold' | 'diamond')
 */
async function getGuildPlan(guildId) {
  const cached = cache.get(guildId)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.plan
  }

  try {
    const r = await query(
      `SELECT s.plan_id, s.status, s.expires_at
       FROM guild_subscriptions gs
       JOIN subscriptions s ON s.user_id = gs.owner_id
       WHERE gs.guild_id = $1
       LIMIT 1`,
      [guildId],
    )

    let plan = "free"
    if (r.rows.length > 0) {
      const sub = r.rows[0]
      const isActive = sub.status === "active"
      const notExpired = !sub.expires_at || new Date(sub.expires_at) > new Date()
      if (isActive && notExpired) {
        plan = sub.plan_id
      }
    }

    cache.set(guildId, {
      plan,
      expiresAt: Date.now() + env.CACHE_GUILD_PLAN,
    })

    return plan
  } catch (err) {
    console.error(`[GUILD_PLAN] Failed for ${guildId}:`, err.message)
    return "free"
  }
}

/**
 * إبطال cache لسيرفر معين (بعد تغيير الاشتراك)
 */
function invalidateGuildPlan(guildId) {
  cache.delete(guildId)
}

// ═══════════════════════════════════════════════════════════
//  تنظيف cache دوري
//  ✅ FIX: حفظ id + .unref() عشان graceful shutdown
// ═══════════════════════════════════════════════════════════

const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [k, v] of cache.entries()) {
    if (now > v.expiresAt) cache.delete(k)
  }
}, 60 * 1000)

// ✅ unref حتى لا يمنع process exit
cleanupInterval.unref?.()

/**
 * إيقاف cache cleanup interval
 * يستخدم في graceful shutdown
 */
function stopCacheCleanup() {
  clearInterval(cleanupInterval)
}

module.exports = {
  getGuildPlan,
  invalidateGuildPlan,
  stopCacheCleanup,
}