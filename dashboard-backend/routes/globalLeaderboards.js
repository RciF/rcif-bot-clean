/**
 * ═══════════════════════════════════════════════════════════
 *  Global Leaderboards Routes — v3 (Mega Legendary)
 *  المسار: dashboard-backend/routes/globalLeaderboards.js
 *
 *  ✨ 5 توبات عالمية:
 *   • Economy (الأغنى — رصيد + بنك)
 *   • NetWorth (الثروة — رصيد + بنك + ممتلكات) ← يحسبها البوت
 *   • Items (أكثر ممتلكات) ← يحسبها البوت
 *   • XP (الأعلى خبرة عبر كل السيرفرات)
 *   • Level (أعلى مستوى محقق)
 *
 *  + جلب أسماء وصور Discord الحقيقية
 *  + Badges & Achievements لكل تاب
 *  + Profile Modal كامل
 * ═══════════════════════════════════════════════════════════
 */

const express = require("express")
const { asyncHandler } = require("../middleware/error")
const { requireAuth } = require("../middleware/auth")
const { query } = require("../config/database")
const env = require("../config/env")

const router = express.Router()

// ════════════════════════════════════════════════════════════
//  Caches
// ════════════════════════════════════════════════════════════

const leaderboardCache = new Map()
const userCache = new Map()

const LEADERBOARD_TTL = 5 * 60 * 1000
const USER_CACHE_TTL = 60 * 60 * 1000

function getCached(map, key, ttl) {
  const entry = map.get(key)
  if (!entry) return null
  if (Date.now() - entry.time > ttl) {
    map.delete(key)
    return null
  }
  return entry.data
}

function setCached(map, key, data) {
  map.set(key, { data, time: Date.now() })
  if (map.size > 5000) {
    const firstKey = map.keys().next().value
    map.delete(firstKey)
  }
}

// ════════════════════════════════════════════════════════════
//  Discord User Lookup
// ════════════════════════════════════════════════════════════

async function fetchDiscordUser(userId) {
  const cached = getCached(userCache, userId, USER_CACHE_TTL)
  if (cached) return cached

  try {
    const response = await fetch(`https://discord.com/api/v10/users/${userId}`, {
      headers: {
        Authorization: `Bot ${env.BOT_TOKEN}`,
        "User-Agent": "LynBot/1.0",
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      const fallback = { id: userId, username: `User ${userId.slice(-6)}`, avatar: null, global_name: null }
      setCached(userCache, userId, fallback)
      return fallback
    }

    const data = await response.json()
    const userData = {
      id: data.id,
      username: data.username,
      global_name: data.global_name || data.username,
      avatar: data.avatar,
      discriminator: data.discriminator,
      banner: data.banner,
      accent_color: data.accent_color,
    }

    setCached(userCache, userId, userData)
    return userData
  } catch {
    const fallback = { id: userId, username: `User ${userId.slice(-6)}`, avatar: null, global_name: null }
    setCached(userCache, userId, fallback)
    return fallback
  }
}

async function fetchDiscordUsers(userIds) {
  const results = {}
  const BATCH_SIZE = 10

  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE)
    const users = await Promise.all(batch.map((id) => fetchDiscordUser(id)))
    for (const user of users) {
      results[user.id] = user
    }
  }
  return results
}

function getAvatarUrl(user) {
  if (!user) return null
  if (user.avatar) {
    const ext = user.avatar.startsWith("a_") ? "gif" : "png"
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`
  }
  try {
    const defaultIdx = (BigInt(user.id) >> 22n) % 6n
    return `https://cdn.discordapp.com/embed/avatars/${defaultIdx}.png`
  } catch {
    return `https://cdn.discordapp.com/embed/avatars/0.png`
  }
}

// ════════════════════════════════════════════════════════════
//  Bot API Call (للـ networth و items)
// ════════════════════════════════════════════════════════════

async function callBot(path, body = {}) {
  const botUrl = env.BOT_URL || process.env.BOT_URL
  const botSecret = env.BOT_SECRET || process.env.BOT_SECRET

  if (!botUrl || !botSecret) {
    console.warn("[BOT_API] BOT_URL or BOT_SECRET not set")
    return null
  }

  try {
    const response = await fetch(`${botUrl.replace(/\/+$/, "")}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": botSecret,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      console.error(`[BOT_API] ${path} → ${response.status}`)
      return null
    }

    return await response.json()
  } catch (err) {
    console.error(`[BOT_API] ${path} failed:`, err.message)
    return null
  }
}

// ════════════════════════════════════════════════════════════
//  Badges
// ════════════════════════════════════════════════════════════

function computeBadges(row, type) {
  const badges = []

  if (type === "economy") {
    const total = Number(row.total) || 0
    if (total >= 1_000_000) badges.push({ icon: "💎", label: "مليونير", color: "sky" })
    else if (total >= 100_000) badges.push({ icon: "🏦", label: "ثري", color: "amber" })
    else if (total >= 10_000) badges.push({ icon: "💰", label: "غني", color: "emerald" })

    const bank = Number(row.bank) || 0
    const coins = Number(row.coins) || 0
    if (bank > 0 && bank > coins * 3) badges.push({ icon: "🔐", label: "مدّخر", color: "violet" })
    if (coins > 0 && coins > bank * 3) badges.push({ icon: "💸", label: "منفق", color: "rose" })
  }

  if (type === "networth") {
    const nw = Number(row.net_worth) || 0
    if (nw >= 100_000_000) badges.push({ icon: "👑", label: "إمبراطور", color: "amber" })
    else if (nw >= 10_000_000) badges.push({ icon: "💎", label: "أرستقراطي", color: "sky" })
    else if (nw >= 1_000_000) badges.push({ icon: "🏰", label: "نخبة", color: "violet" })

    const items = Number(row.total_items) || 0
    if (items >= 100) badges.push({ icon: "📦", label: `${items} عنصر`, color: "emerald" })
    else if (items >= 30) badges.push({ icon: "🎒", label: "مجمّع", color: "rose" })
  }

  if (type === "items") {
    const total = Number(row.total_items) || 0
    const unique = Number(row.unique_items) || 0

    if (total >= 100) badges.push({ icon: "🏆", label: "مهووس", color: "amber" })
    else if (total >= 50) badges.push({ icon: "📦", label: "مجمّع", color: "sky" })
    if (unique >= 20) badges.push({ icon: "🌟", label: `${unique} نوع`, color: "violet" })
  }

  if (type === "xp") {
    const totalXp = Number(row.total_xp) || 0
    const servers = Number(row.servers_count) || 0
    const highestLevel = Number(row.highest_level) || 0

    if (totalXp >= 1_000_000) badges.push({ icon: "👑", label: "أسطورة", color: "amber" })
    else if (totalXp >= 100_000) badges.push({ icon: "⚡", label: "محترف", color: "sky" })
    else if (totalXp >= 10_000) badges.push({ icon: "🔥", label: "نشيط", color: "rose" })

    if (servers >= 10) badges.push({ icon: "🌍", label: "متعدد السيرفرات", color: "violet" })
    else if (servers >= 5) badges.push({ icon: "🎮", label: `${servers} سيرفرات`, color: "emerald" })

    if (highestLevel >= 100) badges.push({ icon: "🏆", label: "بطل", color: "amber" })
    else if (highestLevel >= 50) badges.push({ icon: "⭐", label: "نجم", color: "sky" })
  }

  return badges
}

// ════════════════════════════════════════════════════════════
//  GET /global/leaderboard/economy
// ════════════════════════════════════════════════════════════

router.get(
  "/global/leaderboard/economy",
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 100, 100)
    const cacheKey = `economy:${limit}`

    const cached = getCached(leaderboardCache, cacheKey, LEADERBOARD_TTL)
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
      [limit],
    ).catch(() => ({ rows: [] }))

    const userIds = r.rows.map((row) => row.user_id)
    const users = await fetchDiscordUsers(userIds)

    const leaderboard = r.rows.map((row, idx) => {
      const user = users[row.user_id] || { id: row.user_id, username: null }
      return {
        rank: idx + 1,
        user_id: row.user_id,
        username: user.global_name || user.username || `User ${row.user_id.slice(-6)}`,
        avatar_url: getAvatarUrl(user),
        coins: Number(row.coins) || 0,
        bank: Number(row.bank) || 0,
        total: Number(row.total) || 0,
        badges: computeBadges(row, "economy"),
      }
    })

    const result = {
      leaderboard,
      count: leaderboard.length,
      updated_at: new Date().toISOString(),
    }

    setCached(leaderboardCache, cacheKey, result)
    res.json(result)
  }),
)

// ════════════════════════════════════════════════════════════
//  GET /global/leaderboard/networth
//  يستدعي البوت لحساب القيمة الدقيقة
// ════════════════════════════════════════════════════════════

router.get(
  "/global/leaderboard/networth",
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 100, 100)
    const cacheKey = `networth:${limit}`

    const cached = getCached(leaderboardCache, cacheKey, LEADERBOARD_TTL)
    if (cached) return res.json(cached)

    // استدعاء البوت
    const botResponse = await callBot("/api/internal/leaderboard/networth", { limit })

    if (!botResponse || !Array.isArray(botResponse.leaderboard)) {
      return res.json({
        leaderboard: [],
        count: 0,
        error: "bot_unavailable",
        updated_at: new Date().toISOString(),
      })
    }

    const rawList = botResponse.leaderboard
    const userIds = rawList.map((row) => row.user_id)
    const users = await fetchDiscordUsers(userIds)

    const leaderboard = rawList.map((row, idx) => {
      const user = users[row.user_id] || { id: row.user_id, username: null }
      return {
        rank: idx + 1,
        user_id: row.user_id,
        username: user.global_name || user.username || `User ${row.user_id.slice(-6)}`,
        avatar_url: getAvatarUrl(user),
        coins: Number(row.coins) || 0,
        bank: Number(row.bank) || 0,
        cash_total: Number(row.cash_total) || 0,
        items_value: Number(row.items_value) || 0,
        total_items: Number(row.total_items) || 0,
        net_worth: Number(row.net_worth) || 0,
        badges: computeBadges(row, "networth"),
      }
    })

    const result = {
      leaderboard,
      count: leaderboard.length,
      updated_at: new Date().toISOString(),
    }

    setCached(leaderboardCache, cacheKey, result)
    res.json(result)
  }),
)

// ════════════════════════════════════════════════════════════
//  GET /global/leaderboard/items
//  يستدعي البوت
// ════════════════════════════════════════════════════════════

router.get(
  "/global/leaderboard/items",
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 100, 100)
    const cacheKey = `items:${limit}`

    const cached = getCached(leaderboardCache, cacheKey, LEADERBOARD_TTL)
    if (cached) return res.json(cached)

    const botResponse = await callBot("/api/internal/leaderboard/items", { limit })

    if (!botResponse || !Array.isArray(botResponse.leaderboard)) {
      return res.json({
        leaderboard: [],
        count: 0,
        error: "bot_unavailable",
        updated_at: new Date().toISOString(),
      })
    }

    const rawList = botResponse.leaderboard
    const userIds = rawList.map((row) => row.user_id)
    const users = await fetchDiscordUsers(userIds)

    const leaderboard = rawList.map((row, idx) => {
      const user = users[row.user_id] || { id: row.user_id, username: null }
      return {
        rank: idx + 1,
        user_id: row.user_id,
        username: user.global_name || user.username || `User ${row.user_id.slice(-6)}`,
        avatar_url: getAvatarUrl(user),
        total_items: Number(row.total_items) || 0,
        unique_items: Number(row.unique_items) || 0,
        coins: Number(row.coins) || 0,
        bank: Number(row.bank) || 0,
        items_value: Number(row.items_value) || 0,
        badges: computeBadges(row, "items"),
      }
    })

    const result = {
      leaderboard,
      count: leaderboard.length,
      updated_at: new Date().toISOString(),
    }

    setCached(leaderboardCache, cacheKey, result)
    res.json(result)
  }),
)

// ════════════════════════════════════════════════════════════
//  GET /global/leaderboard/xp
// ════════════════════════════════════════════════════════════

router.get(
  "/global/leaderboard/xp",
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 100, 100)
    const cacheKey = `xp:${limit}`

    const cached = getCached(leaderboardCache, cacheKey, LEADERBOARD_TTL)
    if (cached) return res.json(cached)

    const r = await query(
      `SELECT
         user_id,
         COUNT(DISTINCT guild_id)::int AS servers_count,
         SUM(level)::bigint AS total_levels,
         SUM(((level * (level - 1) * 50) + xp))::bigint AS total_xp,
         MAX(level)::int AS highest_level
       FROM xp
       WHERE xp > 0 OR level > 0
       GROUP BY user_id
       ORDER BY total_xp DESC
       LIMIT $1`,
      [limit],
    ).catch(() => ({ rows: [] }))

    const userIds = r.rows.map((row) => row.user_id)
    const users = await fetchDiscordUsers(userIds)

    const leaderboard = r.rows.map((row, idx) => {
      const user = users[row.user_id] || { id: row.user_id, username: null }
      return {
        rank: idx + 1,
        user_id: row.user_id,
        username: user.global_name || user.username || `User ${row.user_id.slice(-6)}`,
        avatar_url: getAvatarUrl(user),
        total_xp: Number(row.total_xp) || 0,
        total_levels: Number(row.total_levels) || 0,
        highest_level: Number(row.highest_level) || 0,
        servers_count: Number(row.servers_count) || 0,
        badges: computeBadges(row, "xp"),
      }
    })

    const result = {
      leaderboard,
      count: leaderboard.length,
      updated_at: new Date().toISOString(),
    }

    setCached(leaderboardCache, cacheKey, result)
    res.json(result)
  }),
)

// ════════════════════════════════════════════════════════════
//  GET /global/leaderboard/level
// ════════════════════════════════════════════════════════════

router.get(
  "/global/leaderboard/level",
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 100, 100)
    const cacheKey = `level:${limit}`

    const cached = getCached(leaderboardCache, cacheKey, LEADERBOARD_TTL)
    if (cached) return res.json(cached)

    const r = await query(
      `SELECT user_id, guild_id, level, xp,
              ((level * (level - 1) * 50) + xp)::bigint AS total_xp
       FROM xp
       WHERE level > 0
       ORDER BY level DESC, xp DESC
       LIMIT $1`,
      [limit],
    ).catch(() => ({ rows: [] }))

    const userIds = [...new Set(r.rows.map((row) => row.user_id))]
    const users = await fetchDiscordUsers(userIds)

    const leaderboard = r.rows.map((row, idx) => {
      const user = users[row.user_id] || { id: row.user_id, username: null }
      return {
        rank: idx + 1,
        user_id: row.user_id,
        username: user.global_name || user.username || `User ${row.user_id.slice(-6)}`,
        avatar_url: getAvatarUrl(user),
        guild_id: row.guild_id,
        level: Number(row.level) || 0,
        total_xp: Number(row.total_xp) || 0,
      }
    })

    const result = {
      leaderboard,
      count: leaderboard.length,
      updated_at: new Date().toISOString(),
    }

    setCached(leaderboardCache, cacheKey, result)
    res.json(result)
  }),
)

// ════════════════════════════════════════════════════════════
//  GET /global/stats
// ════════════════════════════════════════════════════════════

router.get(
  "/global/stats",
  requireAuth,
  asyncHandler(async (req, res) => {
    const cacheKey = "stats"
    const cached = getCached(leaderboardCache, cacheKey, LEADERBOARD_TTL)
    if (cached) return res.json(cached)

    const economyStats = await query(`
      SELECT
        COUNT(*)::int AS total_users,
        SUM(COALESCE(coins, 0) + COALESCE(bank, 0))::bigint AS total_money,
        MAX(COALESCE(coins, 0) + COALESCE(bank, 0))::bigint AS richest,
        AVG(COALESCE(coins, 0) + COALESCE(bank, 0))::bigint AS avg_balance
      FROM economy_users
      WHERE COALESCE(coins, 0) + COALESCE(bank, 0) > 0
    `).catch(() => ({ rows: [{}] }))

    const xpStats = await query(`
      SELECT
        COUNT(DISTINCT user_id)::int AS active_users,
        COUNT(DISTINCT guild_id)::int AS active_guilds,
        SUM(((level * (level - 1) * 50) + xp))::bigint AS total_xp,
        MAX(level)::int AS highest_level
      FROM xp
      WHERE level > 0 OR xp > 0
    `).catch(() => ({ rows: [{}] }))

    const itemsStats = await query(`
      SELECT
        COUNT(*) FILTER (
          WHERE jsonb_array_length(COALESCE(inventory, '[]'::jsonb)) > 0
        )::int AS active_collectors,
        COALESCE(SUM(
          (
            SELECT SUM(COALESCE((item->>'quantity')::int, 0))
            FROM jsonb_array_elements(COALESCE(inventory, '[]'::jsonb)) AS item
          )
        ), 0)::bigint AS total_items
      FROM economy_users
      WHERE inventory IS NOT NULL
        AND jsonb_array_length(COALESCE(inventory, '[]'::jsonb)) > 0
    `).catch(() => ({ rows: [{}] }))

    const guildStats = await query(`
      SELECT COUNT(DISTINCT guild_id)::int AS total_guilds FROM guilds
    `).catch(() => ({ rows: [{}] }))

    const result = {
      economy: {
        total_users: Number(economyStats.rows[0]?.total_users) || 0,
        total_money: Number(economyStats.rows[0]?.total_money) || 0,
        richest_balance: Number(economyStats.rows[0]?.richest) || 0,
        avg_balance: Number(economyStats.rows[0]?.avg_balance) || 0,
      },
      xp: {
        active_users: Number(xpStats.rows[0]?.active_users) || 0,
        active_guilds: Number(xpStats.rows[0]?.active_guilds) || 0,
        total_xp: Number(xpStats.rows[0]?.total_xp) || 0,
        highest_level: Number(xpStats.rows[0]?.highest_level) || 0,
      },
      items: {
        active_collectors: Number(itemsStats.rows[0]?.active_collectors) || 0,
        total_items: Number(itemsStats.rows[0]?.total_items) || 0,
      },
      guilds: {
        total: Number(guildStats.rows[0]?.total_guilds) || 0,
      },
      updated_at: new Date().toISOString(),
    }

    setCached(leaderboardCache, cacheKey, result)
    res.json(result)
  }),
)

// ════════════════════════════════════════════════════════════
//  GET /global/user/:userId
// ════════════════════════════════════════════════════════════

router.get(
  "/global/user/:userId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req.params

    if (!/^\d{15,22}$/.test(userId)) {
      return res.status(400).json({ error: "Invalid user ID" })
    }

    const discordUser = await fetchDiscordUser(userId)

    // ─── Economy ranks ───
    const ecoRank = await query(
      `
      SELECT (COUNT(*) + 1)::int AS rank FROM economy_users
      WHERE (COALESCE(coins, 0) + COALESCE(bank, 0)) >
            (SELECT COALESCE(coins, 0) + COALESCE(bank, 0) FROM economy_users WHERE user_id = $1)
    `,
      [userId],
    ).catch(() => ({ rows: [{}] }))

    // ─── XP data ───
    const xpData = await query(
      `
      SELECT
        COUNT(DISTINCT guild_id)::int AS servers,
        SUM(((level * (level - 1) * 50) + xp))::bigint AS total_xp,
        SUM(level)::int AS total_levels,
        MAX(level)::int AS highest_level
      FROM xp WHERE user_id = $1
    `,
      [userId],
    ).catch(() => ({ rows: [{}] }))

    const xpRank = await query(
      `
      WITH user_totals AS (
        SELECT user_id, SUM(((level * (level - 1) * 50) + xp)) AS total FROM xp GROUP BY user_id
      )
      SELECT (COUNT(*) + 1)::int AS rank FROM user_totals
      WHERE total > (SELECT COALESCE(SUM(((level * (level - 1) * 50) + xp)), 0) FROM xp WHERE user_id = $1)
    `,
      [userId],
    ).catch(() => ({ rows: [{}] }))

    // ─── Subscription ───
    const sub = await query(
      `SELECT plan_id, status, expires_at FROM subscriptions WHERE user_id = $1`,
      [userId],
    ).catch(() => ({ rows: [] }))

    // ─── Net worth + items من البوت ───
    const networthData = await callBot("/api/internal/networth-for-user", { userId }) || {}

    const xpRow = xpData.rows[0] || {}
    const subRow = sub.rows[0] || {}

    res.json({
      user_id: userId,
      username: discordUser.global_name || discordUser.username,
      avatar_url: getAvatarUrl(discordUser),
      banner: discordUser.banner,
      accent_color: discordUser.accent_color,
      economy: {
        coins: Number(networthData.coins) || 0,
        bank: Number(networthData.bank) || 0,
        total: Number(networthData.cash_total) || 0,
        rank: Number(ecoRank.rows[0]?.rank) || null,
      },
      networth: {
        cash_total: Number(networthData.cash_total) || 0,
        items_value: Number(networthData.items_value) || 0,
        total_items: Number(networthData.total_items) || 0,
        net_worth: Number(networthData.net_worth) || 0,
      },
      xp: {
        servers: Number(xpRow.servers) || 0,
        total_xp: Number(xpRow.total_xp) || 0,
        total_levels: Number(xpRow.total_levels) || 0,
        highest_level: Number(xpRow.highest_level) || 0,
        rank: Number(xpRank.rows[0]?.rank) || null,
      },
      subscription: subRow.plan_id
        ? {
            plan_id: subRow.plan_id,
            status: subRow.status,
            expires_at: subRow.expires_at,
          }
        : null,
    })
  }),
)

module.exports = router