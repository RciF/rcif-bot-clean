/**
 * Plan Gate System — نظام قفل المميزات حسب الخطة
 * 
 * هذا النظام المركزي اللي يتحقق هل السيرفر عنده اشتراك يسمح له يستخدم ميزة معينة
 * 
 * الخطط:
 *   free     → إشراف أساسي فقط
 *   silver   → XP + اقتصاد + AI محدود
 *   gold     → كل شيء + أوامر مخصصة
 *   diamond  → كل شيء + API + بدون حدود
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
  // الميزة: الحد الأدنى للخطة المطلوبة
  moderation: "free",       // متاح للجميع
  warnings: "free",         // متاح للجميع
  serverinfo: "free",       // متاح للجميع
  userinfo: "free",         // متاح للجميع

  xp: "silver",             // يحتاج فضي+
  economy: "silver",        // يحتاج فضي+
  ai: "silver",             // يحتاج فضي+ (محدود)
  ai_unlimited: "gold",     // AI بدون حدود يحتاج ذهبي+
  
  custom_commands: "gold",   // أوامر مخصصة تحتاج ذهبي+
  advanced_stats: "gold",    // إحصائيات متقدمة تحتاج ذهبي+

  api_access: "diamond",    // API خاص يحتاج ماسي
  unlimited: "diamond",     // بدون حدود يحتاج ماسي
}

const PLAN_LIMITS = {
  free: {
    guilds: 1,
    ai_requests_per_hour: 0,
    economy_enabled: false,
    xp_enabled: false,
  },
  silver: {
    guilds: 3,
    ai_requests_per_hour: 50,
    economy_enabled: true,
    xp_enabled: true,
  },
  gold: {
    guilds: 10,
    ai_requests_per_hour: 200,
    economy_enabled: true,
    xp_enabled: true,
  },
  diamond: {
    guilds: -1, // غير محدود
    ai_requests_per_hour: -1, // غير محدود
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
//  جلب اشتراك السيرفر
// ═══════════════════════════════════════

async function getGuildSubscription(guildId) {
  try {
    if (!guildId) return { plan_id: "free", status: "inactive" }

    // تحقق من الكاش أولاً
    const cached = getCachedSubscription(guildId)
    if (cached) return cached

    // جلب من قاعدة البيانات
    // ملاحظة: هذا الجدول يربط السيرفر بصاحب الاشتراك
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

      // تحقق من انتهاء الصلاحية
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
    // في حالة الخطأ، اسمح بالاستخدام المجاني بدل ما تمنع الكل
    return { plan_id: "free", status: "inactive" }
  }
}

// ═══════════════════════════════════════
//  التحقق من الميزة
// ═══════════════════════════════════════

/**
 * تحقق هل السيرفر يقدر يستخدم ميزة معينة
 * @param {string} guildId - معرف السيرفر
 * @param {string} feature - اسم الميزة (مثل: "ai", "economy", "xp")
 * @returns {{ allowed: boolean, message: string, plan: string }}
 */
async function checkFeature(guildId, feature) {
  try {
    const subscription = await getGuildSubscription(guildId)
    const currentPlan = subscription.plan_id || "free"
    const requiredPlan = FEATURE_REQUIREMENTS[feature]

    if (!requiredPlan) {
      // ميزة غير معروفة — اسمح بها (احتياط)
      return { allowed: true, message: "", plan: currentPlan }
    }

    const currentLevel = PLAN_HIERARCHY[currentPlan] ?? 0
    const requiredLevel = PLAN_HIERARCHY[requiredPlan] ?? 0

    if (currentLevel >= requiredLevel) {
      return { allowed: true, message: "", plan: currentPlan }
    }

    // ممنوع
    const planNames = { free: "مجاني", silver: "فضي", gold: "ذهبي", diamond: "ماسي" }
    const requiredName = planNames[requiredPlan] || requiredPlan

    return {
      allowed: false,
      message: `🔒 هذه الميزة تحتاج خطة **${requiredName}** أو أعلى.\n🌐 اشترك من لوحة التحكم: https://yourdomain.com/dashboard`,
      plan: currentPlan
    }

  } catch (error) {
    logger.error("PLAN_GATE_CHECK_FAILED", { error: error.message, feature })
    // في حالة الخطأ اسمح
    return { allowed: true, message: "", plan: "free" }
  }
}

/**
 * تحقق سريع — يرجع true/false فقط
 */
async function isFeatureAllowed(guildId, feature) {
  const result = await checkFeature(guildId, feature)
  return result.allowed
}

/**
 * جلب حدود الخطة الحالية للسيرفر
 */
async function getGuildLimits(guildId) {
  const subscription = await getGuildSubscription(guildId)
  const plan = subscription.plan_id || "free"
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free
}

/**
 * جلب اسم الخطة الحالية
 */
async function getGuildPlan(guildId) {
  const subscription = await getGuildSubscription(guildId)
  return subscription.plan_id || "free"
}

// ═══════════════════════════════════════
//  Migration — جدول ربط السيرفرات بالاشتراكات
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

    // Index للبحث السريع
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
// ═══════════════════════════════════════

async function linkGuildToSubscription(guildId, ownerId) {
  try {
    // تحقق من حدود الخطة (عدد السيرفرات)
    const subscription = await databaseSystem.queryOne(`
      SELECT plan_id FROM subscriptions
      WHERE user_id = $1 AND status = 'active'
    `, [ownerId])

    if (!subscription) {
      return { success: false, message: "لا يوجد اشتراك نشط" }
    }

    const limits = PLAN_LIMITS[subscription.plan_id] || PLAN_LIMITS.free

    if (limits.guilds !== -1) {
      const countResult = await databaseSystem.queryOne(`
        SELECT COUNT(*) as count FROM guild_subscriptions
        WHERE owner_id = $1
      `, [ownerId])

      const currentCount = parseInt(countResult?.count || 0)

      if (currentCount >= limits.guilds) {
        return {
          success: false,
          message: `وصلت الحد الأقصى (${limits.guilds} سيرفر). رقّي خطتك لإضافة المزيد.`
        }
      }
    }

    await databaseSystem.query(`
      INSERT INTO guild_subscriptions (guild_id, owner_id, added_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (guild_id) DO UPDATE SET owner_id = $2, added_at = NOW()
    `, [guildId, ownerId])

    clearCache(guildId)

    return { success: true, message: "تم ربط السيرفر بالاشتراك" }

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

  // الربط
  linkGuildToSubscription,
  unlinkGuild,
  getOwnerGuilds,

  // كاش
  clearCache,

  // Migration
  createGuildSubscriptionsTable,

  // ثوابت (للاستخدام في أماكن أخرى)
  PLAN_HIERARCHY,
  FEATURE_REQUIREMENTS,
  PLAN_LIMITS
}