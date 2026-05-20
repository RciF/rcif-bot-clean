/**
 * ═══════════════════════════════════════════════════════════════════════
 *  LEADERBOARD SNAPSHOT SYSTEM
 *  المسار: systems/leaderboardSnapshotSystem.js
 *
 *  ينشئ snapshots يومية للاقتصاد والـ XP عشان نقدر نحسب:
 *   • "كم كسب فلان اليوم؟"      → current - snapshot_today
 *   • "كم كسب فلان الأسبوع؟"    → current - snapshot_7_days_ago
 *   • "كم كسب فلان الشهر؟"      → current - snapshot_30_days_ago
 *
 *  متى يشتغل:
 *   • مرة عند بدء تشغيل البوت (لو ما فيه snapshot لهذا اليوم)
 *   • كل يوم عند منتصف الليل (00:00) تلقائياً
 *
 *  Cleanup:
 *   • يحذف snapshots أقدم من 90 يوم تلقائياً (للتوفير)
 * ═══════════════════════════════════════════════════════════════════════
 */

const databaseSystem = require("./databaseSystem")
const scheduler = require("./schedulerSystem")
const logger = require("./loggerSystem")
const inventoryHelper = require("../utils/inventoryHelper")
const { ALL_ITEMS } = require("../config/economyConfig")

// ───────────────────────────────────────────────────────────────────
//  Configuration
// ───────────────────────────────────────────────────────────────────

const SNAPSHOT_CHECK_INTERVAL = 60 * 60 * 1000 // كل ساعة نتحقق
const CLEANUP_DAYS = 90                          // نحتفظ بـ 90 يوم فقط
const BATCH_SIZE = 500                           // نعالج 500 صف في الـ batch

// ───────────────────────────────────────────────────────────────────
//  Helpers
// ───────────────────────────────────────────────────────────────────

function todayDateStr() {
  // YYYY-MM-DD بتوقيت UTC
  return new Date().toISOString().slice(0, 10)
}

function calcItemsValue(inventory) {
  const items = inventoryHelper.normalize(inventory)
  let value = 0
  let count = 0
  for (const asset of items) {
    const def = ALL_ITEMS[asset.item_id]
    const qty = Number(asset.quantity) || 0
    count += qty
    if (def?.price) value += def.price * qty
  }
  return { value, count }
}

// ───────────────────────────────────────────────────────────────────
//  Economy Snapshot
// ───────────────────────────────────────────────────────────────────

async function snapshotEconomy(date = todayDateStr()) {
  try {
    // جلب كل المستخدمين النشطين (عندهم coins أو inventory)
    const result = await databaseSystem.query(`
      SELECT
        user_id,
        COALESCE(coins, 0) AS coins,
        COALESCE(inventory, '[]'::jsonb) AS inventory
      FROM economy_users
      WHERE COALESCE(coins, 0) > 0
         OR jsonb_array_length(COALESCE(inventory, '[]'::jsonb)) > 0
    `)

    const rows = result.rows || []
    if (rows.length === 0) {
      logger.info("ECONOMY_SNAPSHOT_SKIP no_users")
      return { inserted: 0, total: 0 }
    }

    let inserted = 0

    // معالجة batch-by-batch
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)

      // بناء values للـ multi-row insert
      const values = []
      const params = []
      let paramIdx = 1

      for (const row of batch) {
        const coins = Number(row.coins) || 0
        const { value: itemsValue, count: itemsCount } = calcItemsValue(row.inventory)
        const netWorth = coins + itemsValue

        values.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5})`)
        params.push(row.user_id, date, coins, itemsCount, itemsValue, netWorth)
        paramIdx += 6
      }

      await databaseSystem.query(
        `
        INSERT INTO economy_snapshots (user_id, date, coins, items_count, items_value, net_worth)
        VALUES ${values.join(", ")}
        ON CONFLICT (user_id, date) DO UPDATE
          SET coins       = EXCLUDED.coins,
              items_count = EXCLUDED.items_count,
              items_value = EXCLUDED.items_value,
              net_worth   = EXCLUDED.net_worth
        `,
        params
      )

      inserted += batch.length
    }

    logger.success(`ECONOMY_SNAPSHOT_DONE date=${date} count=${inserted}`)
    return { inserted, total: rows.length }
  } catch (err) {
    logger.error("ECONOMY_SNAPSHOT_FAILED", { error: err.message })
    return { inserted: 0, total: 0, error: err.message }
  }
}

// ───────────────────────────────────────────────────────────────────
//  XP Snapshot
// ───────────────────────────────────────────────────────────────────

async function snapshotXP(date = todayDateStr()) {
  try {
    const result = await databaseSystem.query(`
      SELECT
        user_id,
        guild_id,
        COALESCE(level, 0) AS level,
        COALESCE(xp, 0) AS xp,
        ((COALESCE(level, 0) * (COALESCE(level, 0) - 1) * 50) + COALESCE(xp, 0))::bigint AS total_xp
      FROM xp
      WHERE level > 0 OR xp > 0
    `)

    const rows = result.rows || []
    if (rows.length === 0) {
      logger.info("XP_SNAPSHOT_SKIP no_xp_records")
      return { inserted: 0, total: 0 }
    }

    let inserted = 0

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)

      const values = []
      const params = []
      let paramIdx = 1

      for (const row of batch) {
        values.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5})`)
        params.push(
          row.user_id,
          row.guild_id,
          date,
          Number(row.level) || 0,
          Number(row.xp) || 0,
          Number(row.total_xp) || 0
        )
        paramIdx += 6
      }

      await databaseSystem.query(
        `
        INSERT INTO xp_snapshots (user_id, guild_id, date, level, xp, total_xp)
        VALUES ${values.join(", ")}
        ON CONFLICT (user_id, guild_id, date) DO UPDATE
          SET level    = EXCLUDED.level,
              xp       = EXCLUDED.xp,
              total_xp = EXCLUDED.total_xp
        `,
        params
      )

      inserted += batch.length
    }

    logger.success(`XP_SNAPSHOT_DONE date=${date} count=${inserted}`)
    return { inserted, total: rows.length }
  } catch (err) {
    logger.error("XP_SNAPSHOT_FAILED", { error: err.message })
    return { inserted: 0, total: 0, error: err.message }
  }
}

// ───────────────────────────────────────────────────────────────────
//  Run both snapshots
// ───────────────────────────────────────────────────────────────────

async function snapshotAll(date = todayDateStr()) {
  const economy = await snapshotEconomy(date)
  const xp = await snapshotXP(date)
  return { date, economy, xp }
}

// ───────────────────────────────────────────────────────────────────
//  Cleanup old snapshots
// ───────────────────────────────────────────────────────────────────

async function cleanupOldSnapshots() {
  try {
    const ecoResult = await databaseSystem.query(
      `DELETE FROM economy_snapshots WHERE date < CURRENT_DATE - INTERVAL '${CLEANUP_DAYS} days'`
    )
    const xpResult = await databaseSystem.query(
      `DELETE FROM xp_snapshots WHERE date < CURRENT_DATE - INTERVAL '${CLEANUP_DAYS} days'`
    )
    logger.success(
      `SNAPSHOTS_CLEANUP economy=${ecoResult.rowCount || 0} xp=${xpResult.rowCount || 0}`
    )
  } catch (err) {
    logger.error("SNAPSHOTS_CLEANUP_FAILED", { error: err.message })
  }
}

// ───────────────────────────────────────────────────────────────────
//  Auto-trigger logic — يقرر متى يأخذ snapshot
// ───────────────────────────────────────────────────────────────────

let _lastSnapshotDate = null

async function tickIfNeeded() {
  const today = todayDateStr()
  if (_lastSnapshotDate === today) return // أخذنا snapshot اليوم

  // تحقق من DB لو فيه snapshot لليوم
  try {
    const check = await databaseSystem.query(
      `SELECT 1 FROM economy_snapshots WHERE date = $1 LIMIT 1`,
      [today]
    )
    if (check.rows && check.rows.length > 0) {
      _lastSnapshotDate = today
      return
    }
  } catch {
    // لو الجدول ما موجود → migration ما اشتغلت بعد، نحاول لاحقاً
    return
  }

  // ما فيه snapshot → خذ واحد
  logger.info(`SNAPSHOT_TRIGGER date=${today}`)
  await snapshotAll(today)
  _lastSnapshotDate = today

  // cleanup مع snapshot اليومي
  await cleanupOldSnapshots()
}

// ───────────────────────────────────────────────────────────────────
//  Start scheduler
// ───────────────────────────────────────────────────────────────────

function start() {
  // نتحقق كل ساعة لو نحتاج نأخذ snapshot
  scheduler.register(
    "leaderboard-snapshot-check",
    SNAPSHOT_CHECK_INTERVAL,
    tickIfNeeded,
    true // شغّل مرة فوراً عند البدء
  )

  logger.success("LEADERBOARD_SNAPSHOT_SYSTEM_STARTED")
}

// ───────────────────────────────────────────────────────────────────
//  Query helpers — للاستخدام في leaderboards
// ───────────────────────────────────────────────────────────────────

/**
 * يجلب snapshot قديم لمستخدم (للحساب الفرق)
 * @param {string} userId
 * @param {number} daysAgo - 1 = يوم، 7 = أسبوع، 30 = شهر
 * @returns {Promise<{coins, items_count, items_value, net_worth} | null>}
 */
async function getEconomySnapshotDaysAgo(userId, daysAgo) {
  try {
    const result = await databaseSystem.query(
      `
      SELECT coins, items_count, items_value, net_worth
      FROM economy_snapshots
      WHERE user_id = $1
        AND date <= CURRENT_DATE - $2::int
      ORDER BY date DESC
      LIMIT 1
      `,
      [userId, daysAgo]
    )
    return result.rows[0] || null
  } catch {
    return null
  }
}

/**
 * يجلب snapshot قديم لـ XP في سيرفر معين
 */
async function getXPSnapshotDaysAgo(userId, guildId, daysAgo) {
  try {
    const result = await databaseSystem.query(
      `
      SELECT level, xp, total_xp
      FROM xp_snapshots
      WHERE user_id = $1
        AND guild_id = $2
        AND date <= CURRENT_DATE - $3::int
      ORDER BY date DESC
      LIMIT 1
      `,
      [userId, guildId, daysAgo]
    )
    return result.rows[0] || null
  } catch {
    return null
  }
}

/**
 * يحوّل period string لعدد أيام
 */
function periodToDaysAgo(period) {
  switch (period) {
    case "daily":   return 1
    case "weekly":  return 7
    case "monthly": return 30
    default:        return 0
  }
}

module.exports = {
  start,
  snapshotAll,
  snapshotEconomy,
  snapshotXP,
  cleanupOldSnapshots,
  getEconomySnapshotDaysAgo,
  getXPSnapshotDaysAgo,
  periodToDaysAgo,
}