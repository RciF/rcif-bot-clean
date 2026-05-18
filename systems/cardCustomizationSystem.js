// ══════════════════════════════════════════════════════════════════
//  CARD CUSTOMIZATION SYSTEM v2.0
//  المسار: systems/cardCustomizationSystem.js
//
//  نظام تخصيص بطاقة المستوى — 3 فئات (basic/advanced/legendary)
//
//  الجداول المستخدمة (تنشأ في migration 031):
//   - card_subscriptions          : الاشتراك الحالي
//   - card_settings               : الإعدادات الموسّعة
//   - card_subscription_requests  : الطلبات
//   - card_subscription_logs      : سجل الأحداث
//
//  ⚠️ هذا الملف يحل محل النسخة القديمة بالكامل
//  ⚠️ الدوال القديمة (isPremium, getCustomization, saveCustomization,
//      resetCustomization, getTheme, isValidImageUrl, activatePremium,
//      revokePremium) ما زالت موجودة للتوافق مع الكود القديم
// ══════════════════════════════════════════════════════════════════

const databaseSystem = require("./databaseSystem")
const logger = require("./loggerSystem")
const cardAssets = require("../config/cardAssets")

// ══════════════════════════════════════════════════════════════════
//  TIER FEATURES
//  يجب أن تتطابق مع dashboard-backend/config/cardPlans.js
// ══════════════════════════════════════════════════════════════════

const TIER_FEATURES = {
  free: {
    presetBackgrounds: 0,
    presetThemes: 1,
    customBackground: false,
    customColorPicker: false,
    animatedBackgrounds: false,
    badges: 0,
    effects: 0,
    legendaryBadge: false,
  },
  basic: {
    presetBackgrounds: 10,
    presetThemes: 5,
    customBackground: false,
    customColorPicker: false,
    animatedBackgrounds: false,
    badges: 1,
    effects: 0,
    legendaryBadge: false,
  },
  advanced: {
    presetBackgrounds: 15,
    presetThemes: 12,
    customBackground: true,
    customColorPicker: true,
    animatedBackgrounds: false,
    badges: 5,
    effects: 2,
    legendaryBadge: false,
  },
  legendary: {
    presetBackgrounds: 15,
    presetThemes: 12,
    customBackground: true,
    customColorPicker: true,
    animatedBackgrounds: true,
    badges: 10,
    effects: 6,
    legendaryBadge: true,
  },
}

const TIER_ORDER = ["free", "basic", "advanced", "legendary"]

// ─── ثيمات الألوان القديمة (للتوافق مع rankCardSystem الحالي) ───
const PRESET_THEMES = {
  amber:   { accent: "#f59e0b", secondary: "#fbbf24", bg: "#0d1117", bgCard: "#161b22" },
  blue:    { accent: "#3b82f6", secondary: "#60a5fa", bg: "#0a0f1e", bgCard: "#0d1525" },
  purple:  { accent: "#8b5cf6", secondary: "#a78bfa", bg: "#0d0a1e", bgCard: "#130d24" },
  green:   { accent: "#22c55e", secondary: "#4ade80", bg: "#0a1a0f", bgCard: "#0d1f12" },
  red:     { accent: "#ef4444", secondary: "#f87171", bg: "#1a0a0a", bgCard: "#1f0d0d" },
  pink:    { accent: "#ec4899", secondary: "#f472b6", bg: "#1a0a12", bgCard: "#1f0d16" },
  cyan:    { accent: "#06b6d4", secondary: "#22d3ee", bg: "#0a1519", bgCard: "#0d1c21" },
  orange:  { accent: "#f97316", secondary: "#fb923c", bg: "#1a0f0a", bgCard: "#1f130d" },
  white:   { accent: "#e2e8f0", secondary: "#f8fafc", bg: "#0f0f0f", bgCard: "#1a1a1a" },
  sunset:  { accent: "#f59e0b", secondary: "#ec4899", bg: "#1a0a14", bgCard: "#1f0d1a" },
  ocean:   { accent: "#06b6d4", secondary: "#3b82f6", bg: "#0a141a", bgCard: "#0d1820" },
  gold:    { accent: "#ffd700", secondary: "#fbbf24", bg: "#1a1410", bgCard: "#1f1813" },
}

// ══════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════

function isExpired(expiresAt) {
  if (!expiresAt) return true
  return new Date(expiresAt) < new Date()
}

function daysLeft(expiresAt) {
  if (!expiresAt) return 0
  const diff = new Date(expiresAt) - new Date()
  return Math.max(0, Math.ceil(diff / 86_400_000))
}

function getTierFeatures(tier) {
  return TIER_FEATURES[tier] || TIER_FEATURES.free
}

function tierMeetsRequirement(currentTier, requiredTier) {
  const a = TIER_ORDER.indexOf(currentTier || "free")
  const b = TIER_ORDER.indexOf(requiredTier || "free")
  if (a < 0 || b < 0) return false
  return a >= b
}

// ══════════════════════════════════════════════════════════════════
//  SUBSCRIPTION FUNCTIONS
// ══════════════════════════════════════════════════════════════════

/**
 * جلب اشتراك المستخدم الحالي مع status محدّث
 */
async function getSubscription(userId) {
  try {
    const row = await databaseSystem.queryOne(
      `SELECT * FROM card_subscriptions WHERE user_id = $1`,
      [userId]
    )

    if (!row) return null

    // فحص الانتهاء التلقائي
    if (row.status === "active" && isExpired(row.expires_at)) {
      await databaseSystem.query(
        `UPDATE card_subscriptions SET status = 'expired', updated_at = NOW() WHERE user_id = $1`,
        [userId]
      )
      row.status = "expired"
    }

    return {
      ...row,
      days_left: daysLeft(row.expires_at),
      is_expired: isExpired(row.expires_at),
    }
  } catch (err) {
    logger.error("CARD_GET_SUBSCRIPTION_FAILED", { userId, error: err.message })
    return null
  }
}

/**
 * جلب الفئة الفعلية الحالية للمستخدم (free لو ما عنده اشتراك أو منتهي)
 */
async function getCurrentTier(userId) {
  const sub = await getSubscription(userId)
  if (!sub) return "free"
  if (sub.status !== "active" || sub.is_expired) return "free"
  return sub.tier || "free"
}

/**
 * هل المستخدم لديه اشتراك نشط بأي فئة؟
 */
async function hasActiveSubscription(userId) {
  const tier = await getCurrentTier(userId)
  return tier !== "free"
}

/**
 * هل لديه اشتراك بـ tier محدد أو أعلى؟
 */
async function hasTier(userId, requiredTier) {
  const tier = await getCurrentTier(userId)
  return tierMeetsRequirement(tier, requiredTier)
}

// ══════════════════════════════════════════════════════════════════
//  SETTINGS FUNCTIONS
// ══════════════════════════════════════════════════════════════════

/**
 * جلب إعدادات البطاقة (ينشئ صف افتراضي لو ما موجود)
 */
async function getSettings(userId) {
  try {
    let row = await databaseSystem.queryOne(
      `SELECT * FROM card_settings WHERE user_id = $1`,
      [userId]
    )

    if (!row) {
      // إنشاء صف افتراضي
      await databaseSystem.query(
        `INSERT INTO card_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      )
      row = await databaseSystem.queryOne(
        `SELECT * FROM card_settings WHERE user_id = $1`,
        [userId]
      )
    }

    // ─── ضمان parsing للـ JSONB ───
    if (row) {
      if (typeof row.custom_colors === "string") {
        try { row.custom_colors = JSON.parse(row.custom_colors) } catch { row.custom_colors = {} }
      }
      if (typeof row.badges === "string") {
        try { row.badges = JSON.parse(row.badges) } catch { row.badges = [] }
      }
      if (typeof row.effects === "string") {
        try { row.effects = JSON.parse(row.effects) } catch { row.effects = {} }
      }
    }

    return row
  } catch (err) {
    logger.error("CARD_GET_SETTINGS_FAILED", { userId, error: err.message })
    return null
  }
}

/**
 * حفظ إعدادات البطاقة
 *
 * @param {string} userId
 * @param {object} data - أي مزيج من الحقول التالية:
 *   - background_id
 *   - custom_background_url
 *   - theme_id
 *   - custom_colors (object)
 *   - badges (array)
 *   - effects (object)
 *   - border_style
 *   - avatar_url
 */
async function saveSettings(userId, data) {
  try {
    const fields = []
    const values = [userId]
    let idx = 2

    if (data.background_id !== undefined) {
      fields.push(`background_id = $${idx++}`)
      values.push(data.background_id)
    }
    if (data.custom_background_url !== undefined) {
      fields.push(`custom_background_url = $${idx++}`)
      values.push(data.custom_background_url || null)
    }
    if (data.theme_id !== undefined) {
      fields.push(`theme_id = $${idx++}`)
      values.push(data.theme_id)
    }
    if (data.custom_colors !== undefined) {
      fields.push(`custom_colors = $${idx++}`)
      values.push(JSON.stringify(data.custom_colors || {}))
    }
    if (data.badges !== undefined) {
      fields.push(`badges = $${idx++}`)
      values.push(JSON.stringify(data.badges || []))
    }
    if (data.effects !== undefined) {
      fields.push(`effects = $${idx++}`)
      values.push(JSON.stringify(data.effects || {}))
    }
    if (data.border_style !== undefined) {
      fields.push(`border_style = $${idx++}`)
      values.push(data.border_style)
    }
    if (data.avatar_url !== undefined) {
      fields.push(`avatar_url = $${idx++}`)
      values.push(data.avatar_url || null)
    }

    if (fields.length === 0) return false

    fields.push(`updated_at = NOW()`)

    await databaseSystem.query(
      `INSERT INTO card_settings (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET ${fields.join(", ")}`,
      values
    )

    return true
  } catch (err) {
    logger.error("CARD_SAVE_SETTINGS_FAILED", { userId, error: err.message, data })
    return false
  }
}

/**
 * إعادة تعيين إعدادات البطاقة للافتراضي
 */
async function resetSettings(userId) {
  try {
    await databaseSystem.query(
      `UPDATE card_settings SET
        background_id = 'default',
        custom_background_url = NULL,
        theme_id = 'amber',
        custom_colors = '{}'::jsonb,
        badges = '[]'::jsonb,
        effects = '{}'::jsonb,
        border_style = 'default',
        avatar_url = NULL,
        updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    )
    return true
  } catch (err) {
    logger.error("CARD_RESET_SETTINGS_FAILED", { userId, error: err.message })
    return false
  }
}

// ══════════════════════════════════════════════════════════════════
//  ASSETS FUNCTIONS (Wrappers around cardAssets.js)
// ══════════════════════════════════════════════════════════════════

function getAvailableBackgrounds(tier) {
  return cardAssets.getBackgroundsForTier(tier)
}

function getAvailableThemes(tier) {
  return cardAssets.getThemesForTier(tier)
}

function getAvailableBadges(tier) {
  return cardAssets.getBadgesForTier(tier)
}

function getAvailableEffects(tier) {
  return cardAssets.getEffectsForTier(tier)
}

function getAvailableBorderStyles(tier) {
  return cardAssets.getBorderStylesForTier(tier)
}

function getBackgroundById(id) {
  return cardAssets.getBackground(id)
}

function getThemeById(id) {
  return cardAssets.getTheme(id)
}

function getBadgeById(id) {
  return cardAssets.getBadge(id)
}

function getEffectById(id) {
  return cardAssets.getEffect(id)
}

// ══════════════════════════════════════════════════════════════════
//  VALIDATION
// ══════════════════════════════════════════════════════════════════

function isValidImageUrl(url) {
  if (!url) return false
  return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)/i.test(url)
}

function isValidTier(tier) {
  return TIER_ORDER.includes(tier)
}

// ══════════════════════════════════════════════════════════════════
//  LEGACY COMPATIBILITY
//  دوال قديمة للتوافق مع الكود اللي ما تعدّل بعد
// ══════════════════════════════════════════════════════════════════

/**
 * @deprecated استخدم hasActiveSubscription بدلاً منها
 */
async function isPremium(userId) {
  return await hasActiveSubscription(userId)
}

/**
 * @deprecated استخدم getSettings بدلاً منها
 *
 * يرجع شكل قديم: { theme_color, background_url, avatar_url, badge_style }
 */
async function getCustomization(userId) {
  const settings = await getSettings(userId)
  if (!settings) return null

  return {
    user_id: settings.user_id,
    theme_color: settings.theme_id || "amber",
    background_url: settings.custom_background_url || null,
    avatar_url: settings.avatar_url || null,
    badge_style: "default",
    updated_at: settings.updated_at,
  }
}

/**
 * @deprecated استخدم saveSettings بدلاً منها
 */
async function saveCustomization(userId, data) {
  const mapped = {}

  if (data.theme_color !== undefined) mapped.theme_id = data.theme_color
  if (data.background_url !== undefined) mapped.custom_background_url = data.background_url
  if (data.avatar_url !== undefined) mapped.avatar_url = data.avatar_url

  if (Object.keys(mapped).length === 0) return false

  return await saveSettings(userId, mapped)
}

/**
 * @deprecated استخدم resetSettings بدلاً منها
 */
async function resetCustomization(userId) {
  return await resetSettings(userId)
}

/**
 * @deprecated الثيمات الجديدة من cardAssets.js
 */
function getTheme(themeColor) {
  // أولاً نحاول من PRESET_THEMES (للتوافق)
  if (PRESET_THEMES[themeColor]) return PRESET_THEMES[themeColor]

  // ثم من cardAssets
  const themeData = cardAssets.getTheme(themeColor)
  return themeData?.colors || PRESET_THEMES.amber
}

/**
 * @deprecated استخدم نظام الاشتراكات الجديد
 *
 * هذي الدالة كانت تستخدم user_premium القديم.
 * الآن، نضيف اشتراك مباشرة في card_subscriptions كـ 'advanced'.
 */
async function activatePremium(userId, plan = "monthly", activatedBy = null, months = null) {
  try {
    let expiresAt = new Date()

    if (plan === "monthly") {
      expiresAt.setMonth(expiresAt.getMonth() + (months || 1))
    } else if (plan === "annual") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    }

    await databaseSystem.query(
      `INSERT INTO card_subscriptions
        (user_id, tier, status, started_at, expires_at, is_gift, gifted_by)
       VALUES ($1, 'advanced', 'active', NOW(), $2, TRUE, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         status = 'active',
         expires_at = $2,
         updated_at = NOW()`,
      [userId, expiresAt.toISOString(), activatedBy]
    )

    return { success: true, expiresAt: expiresAt.toISOString() }
  } catch (err) {
    logger.error("CARD_ACTIVATE_PREMIUM_FAILED", { error: err.message })
    return { success: false }
  }
}

/**
 * @deprecated استخدم cardSync routes في الـ API
 */
async function revokePremium(userId) {
  try {
    await databaseSystem.query(
      `UPDATE card_subscriptions SET status = 'cancelled', updated_at = NOW() WHERE user_id = $1`,
      [userId]
    )
    return true
  } catch (err) {
    logger.error("CARD_REVOKE_PREMIUM_FAILED", { error: err.message })
    return false
  }
}

/**
 * @deprecated الجداول تنشأ من migration 031 — هذي الدالة باقية للتوافق فقط
 */
async function ensureTables() {
  // الجداول الجديدة تنشأ من migration 031 تلقائياً
  // هذي الدالة باقية للتوافق مع أي كود يستدعيها
  return true
}

// ══════════════════════════════════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════════════════════════════════

module.exports = {
  // ─── النظام الجديد ───
  // Subscriptions
  getSubscription,
  getCurrentTier,
  hasActiveSubscription,
  hasTier,

  // Settings
  getSettings,
  saveSettings,
  resetSettings,

  // Tier features
  getTierFeatures,
  tierMeetsRequirement,
  TIER_FEATURES,
  TIER_ORDER,

  // Assets
  getAvailableBackgrounds,
  getAvailableThemes,
  getAvailableBadges,
  getAvailableEffects,
  getAvailableBorderStyles,
  getBackgroundById,
  getThemeById,
  getBadgeById,
  getEffectById,

  // Validation
  isValidImageUrl,
  isValidTier,

  // ─── النظام القديم (للتوافق) ───
  ensureTables,
  isPremium,
  getCustomization,
  saveCustomization,
  resetCustomization,
  activatePremium,
  revokePremium,
  getTheme,
  PRESET_THEMES,
}