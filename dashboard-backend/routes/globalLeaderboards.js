/**
 * ═══════════════════════════════════════════════════════════
 *  Global Leaderboards Routes
 *  المسار: dashboard-backend/routes/globalLeaderboards.js
 *
 *  Endpoints العامة (بدون guild_id):
 *   • GET /api/global/leaderboard/economy    — أغنى 100 لاعب عالمياً
 *   • GET /api/global/leaderboard/xp         — أعلى 100 XP عالمياً (مجموع كل السيرفرات)
 *   • GET /api/global/leaderboard/level      — أعلى 100 مستوى عالمياً
 *   • GET /api/global/stats                  — إحصائيات عامة (لاعبين، فلوس، XP)
 *
 *  ⚠️ هذي endpoints عامة:
 *   - تتطلب authentication (لازم يكون مسجل دخول)
 *   - لا تحتاج guild admin
 *   - لا تحتاج اشتراك
 *   - Cache 5 دقائق (تقلل الضغط على DB)
 * ═══════════════════════════════════════════════════════════
 */

const express = require("express")
const { asyncHandler } = require("../middleware/error")
const { requireAuth } = require("../middleware/auth")
const { query } = require("../config/database")

const router = express.Router()

// ════════════════════════════════════════════════════════════
//  In-memory cache (5 minutes)
// ════════════════════════════════════════════════════════════

const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 دقائق

function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.time > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCached(key, data) {
  cache.set(key, { data, time: Date.now() })
}

// ════════════════════════════════════════════════════════════
//  GET /api/global/leaderboard/economy
//  أغنى لاعبين في النظام كاملاً (الاقتصاد عالمي)
// ════════════════════════════════════════════════════════════

router.get(
  "/global/leaderboard/economy",
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 100, 100)
    const cacheKey = `economy:${limit}`

    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    const r = await query(
      `SELECT user_id,
              COALESCE(coins, 0)::bigint AS coins,
              COALESCE(bank, 0)::bigint AS bank,
              (COALESCE(coins, 0) + COALESCE(bank, 0))::bigint AS total
       FROM economy_users
       WHERE COALESCE(coins, 0) + COALESCE(bank, 0) > 0
       ORDER BY total DESC
       LIMIT $1`,
      [limit]
    ).catch(() => ({ rows: [] }))

    const leaderboard = (r.rows || []).map((row, idx) => ({
      rank: idx + 1,
      user_id: row.user_id,
      coins: Number(row.coins) || 0,
      bank: Number(row.bank) || 0,
      total: Number(row.total) || 0,
    }))

    const result = {
      leaderboard,
      count: leaderboard.length,
      updated_at: new Date().toISOString(),
    }

    setCached(cacheKey, result)
    res.json(result)
  })
)

// ════════════════════════════════════════════════════════════
//  GET /api/global/leaderboard/xp
//  أعلى XP — مجموع كل السيرفرات لكل مستخدم
// ════════════════════════════════════════════════════════════

router.get(
  "/global/leaderboard/xp",
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 100, 100)
    const cacheKey = `xp:${limit}`

    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    // ✅ نجمع XP الكلي عبر كل السيرفرات لكل مستخدم
    // مع حساب total_xp الصحيح (level * 100 لكل مستوى سابق + xp الحالي)
    const r = await query(
      `SELECT
         user_id,
         COUNT(DISTINCT guild_id)::int AS servers_count,
         SUM(level)::bigint AS total_levels,
         SUM(
           (level * (level - 1) * 50) + xp
         )::bigint AS total_xp,
         MAX(level)::int AS highest_level
       FROM xp
       WHERE xp > 0 OR level > 0
       GROUP BY user_id
       ORDER BY total_xp DESC
       LIMIT $1`,
      [limit]
    ).catch(() => ({ rows: [] }))

    const leaderboard = (r.rows || []).map((row, idx) => ({
      rank: idx + 1,
      user_id: row.user_id,
      total_xp: Number(row.total_xp) || 0,
      total_levels: Number(row.total_levels) || 0,
      highest_level: Number(row.highest_level) || 0,
      servers_count: Number(row.servers_count) || 0,
    }))

    const result = {
      leaderboard,
      count: leaderboard.length,
      updated_at: new Date().toISOString(),
    }

    setCached(cacheKey, result)
    res.json(result)
  })
)

// ════════════════════════════════════════════════════════════
//  GET /api/global/leaderboard/level
//  أعلى المستويات في سيرفر واحد (level واحد record)
//  مفيد لإظهار "الأكثر تقدماً في سيرفر معين"
// ════════════════════════════════════════════════════════════

router.get(
  "/global/leaderboard/level",
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 100, 100)
    const cacheKey = `level:${limit}`

    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    const r = await query(
      `SELECT user_id, guild_id, level, xp,
              ((level * (level - 1) * 50) + xp)::bigint AS total_xp
       FROM xp
       WHERE level > 0
       ORDER BY level DESC, xp DESC
       LIMIT $1`,
      [limit]
    ).catch(() => ({ rows: [] }))

    const leaderboard = (r.rows || []).map((row, idx) => ({
      rank: idx + 1,
      user_id: row.user_id,
      guild_id: row.guild_id,
      level: Number(row.level) || 0,
      total_xp: Number(row.total_xp) || 0,
    }))

    const result = {
      leaderboard,
      count: leaderboard.length,
      updated_at: new Date().toISOString(),
    }

    setCached(cacheKey, result)
    res.json(result)
  })
)

// ════════════════════════════════════════════════════════════
//  GET /api/global/stats
//  إحصائيات عامة على البوت كله
// ════════════════════════════════════════════════════════════

router.get(
  "/global/stats",
  requireAuth,
  asyncHandler(async (req, res) => {
    const cacheKey = "stats"
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    // ─── Economy stats ───
    const economyStats = await query(`
      SELECT
        COUNT(*)::int AS total_users,
        SUM(COALESCE(coins, 0) + COALESCE(bank, 0))::bigint AS total_money,
        MAX(COALESCE(coins, 0) + COALESCE(bank, 0))::bigint AS richest
      FROM economy_users
      WHERE COALESCE(coins, 0) + COALESCE(bank, 0) > 0
    `).catch(() => ({ rows: [{}] }))

    // ─── XP stats ───
    const xpStats = await query(`
      SELECT
        COUNT(DISTINCT user_id)::int AS active_users,
        COUNT(DISTINCT guild_id)::int AS active_guilds,
        SUM(((level * (level - 1) * 50) + xp))::bigint AS total_xp,
        MAX(level)::int AS highest_level
      FROM xp
      WHERE level > 0 OR xp > 0
    `).catch(() => ({ rows: [{}] }))

    // ─── Subscriptions stats ───
    const subsStats = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active')::int AS active_subs,
        COUNT(*) FILTER (WHERE plan_id = 'silver' AND status = 'active')::int AS silver_count,
        COUNT(*) FILTER (WHERE plan_id = 'gold' AND status = 'active')::int AS gold_count,
        COUNT(*) FILTER (WHERE plan_id = 'diamond' AND status = 'active')::int AS diamond_count
      FROM subscriptions
    `).catch(() => ({ rows: [{}] }))

    // ─── Guild count ───
    const guildStats = await query(`
      SELECT COUNT(DISTINCT guild_id)::int AS total_guilds
      FROM guilds
    `).catch(() => ({ rows: [{}] }))

    const result = {
      economy: {
        total_users: Number(economyStats.rows[0]?.total_users) || 0,
        total_money: Number(economyStats.rows[0]?.total_money) || 0,
        richest_balance: Number(economyStats.rows[0]?.richest) || 0,
      },
      xp: {
        active_users: Number(xpStats.rows[0]?.active_users) || 0,
        active_guilds: Number(xpStats.rows[0]?.active_guilds) || 0,
        total_xp: Number(xpStats.rows[0]?.total_xp) || 0,
        highest_level: Number(xpStats.rows[0]?.highest_level) || 0,
      },
      subscriptions: {
        total_active: Number(subsStats.rows[0]?.active_subs) || 0,
        silver: Number(subsStats.rows[0]?.silver_count) || 0,
        gold: Number(subsStats.rows[0]?.gold_count) || 0,
        diamond: Number(subsStats.rows[0]?.diamond_count) || 0,
      },
      guilds: {
        total: Number(guildStats.rows[0]?.total_guilds) || 0,
      },
      updated_at: new Date().toISOString(),
    }

    setCached(cacheKey, result)
    res.json(result)
  })
)

module.exports = router