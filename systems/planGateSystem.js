/**
 * Plan Gate System — نظام قفل المميزات حسب الخطة
 * 
 * القاعدة الأساسية: اشتراك واحد = سيرفر واحد فقط
 * يبي سيرفر ثاني = اشتراك ثاني
 * 
 * الخطط:
 *   free     → إشراف أساسي فقط
 *   silver   → XP + اقتصاد + AI محدود
 *   gold     → كل شيء + أوامر مخصصة
 *   diamond  → كل شيء + API + حدود أعلى
 */

const databaseSystem = require("./databaseSystem")
const logger = require("./loggerSystem")

// ═══════════════════════════════════════
//  تعريف الخطط والمميزات
// ═══════════════════════════════════════

const PLAN_HIERARCHY = {
  free: 0,
  silver: 1,
  gold: 2,
  diamond: 3
}

const FEATURE_REQUIREMENTS = {
  moderation: "free",
  warnings: "free",
  serverinfo: "free",
  userinfo: "free",

  xp: "silver",
  economy: "silver",
  ai: "gold",
  ai_creative: "diamond",

  custom_commands: "gold",
  advanced_stats: "gold",

  api_access: "diamond",
}

// ═══════════════════════════════════════
//  ⚠️ القاعدة الأساسية: كل اشتراك = سيرفر واحد فقط
//  يبي سيرفر ثاني = يشترك مرة ثانية
// ═══════════════════════════════════════

const PLAN_LIMITS = {
  free: {
    guilds: 1,
    ai_mention_per_day: 0,
    ai_command_per_day: 0,
    ai_creative_per_day: 0,
    economy_enabled: false,
    xp_enabled: false,
  },
  silver: {
    guilds: 1,
    ai_mention_per_day: 0,
    ai_command_per_day: 0,
    ai_creative_per_day: 0,
    economy_enabled: true,
    xp_enabled: true,
  },
  gold: {
    guilds: 1,
    ai_mention_per_day: 200,
    ai_command_per_day: 100,
    ai_creative_per_day: 0,
    economy_enabled: true,
    xp_enabled: true,
  },
  diamond: {
    guilds: 1,
    ai_mention_per_day: 500,
    ai_command_per_day: 200,
    ai_creative_per_day: 50,
    economy_enabled: true,
    xp_enabled: true,
  }
}

// ═══════════════════════════════════════
//  كاش الاشتراكات (تقليل ضغط DB)
// ═══════════════════════════════════════

const subscriptionCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 دقائق

function getCachedSubscription(guildId) {
  const cached = subscriptionCache.get(guildId)
  if (!cached) return null
  if (Date.now() - cached.time > CACHE_TTL) {
    subscriptionCache.delete(guildId)
    return null
  }
  return cached.data
}

function setCachedSubscription(guildId, data) {
  subscriptionCache.set(guildId, { data, time: Date.now() })
}

function clearCache(guildId) {
  if (guildId) {
    subscriptionCache.delete(guildId)
  } else {
    subscriptionCache.clear()
  }
}

// ═══════════════════════════════════════
//  حد يومي لرسائل AI لكل سيرفر
// ═══════════════════════════════════════

const aiDailyUsage = new Map()

function getToday() {
  return new Date().toISOString().slice(0, 10) // "2026-04-08"
}

function getAIUsage(guildId, type = "mention") {
  const key = `${guildId}:${type}:${getToday()}`
  return aiDailyUsage.get(key) || 0
}

function incrementAIUsage(guildId, type = "mention") {
  const key = `${guildId}:${type}:${getToday()}`
  const current = aiDailyUsage.get(key) || 0
  aiDailyUsage.set(key, current + 1)

  // تنظيف الأيام القديمة
  const today = getToday()
  for (const [k] of aiDailyUsage) {
    if (!k.endsWith(today)) {
      aiDailyUsage.delete(k)
    }
  }

  return current + 1
}

/**
 * تحقق هل السيرفر يقدر يستخدم AI (حسب الحد اليومي)
 * @returns {{ allowed: boolean, remaining: number, limit: number, message: string }}
 */
async function checkAILimit(guildId, type = "mention") {
  try {
    const subscription = await getGuildSubscription(guildId)
    const plan = subscription.plan_id || "free"
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free

    // تحديد الحد حسب نوع الطلب
    let dailyLimit = 0
    let limitKey = ""

    if (type === "creative") {
      dailyLimit = limits.ai_creative_per_day
      limitKey = "creative"
    } else if (type === "command") {
      dailyLimit = limits.ai_command_per_day
      limitKey = "command"
    } else {
      dailyLimit = limits.ai_mention_per_day
      limitKey = "mention"
    }

    if (dailyLimit === 0) {
      const messages = {
        creative: "🔒 النموذج الإبداعي متاح للخطة الماسية فقط.",
        command: "🔒 أمر /ذكاء يحتاج اشتراك ذهبي أو أعلى.",
        mention: "🔒 الذكاء الاصطناعي يحتاج اشتراك ذهبي أو أعلى."
      }
      return {
        allowed: false,
        remaining: 0,
        limit: 0,
        message: messages[limitKey]
      }
    }

    const used = getAIUsage(guildId, limitKey)
    const remaining = Math.max(0, dailyLimit - used)

    if (used >= dailyLimit) {
      return {
        allowed: false,
        remaining: 0,
        limit: dailyLimit,
        message: `⚠️ وصلتوا الحد اليومي (${dailyLimit} رسالة). العداد يتجدد بكرة.`
      }
    }

    return {
      allowed: true,
      remaining,
      limit: dailyLimit,
      message: ""
    }
  } catch (error) {
    logger.error("AI_LIMIT_CHECK_FAILED", { error: error.message })
    return { allowed: true, remaining: 999, limit: 999, message: "" }
  }
}

/**
 * سجّل استخدام رسالة AI (يُستدعى بعد كل رد ناجح)
 */
function recordAIUsage(guildId, type = "mention") {
  return incrementAIUsage(guildId, type)
}

/**
 * جلب إحصائيات AI لسيرفر معين
 */
async function getAIStats(guildId) {
  const subscription = await getGuildSubscription(guildId)
  const plan = subscription.plan_id || "free"
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free

  const mentionUsed = getAIUsage(guildId, "mention")
  const commandUsed = getAIUsage(guildId, "command")
  const creativeUsed = getAIUsage(guildId, "creative")

  const totalUsed = mentionUsed + commandUsed + creativeUsed
  const totalLimit = limits.ai_mention_per_day + limits.ai_command_per_day + limits.ai_creative_per_day

  return {
    used: totalUsed,
    limit: totalLimit,
    remaining: Math.max(0, totalLimit - totalUsed),
    breakdown: {
      mention: { used: mentionUsed, limit: limits.ai_mention_per_day },
      command: { used: commandUsed, limit: limits.ai_command_per_day },
      creative: { used: creativeUsed, limit: limits.ai_creative_per_day }
    },
    plan,
    resetDate: getToday()
  }
}

// ═══════════════════════════════════════
//  جلب اشتراك السيرفر
// ═══════════════════════════════════════

async function getGuildSubscription(guildId) {
  try {
    if (!guildId) return { plan_id: "free", status: "inactive" }

    const cached = getCachedSubscription(guildId)
    if (cached) return cached

    const result = await databaseSystem.query(`
      SELECT gs.guild_id, s.plan_id, s.status, s.expires_at
      FROM guild_subscriptions gs
      JOIN subscriptions s ON s.user_id = gs.owner_id
      WHERE gs.guild_id = $1
      AND s.status = 'active'
      LIMIT 1
    `, [guildId])

    let subscription

    if (!result.rows || result.rows.length === 0) {
      subscription = { plan_id: "free", status: "inactive", expires_at: null }
    } else {
      const row = result.rows[0]

      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        subscription = { plan_id: "free", status: "expired", expires_at: row.expires_at }
      } else {
        subscription = {
          plan_id: row.plan_id,
          status: row.status,
          expires_at: row.expires_at
        }
      }
    }

    setCachedSubscription(guildId, subscription)
    return subscription

  } catch (error) {
    logger.error("PLAN_GATE_GET_SUBSCRIPTION_FAILED", { error: error.message })
    return { plan_id: "free", status: "inactive" }
  }
}

// ═══════════════════════════════════════
//  التحقق من الميزة
// ═══════════════════════════════════════

async function checkFeature(guildId, feature) {
  try {
    const subscription = await getGuildSubscription(guildId)
    const currentPlan = subscription.plan_id || "free"
    const requiredPlan = FEATURE_REQUIREMENTS[feature]

    if (!requiredPlan) {
      return { allowed: true, message: "", plan: currentPlan }
    }

    const currentLevel = PLAN_HIERARCHY[currentPlan] ?? 0
    const requiredLevel = PLAN_HIERARCHY[requiredPlan] ?? 0

    if (currentLevel >= requiredLevel) {
      return { allowed: true, message: "", plan: currentPlan }
    }

    const planNames = { free: "مجاني", silver: "فضي", gold: "ذهبي", diamond: "ماسي" }
    const requiredName = planNames[requiredPlan] || requiredPlan

    return {
      allowed: false,
      message: `🔒 هذه الميزة تحتاج خطة **${requiredName}** أو أعلى.\n🌐 اشترك من لوحة التحكم.`,
      plan: currentPlan
    }

  } catch (error) {
    logger.error("PLAN_GATE_CHECK_FAILED", { error: error.message, feature })
    return { allowed: true, message: "", plan: "free" }
  }
}

async function isFeatureAllowed(guildId, feature) {
  const result = await checkFeature(guildId, feature)
  return result.allowed
}

async function getGuildLimits(guildId) {
  const subscription = await getGuildSubscription(guildId)
  const plan = subscription.plan_id || "free"
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free
}

async function getGuildPlan(guildId) {
  const subscription = await getGuildSubscription(guildId)
  return subscription.plan_id || "free"
}

// ═══════════════════════════════════════
//  Migration
// ═══════════════════════════════════════

async function createGuildSubscriptionsTable() {
  try {
    await databaseSystem.query(`
      CREATE TABLE IF NOT EXISTS guild_subscriptions (
        guild_id  TEXT NOT NULL,
        owner_id  TEXT NOT NULL,
        added_at  TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (guild_id)
      );
    `)

    await databaseSystem.query(`
      CREATE INDEX IF NOT EXISTS idx_guild_sub_owner
      ON guild_subscriptions (owner_id);
    `)

    logger.success("GUILD_SUBSCRIPTIONS_TABLE_READY")
  } catch (error) {
    logger.error("GUILD_SUBSCRIPTIONS_MIGRATION_FAILED", { error: error.message })
  }
}

// ═══════════════════════════════════════
//  ربط/فك سيرفر باشتراك
//  ⚠️ القاعدة: اشتراك واحد = سيرفر واحد فقط
// ═══════════════════════════════════════

async function linkGuildToSubscription(guildId, ownerId) {
  try {
    const subscription = await databaseSystem.queryOne(`
      SELECT plan_id FROM subscriptions
      WHERE user_id = $1 AND status = 'active'
    `, [ownerId])

    if (!subscription) {
      return { success: false, message: "لا يوجد اشتراك نشط. اشترك أولاً." }
    }

    // ⚠️ تحقق: هل عنده سيرفر مربوط بالفعل؟
    const existingGuild = await databaseSystem.queryOne(`
      SELECT guild_id FROM guild_subscriptions
      WHERE owner_id = $1
    `, [ownerId])

    if (existingGuild && existingGuild.guild_id !== guildId) {
      return {
        success: false,
        message: "⚠️ اشتراكك مربوط بسيرفر آخر. فك الربط أولاً أو اشترك اشتراك جديد لهذا السيرفر."
      }
    }

    await databaseSystem.query(`
      INSERT INTO guild_subscriptions (guild_id, owner_id, added_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (guild_id) DO UPDATE SET owner_id = $2, added_at = NOW()
    `, [guildId, ownerId])

    clearCache(guildId)

    return { success: true, message: "تم ربط السيرفر بالاشتراك ✅" }

  } catch (error) {
    logger.error("LINK_GUILD_FAILED", { error: error.message })
    return { success: false, message: "حدث خطأ" }
  }
}

async function unlinkGuild(guildId) {
  try {
    await databaseSystem.query(`
      DELETE FROM guild_subscriptions WHERE guild_id = $1
    `, [guildId])

    clearCache(guildId)
    return { success: true }
  } catch (error) {
    logger.error("UNLINK_GUILD_FAILED", { error: error.message })
    return { success: false }
  }
}

async function getOwnerGuilds(ownerId) {
  try {
    const result = await databaseSystem.query(`
      SELECT guild_id, added_at FROM guild_subscriptions
      WHERE owner_id = $1
      ORDER BY added_at DESC
    `, [ownerId])

    return result.rows || []
  } catch (error) {
    logger.error("GET_OWNER_GUILDS_FAILED", { error: error.message })
    return []
  }
}

// ═══════════════════════════════════════
//  تصدير
// ═══════════════════════════════════════

module.exports = {
  // التحقق
  checkFeature,
  isFeatureAllowed,
  getGuildLimits,
  getGuildPlan,
  getGuildSubscription,

  // AI حدود يومية
  checkAILimit,
  recordAIUsage,
  getAIStats,

  // الربط
  linkGuildToSubscription,
  unlinkGuild,
  getOwnerGuilds,

  // كاش
  clearCache,

  // Migration
  createGuildSubscriptionsTable,

  // ثوابت
  PLAN_HIERARCHY,
  FEATURE_REQUIREMENTS,
  PLAN_LIMITS
}