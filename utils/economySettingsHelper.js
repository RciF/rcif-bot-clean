// ══════════════════════════════════════════════════════════════════
//  ECONOMY SETTINGS HELPER
//  المسار: utils/economySettingsHelper.js
//
//  يقرأ economy_settings من DB (يحفظها الداش) ويعيدها بشكل موحد
//  مع defaults معقولة لو الـ row غير موجود.
//
//  Schema الداش (economy_settings):
//   - enabled (boolean)
//   - currency_symbol (text), currency_name (text)
//   - starting_balance (int)
//   - daily_reward (JSONB): {min, max}
//   - weekly_reward (JSONB): {min, max}
//   - message_reward (JSONB): {min, max, cooldown}
//   - work_cooldown (int seconds)  -- اختياري
// ══════════════════════════════════════════════════════════════════

const databaseSystem = require("../systems/databaseSystem")
const logger = require("../systems/loggerSystem")

// ══════════════════════════════════════
//  DEFAULTS (تُستخدم لو الـ row غير موجود)
// ══════════════════════════════════════

const DEFAULTS = {
  enabled: true,
  currency_symbol: "💰",
  currency_name: "كوين",
  starting_balance: 0,
  daily_reward: { min: 100, max: 500 },
  weekly_reward: { min: 1000, max: 5000 },
  message_reward: { min: 1, max: 5, cooldown: 60 },
  work_reward: { min: 50, max: 300, cooldown: 43200 }
}

// ══════════════════════════════════════
//  Cache (60s TTL — الإعدادات نادرة التغيير)
// ══════════════════════════════════════

const cache = new Map()
const TTL = 60 * 1000

// ══════════════════════════════════════
//  Helpers
// ══════════════════════════════════════

function parseJsonObject(raw) {
  if (!raw) return null
  if (typeof raw === "object" && !Array.isArray(raw)) return raw
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw)
      return (p && typeof p === "object" && !Array.isArray(p)) ? p : null
    } catch { return null }
  }
  return null
}

function normalizeRewardRange(raw, fallback) {
  const obj = parseJsonObject(raw)
  if (!obj) return { ...fallback }
  const min = parseInt(obj.min)
  const max = parseInt(obj.max)
  return {
    min: isFinite(min) && min >= 0 ? min : fallback.min,
    max: isFinite(max) && max >= min ? max : Math.max(fallback.max, isFinite(min) ? min : fallback.max)
  }
}

function normalizeMessageReward(raw, fallback) {
  const obj = parseJsonObject(raw)
  if (!obj) return { ...fallback }
  const min = parseInt(obj.min)
  const max = parseInt(obj.max)
  const cooldown = parseInt(obj.cooldown)
  return {
    min: isFinite(min) && min >= 0 ? min : fallback.min,
    max: isFinite(max) && max >= min ? max : Math.max(fallback.max, isFinite(min) ? min : fallback.max),
    cooldown: isFinite(cooldown) && cooldown >= 0 ? cooldown : fallback.cooldown
  }
}

// ══════════════════════════════════════
//  getSettings(guildId)
// ══════════════════════════════════════

async function getSettings(guildId) {
  if (!guildId) return { ...DEFAULTS }

  const now = Date.now()
  const cached = cache.get(guildId)
  if (cached && now < cached.expiresAt) {
    return cached.data
  }

  let row = null
  try {
    row = await databaseSystem.queryOne(
      "SELECT * FROM economy_settings WHERE guild_id = $1",
      [guildId]
    )
  } catch (err) {
    logger.error("ECONOMY_SETTINGS_LOAD_FAILED", { error: err.message })
  }

  const data = {
    enabled: row?.enabled !== false,
    currency_symbol: row?.currency_symbol || DEFAULTS.currency_symbol,
    currency_name: row?.currency_name || DEFAULTS.currency_name,
    starting_balance: row?.starting_balance != null
      ? parseInt(row.starting_balance) || 0
      : DEFAULTS.starting_balance,
    daily_reward: normalizeRewardRange(row?.daily_reward, DEFAULTS.daily_reward),
    weekly_reward: normalizeRewardRange(row?.weekly_reward, DEFAULTS.weekly_reward),
    message_reward: normalizeMessageReward(row?.message_reward, DEFAULTS.message_reward),
    work_reward: normalizeMessageReward(row?.work_reward, DEFAULTS.work_reward),
    work_cooldown_ms: row?.work_cooldown != null
      ? Math.max(0, parseInt(row.work_cooldown)) * 1000
      : null // null = استخدم WORK_COOLDOWN من economyConfig
  }

  cache.set(guildId, { data, expiresAt: now + TTL })
  return data
}

// ══════════════════════════════════════
//  invalidateCache(guildId?)
// ══════════════════════════════════════

function invalidateCache(guildId) {
  if (guildId) cache.delete(guildId)
  else cache.clear()
}

// ══════════════════════════════════════
//  ensureUser(userId, startingBalance)
//  ينشئ الـ user لو ما موجود، بـ starting_balance من الإعدادات
// ══════════════════════════════════════

async function ensureUser(userId, startingBalance = 0) {
  try {
    await databaseSystem.query(
      `INSERT INTO economy_users (user_id, coins, last_daily, last_work, inventory)
       VALUES ($1, $2, 0, 0, '[]')
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, parseInt(startingBalance) || 0]
    )
    return true
  } catch (err) {
    logger.error("ECONOMY_ENSURE_USER_FAILED", { error: err.message })
    return false
  }
}

// ══════════════════════════════════════
//  randomReward(range)  — يعطيك رقم بين min و max شاملاً
// ══════════════════════════════════════

function randomReward(range) {
  if (!range) return 0
  const min = parseInt(range.min) || 0
  const max = parseInt(range.max) || min
  if (max <= min) return min
  return Math.floor(Math.random() * (max - min + 1)) + min
}

module.exports = {
  getSettings,
  invalidateCache,
  ensureUser,
  randomReward,
  DEFAULTS
}