/**
 * ═══════════════════════════════════════════════════════════
 *  Global Leaderboards Routes — v5 (Simplified Edition)
 *  المسار: dashboard-backend/routes/globalLeaderboards.js
 *
 *  ✨ التغييرات في v5:
 *   - حذف ?period= نهائياً (الداش = All-time فقط)
 *   - إزالة كل ذكر لـ bank (العمود غير موجود)
 *   - تبسيط الـ caching
 *   - إصلاح /global/stats لقراءة guilds من 4 مصادر
 *
 *  Endpoints:
 *   • GET /api/global/leaderboard/economy   — أغنى 100 لاعب (DB)
 *   • GET /api/global/leaderboard/networth  — أعلى ثروة (يستدعي البوت)
 *   • GET /api/global/leaderboard/items     — أكثر ممتلكات (يستدعي البوت)
 *   • GET /api/global/leaderboard/xp        — أعلى XP إجمالي (DB)
 *   • GET /api/global/leaderboard/level     — أعلى مستوى (DB)
 *   • GET /api/global/stats                 — إحصائيات عامة
 *   • GET /api/global/user/:userId          — بروفايل لاعب
 * ═══════════════════════════════════════════════════════════
 */

const express = require("express")
const { asyncHandler } = require("../middleware/error")
const { requireAuth } = require("../middleware/auth")
const { query } = require("../config/database")
const env = require("../config/env")

const router = express.Router()
// ════════════════════════════════════════════════════════════
//  Helper: حساب ترتيب المستخدم الحالي + بياناته
// ════════════════════════════════════════════════════════════

/**
 * يفحص لو user_id موجود في الـ leaderboard.
 * لو موجود → يرجع null (لأنه ظاهر أصلاً)
 * لو غير موجود → يرجع { rank, ...user_data } للعرض بالأسفل
 */
function buildMyPosition(leaderboard, userId, allRanks) {
  if (!userId) return null

  // لو موجود في التوب → لا داعي لعرض صف إضافي
  const inTop = leaderboard.some(r => r.user_id === userId)
  if (inTop) return null

  // ابحث عن المستخدم في الـ allRanks (كل اللاعبين)
  const me = allRanks.find(r => r.user_id === userId)
  if (!me) return null

  return me
}
// ════════════════════════════════════════════════════════════
//  In-memory cache (5 minutes)
// ════════════════════════════════════════════════════════════

const leaderboardCache = new Map()
const LEADERBOARD_TTL = 5 * 60 * 1000

function getCached(key) {
  const entry = leaderboardCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.time > LEADERBOARD_TTL) {
    leaderboardCache.delete(key)
    return null
  }
  return entry.data
}

function setCached(key, data) {
  leaderboardCache.set(key, { data, time: Date.now() })

  if (leaderboardCache.size > 100) {
    const firstKey = leaderboardCache.keys().next().value
    leaderboardCache.delete(firstKey)
  }
}

// ════════════════════════════════════════════════════════════
//  Discord users (cached 30 min)
// ════════════════════════════════════════════════════════════

const userCache = new Map()
const USER_CACHE_TTL = 30 * 60 * 1000

async function fetchDiscordUser(userId) {
  const cached = userCache.get(userId)
  if (cached && Date.now() - cached.time < USER_CACHE_TTL) {
    return cached.data
  }

  const botToken = env.BOT_TOKEN || process.env.BOT_TOKEN
  if (!botToken) {
    return { id: userId, username: null, global_name: null, avatar: null }
  }

  try {
    const response = await fetch(`https://discord.com/api/v10/users/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      const fallback = { id: userId, username: null, global_name: null, avatar: null }
      userCache.set(userId, { data: fallback, time: Date.now() })
      return fallback
    }

    const user = await response.json()
    userCache.set(userId, { data: user, time: Date.now() })
    return user
  } catch {
    return { id: userId, username: null, global_name: null, avatar: null }
  }
}

async function fetchDiscordUsers(userIds) {
  const unique = [...new Set(userIds)]
  const results = await Promise.allSettled(unique.map(fetchDiscordUser))
  const map = {}
  for (let i = 0; i < unique.length; i++) {
    const r = results[i]
    map[unique[i]] = r.status === "fulfilled" ? r.value : { id: unique[i] }
  }
  return map
}

function getAvatarUrl(user) {
  if (!user) return `https://cdn.discordapp.com/embed/avatars/0.png`
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
//  Bot API Call
// ════════════════════════════════════════════════════════════

async function callBot(path, body = {}) {
  const botUrl = env.BOT_URL || process.env.BOT_URL
  const botSecret = env.BOT_SECRET || process.env.BOT_SECRET

  if (!botUrl || !botSecret) return null

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

    if (servers >= 10) badges.push({ icon: "🌍", label: "متعدد", color: "violet" })
    else if (servers >= 5) badges.push({ icon: "🎮", label: `${servers} سيرفرات`, color: "emerald" })

    if (highestLevel >= 100) badges.push({ icon: "🏆", label: "بطل", color: "amber" })
    else if (highestLevel >= 50) badges.push({ icon: "⭐", label: "نجم", color: "sky" })
  }

  if (type === "level") {
    const level = Number(row.level) || 0
    if (level >= 100) badges.push({ icon: "👑", label: "أسطورة", color: "amber" })
    else if (level >= 50) badges.push({ icon: "⭐", label: "نخبة", color: "sky" })
    else if (level >= 25) badges.push({ icon: "🔥", label: "متقدم", color: "rose" })
    else if (level >= 10) badges.push({ icon: "📈", label: "صاعد", color: "emerald" })
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

    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    const r = await query(
      `SELECT user_id,
              COALESCE(coins, 0)::bigint AS coins
       FROM economy_users
       WHERE COALESCE(coins, 0) > 0
       ORDER BY coins DESC
       LIMIT $1`,
      [limit]
    ).catch(() => ({ rows: [] }))

    const userIds = r.rows.map((row) => row.user_id)
    const users = await fetchDiscordUsers(userIds)

    const leaderboard = r.rows.map((row, idx) => {
      const coins = Number(row.coins) || 0
      const user = users[row.user_id] || { id: row.user_id }
      return {
        rank: idx + 1,
        user_id: row.user_id,
        username: user.global_name || user.username || `User ${row.user_id.slice(-6)}`,
        avatar_url: getAvatarUrl(user),
        coins,
        bank: 0,
        total: coins,
        badges: computeBadges({ total: coins }, "economy"),
      }
    })

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
//  GET /global/leaderboard/networth
// ════════════════════════════════════════════════════════════

router.get(
  "/global/leaderboard/networth",
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 100, 100)
    const cacheKey = `networth:${limit}`

    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

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
      const user = users[row.user_id] || { id: row.user_id }
      return {
        rank: idx + 1,
        user_id: row.user_id,
        username: user.global_name || user.username || `User ${row.user_id.slice(-6)}`,
        avatar_url: getAvatarUrl(user),
        coins: Number(row.coins) || 0,
        bank: 0,
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

    setCached(cacheKey, result)
    res.json(result)
  })
)

// ════════════════════════════════════════════════════════════
//  GET /global/leaderboard/items
// ════════════════════════════════════════════════════════════

router.get(
  "/global/leaderboard/items",
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 100, 100)
    const cacheKey = `items:${limit}`

    const cached = getCached(cacheKey)
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
      const user = users[row.user_id] || { id: row.user_id }
      return {
        rank: idx + 1,
        user_id: row.user_id,
        username: user.global_name || user.username || `User ${row.user_id.slice(-6)}`,
        avatar_url: getAvatarUrl(user),
        total_items: Number(row.total_items) || 0,
        unique_items: Number(row.unique_items) || 0,
        coins: Number(row.coins) || 0,
        bank: 0,
        items_value: Number(row.items_value) || 0,
        badges: computeBadges(row, "items"),
      }
    })

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
//  GET /global/leaderboard/xp
// ════════════════════════════════════════════════════════════

router.get(
  "/global/leaderboard/xp",
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 100, 100)
    const cacheKey = `xp:${limit}`

    const cached = getCached(cacheKey)
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
      [limit]
    ).catch(() => ({ rows: [] }))

    const userIds = r.rows.map((row) => row.user_id)
    const users = await fetchDiscordUsers(userIds)

    const leaderboard = r.rows.map((row, idx) => {
      const user = users[row.user_id] || { id: row.user_id }
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

    setCached(cacheKey, result)
    res.json(result)
  })
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

    const userIds = [...new Set((r.rows || []).map((row) => row.user_id))]
    const users = await fetchDiscordUsers(userIds)

    const leaderboard = (r.rows || []).map((row, idx) => {
      const user = users[row.user_id] || { id: row.user_id }
      return {
        rank: idx + 1,
        user_id: row.user_id,
        username: user.global_name || user.username || `User ${row.user_id.slice(-6)}`,
        avatar_url: getAvatarUrl(user),
        guild_id: row.guild_id,
        level: Number(row.level) || 0,
        total_xp: Number(row.total_xp) || 0,
        badges: computeBadges({ level: row.level }, "level"),
      }
    })

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
//  GET /global/stats
// ════════════════════════════════════════════════════════════

router.get(
  "/global/stats",
  requireAuth,
  asyncHandler(async (req, res) => {
    const cacheKey = "stats"
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    // ✅ بدون bank
    const economyStats = await query(`
      SELECT
        COUNT(*)::int AS total_users,
        SUM(COALESCE(coins, 0))::bigint AS total_money,
        MAX(COALESCE(coins, 0))::bigint AS richest,
        AVG(COALESCE(coins, 0))::bigint AS avg_balance
      FROM economy_users
      WHERE COALESCE(coins, 0) > 0
    `).catch(() => ({ rows: [{}] }))

    // ✨ Total net worth (coins + items value) — من البوت
    let totalNetWorth = 0
    try {
      const nwResponse = await callBot("/api/internal/leaderboard/networth", { limit: 100 })
      if (nwResponse?.leaderboard) {
        totalNetWorth = nwResponse.leaderboard.reduce(
          (sum, p) => sum + (Number(p.net_worth) || 0),
          0
        )
      }
    } catch {}

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

    // عدد السيرفرات من 4 مصادر + البوت live (يأخذ الأكبر)
    const guildSources = await Promise.allSettled([
      query(`SELECT COUNT(DISTINCT id)::int AS total FROM guilds`),
      query(`SELECT COUNT(DISTINCT guild_id)::int AS total FROM guild_subscriptions`),
      query(`SELECT COUNT(DISTINCT guild_id)::int AS total FROM xp WHERE level > 0 OR xp > 0`),
      query(`SELECT COUNT(DISTINCT guild_id)::int AS total FROM stats_counters`),
    ])

    let guildCount = 0
    for (const r of guildSources) {
      if (r.status === "fulfilled") {
        const n = Number(r.value?.rows?.[0]?.total) || 0
        if (n > guildCount) guildCount = n
      }
    }

    try {
      const botStats = await callBot("/api/internal/bot-stats", {})
      const botGuilds = Number(botStats?.guild_count) || 0
      if (botGuilds > guildCount) guildCount = botGuilds
    } catch {}

    const result = {
      economy: {
        total_users: Number(economyStats.rows[0]?.total_users) || 0,
        total_money: Number(economyStats.rows[0]?.total_money) || 0,
        total_net_worth: totalNetWorth,
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
        total: guildCount,
      },
      updated_at: new Date().toISOString(),
    }

    setCached(cacheKey, result)
    res.json(result)
  })
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

    // ✅ Economy rank بدون bank
    const ecoRank = await query(
      `
      SELECT (COUNT(*) + 1)::int AS rank FROM economy_users
      WHERE COALESCE(coins, 0) >
            (SELECT COALESCE(coins, 0) FROM economy_users WHERE user_id = $1)
    `,
      [userId]
    ).catch(() => ({ rows: [{}] }))

    const xpData = await query(
      `
      SELECT
        COUNT(DISTINCT guild_id)::int AS servers,
        SUM(((level * (level - 1) * 50) + xp))::bigint AS total_xp,
        SUM(level)::int AS total_levels,
        MAX(level)::int AS highest_level
      FROM xp WHERE user_id = $1
    `,
      [userId]
    ).catch(() => ({ rows: [{}] }))

    const xpRank = await query(
      `
      WITH user_totals AS (
        SELECT user_id, SUM(((level * (level - 1) * 50) + xp)) AS total FROM xp GROUP BY user_id
      )
      SELECT (COUNT(*) + 1)::int AS rank FROM user_totals
      WHERE total > (SELECT COALESCE(SUM(((level * (level - 1) * 50) + xp)), 0) FROM xp WHERE user_id = $1)
    `,
      [userId]
    ).catch(() => ({ rows: [{}] }))

    const sub = await query(
      `SELECT plan_id, status, expires_at FROM subscriptions WHERE user_id = $1`,
      [userId]
    ).catch(() => ({ rows: [] }))

    const networthData = (await callBot("/api/internal/networth-for-user", { userId })) || {}

    const xpRow = xpData.rows[0] || {}
    const subRow = sub.rows[0] || {}

    res.json({
      user_id: userId,
      username: discordUser.global_name || discordUser.username || `User ${userId.slice(-6)}`,
      avatar_url: getAvatarUrl(discordUser),
      banner: discordUser.banner,
      accent_color: discordUser.accent_color,
      economy: {
        coins: Number(networthData.coins) || 0,
        bank: 0,
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
  })
)

// ════════════════════════════════════════════════════════════
//  GET /global/me
//  يرجّع إحصائيات المستخدم الحالي الشخصية + ترتيبه في كل فئة
// ════════════════════════════════════════════════════════════

router.get(
  "/global/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const cacheKey = `me:${userId}`

    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    // ─── Economy (coins + rank) ───
    const ecoResult = await query(
      `SELECT
         COALESCE(coins, 0)::bigint AS coins,
         (
           SELECT COUNT(*) + 1
           FROM economy_users e2
           WHERE COALESCE(e2.coins, 0) >
                 (SELECT COALESCE(coins, 0) FROM economy_users WHERE user_id = $1)
         )::int AS rank
       FROM economy_users
       WHERE user_id = $1`,
      [userId]
    ).catch(() => ({ rows: [{}] }))

    const myCoins = Number(ecoResult.rows[0]?.coins) || 0
    const myEcoRank = Number(ecoResult.rows[0]?.rank) || null

    // ─── XP + Level (مجموع كل السيرفرات) ───
    const xpResult = await query(
      `SELECT
         COUNT(DISTINCT guild_id)::int AS servers_count,
         SUM(level)::int AS total_levels,
         SUM(((level * (level - 1) * 50) + xp))::bigint AS total_xp,
         MAX(level)::int AS highest_level
       FROM xp WHERE user_id = $1`,
      [userId]
    ).catch(() => ({ rows: [{}] }))

    const myTotalXp = Number(xpResult.rows[0]?.total_xp) || 0
    const myHighestLevel = Number(xpResult.rows[0]?.highest_level) || 0
    const myServersCount = Number(xpResult.rows[0]?.servers_count) || 0

    // ─── XP rank ───
    const xpRank = await query(
      `
      WITH user_totals AS (
        SELECT user_id, SUM(((level * (level - 1) * 50) + xp)) AS total
        FROM xp GROUP BY user_id
      )
      SELECT (COUNT(*) + 1)::int AS rank FROM user_totals
      WHERE total > (
        SELECT COALESCE(SUM(((level * (level - 1) * 50) + xp)), 0)
        FROM xp WHERE user_id = $1
      )
    `,
      [userId]
    ).catch(() => ({ rows: [{}] }))

    // ─── Level rank ───
    const levelRank = await query(
      `SELECT (COUNT(*) + 1)::int AS rank FROM xp
       WHERE level > $1
         OR (level = $1 AND xp > (SELECT COALESCE(MAX(xp), 0) FROM xp WHERE user_id = $2 AND level = $1))`,
      [myHighestLevel, userId]
    ).catch(() => ({ rows: [{}] }))

    // ─── Net worth + items من البوت ───
    const networthData = (await callBot("/api/internal/networth-for-user", { userId })) || {}
    const myItemsCount = Number(networthData.total_items) || 0
    const myItemsValue = Number(networthData.items_value) || 0
    const myNetWorth = Number(networthData.net_worth) || (myCoins + myItemsValue)

    // ─── Items rank — من البوت ───
    let myItemsRank = null
    let myNetworthRank = null
    try {
      const itemsResp = await callBot("/api/internal/rank-for-user", {
        userId,
        type: "items",
      })
      if (itemsResp?.rank) myItemsRank = Number(itemsResp.rank)

      const nwResp = await callBot("/api/internal/rank-for-user", {
        userId,
        type: "networth",
      })
      if (nwResp?.rank) myNetworthRank = Number(nwResp.rank)
    } catch {
      // البوت غير متاح — نكمل بدون ranks
    }

    const result = {
      user_id: userId,
      username: req.user.username,
      avatar: req.user.avatar,
      stats: {
        level: {
          value: myHighestLevel,
          rank: Number(levelRank.rows[0]?.rank) || null,
        },
        items: {
          value: myItemsCount,
          rank: myItemsRank,
        },
        coins: {
          value: myCoins,
          rank: myEcoRank,
        },
        xp: {
          value: myTotalXp,
          rank: Number(xpRank.rows[0]?.rank) || null,
          servers_count: myServersCount,
        },
        networth: {
          value: myNetWorth,
          rank: myNetworthRank,
        },
      },
      updated_at: new Date().toISOString(),
    }

    setCached(cacheKey, result)
    res.json(result)
  })
)

module.exports = router