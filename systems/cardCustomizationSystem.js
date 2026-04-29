const databaseSystem = require("./databaseSystem");
const logger = require("./loggerSystem");

// ═══════════════════════════════════════════════════════════
//  CARD CUSTOMIZATION SYSTEM
//  نظام تخصيص بطاقة المستوى الشخصية
//  $2.99/شهر أو $18/سنة
// ═══════════════════════════════════════════════════════════

// ─── ثيمات الألوان المتاحة ───
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
}

// ─── إنشاء الجداول ───
async function ensureTables() {
  await databaseSystem.query(`
    CREATE TABLE IF NOT EXISTS card_customization (
      user_id        TEXT PRIMARY KEY,
      background_url TEXT,
      theme_color    TEXT DEFAULT 'amber',
      avatar_url     TEXT,
      badge_style    TEXT DEFAULT 'default',
      updated_at     TIMESTAMP DEFAULT NOW()
    )
  `)

  await databaseSystem.query(`
    CREATE TABLE IF NOT EXISTS user_premium (
      user_id      TEXT PRIMARY KEY,
      plan         TEXT DEFAULT 'monthly',
      activated_at TIMESTAMP DEFAULT NOW(),
      expires_at   TIMESTAMP,
      activated_by TEXT,
      notes        TEXT
    )
  `)
}

// ─── التحقق من Premium ───
async function isPremium(userId) {
  try {
    const row = await databaseSystem.queryOne(
      `SELECT * FROM user_premium
       WHERE user_id = $1
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId]
    )
    return !!row
  } catch (err) {
    logger.error("CARD_PREMIUM_CHECK_FAILED", { error: err.message })
    return false
  }
}

// ─── جلب إعدادات التخصيص ───
async function getCustomization(userId) {
  try {
    await ensureTables()
    const row = await databaseSystem.queryOne(
      "SELECT * FROM card_customization WHERE user_id = $1",
      [userId]
    )
    return row || null
  } catch (err) {
    logger.error("CARD_GET_CUSTOMIZATION_FAILED", { error: err.message })
    return null
  }
}

// ─── حفظ إعدادات التخصيص ───
async function saveCustomization(userId, data) {
  try {
    await ensureTables()

    const fields = []
    const values = [userId]
    let idx = 2

    if (data.background_url !== undefined) {
      fields.push(`background_url = $${idx++}`)
      values.push(data.background_url)
    }
    if (data.theme_color !== undefined) {
      fields.push(`theme_color = $${idx++}`)
      values.push(data.theme_color)
    }
    if (data.avatar_url !== undefined) {
      fields.push(`avatar_url = $${idx++}`)
      values.push(data.avatar_url)
    }
    if (data.badge_style !== undefined) {
      fields.push(`badge_style = $${idx++}`)
      values.push(data.badge_style)
    }

    fields.push(`updated_at = NOW()`)

    if (fields.length === 1) return false // فقط updated_at

    await databaseSystem.query(`
      INSERT INTO card_customization (user_id, ${Object.keys(data).join(", ")})
      VALUES ($1, ${Object.keys(data).map((_, i) => `$${i + 2}`).join(", ")})
      ON CONFLICT (user_id) DO UPDATE SET ${fields.join(", ")}
    `, values)

    return true
  } catch (err) {
    logger.error("CARD_SAVE_CUSTOMIZATION_FAILED", { error: err.message })
    return false
  }
}

// ─── إعادة تعيين التخصيص ───
async function resetCustomization(userId) {
  try {
    await databaseSystem.query(
      "DELETE FROM card_customization WHERE user_id = $1",
      [userId]
    )
    return true
  } catch (err) {
    logger.error("CARD_RESET_FAILED", { error: err.message })
    return false
  }
}

// ─── تفعيل Premium (يدوي من الداشبورد) ───
async function activatePremium(userId, plan, activatedBy, months = null) {
  try {
    await ensureTables()

    let expiresAt = null

    if (plan === "monthly") {
      const d = new Date()
      d.setMonth(d.getMonth() + (months || 1))
      expiresAt = d.toISOString()
    } else if (plan === "annual") {
      const d = new Date()
      d.setFullYear(d.getFullYear() + 1)
      expiresAt = d.toISOString()
    }

    await databaseSystem.query(`
      INSERT INTO user_premium (user_id, plan, activated_at, expires_at, activated_by)
      VALUES ($1, $2, NOW(), $3, $4)
      ON CONFLICT (user_id) DO UPDATE SET
        plan = $2,
        activated_at = NOW(),
        expires_at = $3,
        activated_by = $4
    `, [userId, plan, expiresAt, activatedBy])

    return { success: true, expiresAt }
  } catch (err) {
    logger.error("CARD_ACTIVATE_PREMIUM_FAILED", { error: err.message })
    return { success: false }
  }
}

// ─── إلغاء Premium ───
async function revokePremium(userId) {
  try {
    await databaseSystem.query(
      "DELETE FROM user_premium WHERE user_id = $1",
      [userId]
    )
    return true
  } catch (err) {
    logger.error("CARD_REVOKE_PREMIUM_FAILED", { error: err.message })
    return false
  }
}

// ─── جلب ثيم الألوان ───
function getTheme(themeColor) {
  return PRESET_THEMES[themeColor] || PRESET_THEMES.amber
}

// ─── التحقق من رابط الصورة ───
function isValidImageUrl(url) {
  if (!url) return false
  return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)/i.test(url)
}

module.exports = {
  ensureTables,
  isPremium,
  getCustomization,
  saveCustomization,
  resetCustomization,
  activatePremium,
  revokePremium,
  getTheme,
  isValidImageUrl,
  PRESET_THEMES
}
