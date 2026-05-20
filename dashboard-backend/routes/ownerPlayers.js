/**
 * ═══════════════════════════════════════════════════════════
 *  Owner Players Routes
 *  المسار: dashboard-backend/routes/ownerPlayers.js
 *
 *  Endpoints (Owner only):
 *   • GET    /api/owner/players/stats              — إحصائيات شاملة
 *   • GET    /api/owner/players                    — قائمة paginated
 *   • GET    /api/owner/players/:userId            — تفاصيل لاعب واحد
 *   • POST   /api/owner/players/:userId/dm         — إرسال DM للاعب
 *
 *  ⚠️ كل endpoint محمي بـ requireAuth + requireOwner
 *  ⚠️ نتجنب callBot في القائمة (سرعة) — نستخدمه فقط في التفاصيل
 *
 *  Trial: يستخدم نفس endpoint موجود في routes/subscription.js
 *         (POST /api/admin/subscriptions/grant-trial)
 * ═══════════════════════════════════════════════════════════
 */

const express = require("express")
const { asyncHandler, ApiError } = require("../middleware/error")
const { requireAuth, requireOwner } = require("../middleware/auth")
const { query } = require("../config/database")
const env = require("../config/env")

const router = express.Router()

// ════════════════════════════════════════════════════════════
//  Cache (60s للقوائم، 30s للتفاصيل)
// ════════════════════════════════════════════════════════════

const cache = new Map()
const CACHE_TTL = 60 * 1000

function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.time > entry.ttl) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCached(key, data, ttl = CACHE_TTL) {
  cache.set(key, { data, time: Date.now(), ttl })
  if (cache.size > 50) {
    const firstKey = cache.keys().next().value
    cache.delete(firstKey)
  }
}

// ════════════════════════════════════════════════════════════
//  Bot API helper (للتفاصيل فقط)
// ════════════════════════════════════════════════════════════

async function callBot(path, body = {}) {
  const botUrl = env.BOT_URL || process.env.BOT_URL
  const botSecret = env.BOT_SECRET || process.env.BOT_SECRET

  if (!botUrl || !botSecret) {
    console.warn("[OWNER_PLAYERS_BOT] BOT_URL or BOT_SECRET not set")
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
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.error(`[OWNER_PLAYERS_BOT] ${path} → ${response.status}`)
      return null
    }
    return await response.json()
  } catch (err) {
    console.error(`[OWNER_PLAYERS_BOT] ${path} failed:`, err.message)
    return null
  }
}

// ════════════════════════════════════════════════════════════
//  Discord users helper (cached 30 min)
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

async function fetchDiscordUsersBatch(userIds) {
  const unique = [...new Set(userIds.filter(Boolean))]
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
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`
  }
  try {
    const idx = (BigInt(user.id) >> 22n) % 6n
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`
  } catch {
    return `https://cdn.discordapp.com/embed/avatars/0.png`
  }
}

function getBannerUrl(user) {
  if (!user?.banner) return null
  const ext = user.banner.startsWith("a_") ? "gif" : "png"
  return `https://cdn.discordapp.com/banners/${user.id}/${user.banner}.${ext}?size=1024`
}

// ════════════════════════════════════════════════════════════
//  GET /api/owner/players/stats
//  إحصائيات شاملة (إجمالي + يومي + أسبوعي + شهري)
// ════════════════════════════════════════════════════════════

router.get(
  "/owner/players/stats",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const cacheKey = "players:stats"
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    // ─── إجمالي اللاعبين (UNION من economy_users + xp) ───
    const totalRes = await query(
      `
      SELECT COUNT(*)::int AS total
      FROM (
        SELECT user_id FROM economy_users
        UNION
        SELECT DISTINCT user_id FROM xp
      ) AS players
      `
    ).catch(() => ({ rows: [{ total: 0 }] }))

    // ─── نشط اليوم/الأسبوع/الشهر (من ai_usage_log) ───
    const activityRes = await query(
      `
      SELECT
        COUNT(DISTINCT CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN user_id END)::int AS today,
        COUNT(DISTINCT CASE WHEN created_at >= NOW() - INTERVAL '7 days'   THEN user_id END)::int AS week,
        COUNT(DISTINCT CASE WHEN created_at >= NOW() - INTERVAL '30 days'  THEN user_id END)::int AS month
      FROM ai_usage_log
      `
    ).catch(() => ({ rows: [{ today: 0, week: 0, month: 0 }] }))

    // ─── معدّل النشاط اليومي (آخر 7 أيام) ───
    const avgRes = await query(
      `
      SELECT ROUND(AVG(daily_users)::numeric, 0)::int AS avg_daily
      FROM (
        SELECT DATE(created_at) AS day, COUNT(DISTINCT user_id) AS daily_users
        FROM ai_usage_log
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
      ) AS daily
      `
    ).catch(() => ({ rows: [{ avg_daily: 0 }] }))

    const result = {
      total: Number(totalRes.rows[0]?.total) || 0,
      active_today: Number(activityRes.rows[0]?.today) || 0,
      active_week: Number(activityRes.rows[0]?.week) || 0,
      active_month: Number(activityRes.rows[0]?.month) || 0,
      avg_daily: Number(avgRes.rows[0]?.avg_daily) || 0,
      updated_at: new Date().toISOString(),
    }

    setCached(cacheKey, result)
    res.json(result)
  })
)

// ════════════════════════════════════════════════════════════
//  GET /api/owner/players
//  قائمة paginated مع بحث وفرز
//
//  Query params:
//   - search: نص البحث (ID أو user_id)
//   - sort: recent | xp | wealth | newest
//   - page: رقم الصفحة (1-based)
//   - limit: 50 (افتراضي)
// ════════════════════════════════════════════════════════════

router.get(
  "/owner/players",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const search = (req.query.search || "").trim()
    const sort = req.query.sort || "recent"
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit, 10) || 50))
    const offset = (page - 1) * limit

    const cacheKey = `players:${search}:${sort}:${page}:${limit}`
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    // ─── بناء الاستعلام ───
    // CTE: نجمع كل user_id من economy_users + xp + ai_usage_log
    // مع بيانات أساسية (coins من economy_users، xp مجموع من xp، آخر نشاط من ai_usage_log)

    let orderClause = ""
    switch (sort) {
      case "xp":
        orderClause = "ORDER BY total_xp DESC NULLS LAST"
        break
      case "wealth":
        orderClause = "ORDER BY coins DESC NULLS LAST"
        break
      case "newest":
        orderClause = "ORDER BY last_active DESC NULLS LAST"
        break
      case "recent":
      default:
        // الأكثر نشاطاً = أعلى عدد استخدامات AI في آخر 7 أيام
        orderClause = "ORDER BY recent_activity DESC NULLS LAST, last_active DESC NULLS LAST"
        break
    }

    // ─── شرط البحث (ID فقط، لأن الـ DB ما عنده username) ───
    let searchClause = ""
    const params = []

    if (search) {
      // نقبل: ID كامل (15-22 رقم) أو جزء منه (يبدأ بـ رقم)
      if (/^\d+$/.test(search)) {
        searchClause = `WHERE user_id LIKE $1`
        params.push(`%${search}%`)
      } else {
        // بحث بنص — لاحقاً سنفلتر بـ username بعد جلب discord users
        // للحين نرجع كل اللاعبين ونفلتر في JS
        searchClause = ""
      }
    }

    // ─── الاستعلام الرئيسي ───
    // ملاحظة: نستخدم total_xp = SUM((level*(level-1)*50) + xp) — نفس صيغة globalLeaderboards
    const sql = `
      WITH all_players AS (
        SELECT user_id FROM economy_users
        UNION
        SELECT DISTINCT user_id FROM xp
      ),
      eco AS (
        SELECT user_id, COALESCE(coins, 0)::bigint AS coins
        FROM economy_users
      ),
      xp_agg AS (
        SELECT
          user_id,
          COUNT(DISTINCT guild_id)::int AS servers_count,
          SUM(((level * (level - 1) * 50) + xp))::bigint AS total_xp,
          MAX(level)::int AS highest_level
        FROM xp
        GROUP BY user_id
      ),
      activity AS (
        SELECT
          user_id,
          MAX(created_at) AS last_active,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS recent_activity
        FROM ai_usage_log
        GROUP BY user_id
      ),
      subs AS (
        SELECT user_id, plan_id, status, expires_at, is_trial
        FROM subscriptions
      )
      SELECT
        p.user_id,
        COALESCE(eco.coins, 0)::bigint AS coins,
        COALESCE(xp_agg.servers_count, 0) AS servers_count,
        COALESCE(xp_agg.total_xp, 0)::bigint AS total_xp,
        COALESCE(xp_agg.highest_level, 0) AS highest_level,
        activity.last_active,
        COALESCE(activity.recent_activity, 0) AS recent_activity,
        subs.plan_id,
        subs.status AS sub_status,
        subs.expires_at AS sub_expires_at,
        subs.is_trial,
        COUNT(*) OVER() AS total_count
      FROM all_players p
      LEFT JOIN eco      ON eco.user_id      = p.user_id
      LEFT JOIN xp_agg   ON xp_agg.user_id   = p.user_id
      LEFT JOIN activity ON activity.user_id = p.user_id
      LEFT JOIN subs     ON subs.user_id     = p.user_id
      ${searchClause}
      ${orderClause}
      LIMIT ${limit} OFFSET ${offset}
    `

    const result = await query(sql, params).catch((err) => {
      console.error("[OWNER_PLAYERS] List query failed:", err.message)
      return { rows: [] }
    })

    const rows = result.rows || []
    const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0

    // ─── جلب Discord users (avatars + usernames) ───
    const userIds = rows.map((r) => r.user_id)
    const discordUsers = await fetchDiscordUsersBatch(userIds)

    // ─── دمج البيانات ───
    let players = rows.map((row) => {
      const du = discordUsers[row.user_id] || { id: row.user_id }
      return {
        user_id: row.user_id,
        username: du.global_name || du.username || `User ${row.user_id.slice(-6)}`,
        avatar_url: getAvatarUrl(du),
        coins: Number(row.coins) || 0,
        servers_count: Number(row.servers_count) || 0,
        total_xp: Number(row.total_xp) || 0,
        highest_level: Number(row.highest_level) || 0,
        last_active: row.last_active,
        recent_activity: Number(row.recent_activity) || 0,
        subscription: row.plan_id
          ? {
              plan_id: row.plan_id,
              status: row.sub_status,
              expires_at: row.sub_expires_at,
              is_trial: row.is_trial || false,
            }
          : null,
      }
    })

    // ─── فلترة بالاسم (لو البحث نص مش رقم) ───
    if (search && !/^\d+$/.test(search)) {
      const q = search.toLowerCase()
      players = players.filter((p) => p.username.toLowerCase().includes(q))
    }

    const response = {
      players,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: Math.max(1, Math.ceil(totalCount / limit)),
      },
      updated_at: new Date().toISOString(),
    }

    setCached(cacheKey, response)
    res.json(response)
  })
)

// ════════════════════════════════════════════════════════════
//  GET /api/owner/players/:userId
//  تفاصيل لاعب واحد كاملة (هنا فقط نستخدم callBot)
// ════════════════════════════════════════════════════════════

router.get(
  "/owner/players/:userId",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const { userId } = req.params

    if (!/^\d{15,22}$/.test(userId)) {
      throw new ApiError("Invalid user ID", 400)
    }

    const cacheKey = `player-detail:${userId}`
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    // ─── Discord user (avatar + banner) ───
    const discordUser = await fetchDiscordUser(userId)

    // ─── XP per server ───
    const xpPerServer = await query(
      `
      SELECT
        guild_id,
        COALESCE(level, 0) AS level,
        COALESCE(xp, 0) AS xp,
        ((level * (level - 1) * 50) + xp)::bigint AS total_xp
      FROM xp
      WHERE user_id = $1
      ORDER BY level DESC, xp DESC
      LIMIT 20
      `,
      [userId]
    ).catch(() => ({ rows: [] }))

    // ─── XP totals ───
    const xpTotals = await query(
      `
      SELECT
        COUNT(DISTINCT guild_id)::int AS servers_count,
        SUM(((level * (level - 1) * 50) + xp))::bigint AS total_xp,
        SUM(level)::int AS total_levels,
        MAX(level)::int AS highest_level
      FROM xp WHERE user_id = $1
      `,
      [userId]
    ).catch(() => ({ rows: [{}] }))

    // ─── Subscription ───
    const subRes = await query(
      `SELECT plan_id, status, expires_at, is_trial, trial_notes, created_at, updated_at
       FROM subscriptions WHERE user_id = $1 LIMIT 1`,
      [userId]
    ).catch(() => ({ rows: [] }))

    // ─── Activity stats ───
    const activityRes = await query(
      `
      SELECT
        COUNT(*)::int AS total_ai_uses,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS today,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS week,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS month,
        MAX(created_at) AS last_ai_use
      FROM ai_usage_log WHERE user_id = $1
      `,
      [userId]
    ).catch(() => ({ rows: [{}] }))

    // ─── Networth (callBot — هنا فقط) ───
    const networth = (await callBot("/api/internal/networth-for-user", { userId })) || {
      coins: 0,
      cash_total: 0,
      items_value: 0,
      total_items: 0,
      net_worth: 0,
    }

    // ─── Guild subscriptions (لو هو مالك سيرفر) ───
    const ownedGuilds = await query(
      `SELECT guild_id FROM guild_subscriptions WHERE owner_id = $1`,
      [userId]
    ).catch(() => ({ rows: [] }))

    const xpRow = xpTotals.rows[0] || {}
    const actRow = activityRes.rows[0] || {}

    const result = {
      user_id: userId,
      username: discordUser.global_name || discordUser.username || `User ${userId.slice(-6)}`,
      tag: discordUser.username
        ? `${discordUser.username}${discordUser.discriminator && discordUser.discriminator !== "0" ? "#" + discordUser.discriminator : ""}`
        : null,
      avatar_url: getAvatarUrl(discordUser),
      banner_url: getBannerUrl(discordUser),
      accent_color: discordUser.accent_color || null,
      discord_created_at: discordUser.id
        ? new Date(Number((BigInt(discordUser.id) >> 22n) + 1420070400000n)).toISOString()
        : null,

      economy: {
        coins: Number(networth.coins) || 0,
        items_value: Number(networth.items_value) || 0,
        total_items: Number(networth.total_items) || 0,
        net_worth: Number(networth.net_worth) || 0,
      },

      xp: {
        servers_count: Number(xpRow.servers_count) || 0,
        total_xp: Number(xpRow.total_xp) || 0,
        total_levels: Number(xpRow.total_levels) || 0,
        highest_level: Number(xpRow.highest_level) || 0,
        per_server: (xpPerServer.rows || []).map((r) => ({
          guild_id: r.guild_id,
          level: Number(r.level) || 0,
          xp: Number(r.xp) || 0,
          total_xp: Number(r.total_xp) || 0,
        })),
      },

      activity: {
        total_ai_uses: Number(actRow.total_ai_uses) || 0,
        today: Number(actRow.today) || 0,
        week: Number(actRow.week) || 0,
        month: Number(actRow.month) || 0,
        last_ai_use: actRow.last_ai_use,
      },

      subscription: subRes.rows[0] || null,
      owned_guilds: (ownedGuilds.rows || []).map((r) => r.guild_id),

      updated_at: new Date().toISOString(),
    }

    setCached(cacheKey, result, 30 * 1000) // 30s فقط للتفاصيل
    res.json(result)
  })
)

// ════════════════════════════════════════════════════════════
//  POST /api/owner/players/:userId/dm
//  إرسال DM للاعب
// ════════════════════════════════════════════════════════════

router.post(
  "/owner/players/:userId/dm",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const { userId } = req.params
    const { message } = req.body || {}

    if (!/^\d{15,22}$/.test(userId)) {
      throw new ApiError("Invalid user ID", 400)
    }

    if (!message || typeof message !== "string") {
      throw new ApiError("الرسالة مطلوبة", 400)
    }

    if (message.length > 2000) {
      throw new ApiError("الرسالة طويلة جداً (الحد 2000 حرف)", 400)
    }

    const result = await callBot("/api/internal/owner/dm-user", {
      userId,
      message,
      fromOwnerId: req.user.id,
    })

    if (!result?.success) {
      throw new ApiError(
        result?.error || "فشل إرسال الرسالة (المستخدم قافل DMs أو البوت غير متاح)",
        400
      )
    }

    res.json({ success: true, sent_to: result.recipient_id })
  })
)

module.exports = router