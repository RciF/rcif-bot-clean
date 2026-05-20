/**
 * ═══════════════════════════════════════════════════════════
 *  Owner Servers Routes
 *  المسار: dashboard-backend/routes/ownerServers.js
 *
 *  Endpoints (Owner only):
 *   • GET    /api/owner/servers              — قائمة كل السيرفرات
 *   • GET    /api/owner/servers/:guildId     — تفاصيل سيرفر واحد
 *   • POST   /api/owner/servers/:guildId/message-owner  — رسالة DM لمالك السيرفر
 *   • DELETE /api/owner/servers/:guildId/leave          — خروج البوت من السيرفر
 *
 *  ⚠️ كل endpoint محمي بـ requireAuth + requireOwner
 *  ⚠️ يستدعي البوت عبر callBot للحصول على live data
 * ═══════════════════════════════════════════════════════════
 */

const express = require("express")
const { asyncHandler, ApiError } = require("../middleware/error")
const { requireAuth, requireOwner } = require("../middleware/auth")
const { query } = require("../config/database")
const env = require("../config/env")

const router = express.Router()

// ════════════════════════════════════════════════════════════
//  Cache
// ════════════════════════════════════════════════════════════

const cache = new Map()
const CACHE_TTL = 60 * 1000 // 1 دقيقة فقط (المالك يبي بيانات live)

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
  if (cache.size > 50) {
    const firstKey = cache.keys().next().value
    cache.delete(firstKey)
  }
}

// ════════════════════════════════════════════════════════════
//  Bot API helper
// ════════════════════════════════════════════════════════════

async function callBot(path, body = {}) {
  const botUrl = env.BOT_URL || process.env.BOT_URL
  const botSecret = env.BOT_SECRET || process.env.BOT_SECRET

  if (!botUrl || !botSecret) {
    console.warn("[OWNER_BOT_API] BOT_URL or BOT_SECRET not set")
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
      console.error(`[OWNER_BOT_API] ${path} → ${response.status}`)
      return null
    }
    return await response.json()
  } catch (err) {
    console.error(`[OWNER_BOT_API] ${path} failed:`, err.message)
    return null
  }
}

// ════════════════════════════════════════════════════════════
//  GET /api/owner/servers
//  قائمة كل السيرفرات اللي فيها البوت + إحصائيات لكل واحد
// ════════════════════════════════════════════════════════════

router.get(
  "/owner/servers",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const search = (req.query.search || "").trim().toLowerCase()
    const sort = req.query.sort || "members" // members | name | joined | activity
    const cacheKey = `servers:${search}:${sort}`

    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    // ─── جلب قائمة السيرفرات من البوت ───
    const botData = await callBot("/api/internal/owner/servers-list", {})

    if (!botData?.servers) {
      return res.json({
        servers: [],
        total: 0,
        total_members: 0,
        error: "bot_unavailable",
      })
    }

    let servers = botData.servers

    // ─── دمج بيانات DB (اشتراكات + إحصائيات نشاط) ───
    const guildIds = servers.map((s) => s.id)

    // الاشتراكات
    const subsResult = await query(
      `
      SELECT
        gs.guild_id,
        gs.owner_id,
        s.plan_id,
        s.status,
        s.expires_at,
        s.is_trial
      FROM guild_subscriptions gs
      LEFT JOIN subscriptions s ON s.user_id = gs.owner_id
      WHERE gs.guild_id = ANY($1::text[])
      `,
      [guildIds]
    ).catch(() => ({ rows: [] }))

    const subsMap = new Map()
    for (const r of subsResult.rows || []) {
      subsMap.set(r.guild_id, {
        plan_id: r.plan_id,
        status: r.status,
        expires_at: r.expires_at,
        is_trial: r.is_trial || false,
        linked_owner: r.owner_id,
      })
    }

    // إحصائيات النشاط (آخر 7 أيام)
    const activityResult = await query(
      `
      SELECT
        guild_id,
        SUM(messages_count)::bigint AS messages_7d,
        SUM(commands_count)::bigint AS commands_7d
      FROM stats_counters
      WHERE guild_id = ANY($1::text[])
        AND date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY guild_id
      `,
      [guildIds]
    ).catch(() => ({ rows: [] }))

    const activityMap = new Map()
    for (const r of activityResult.rows || []) {
      activityMap.set(r.guild_id, {
        messages_7d: Number(r.messages_7d) || 0,
        commands_7d: Number(r.commands_7d) || 0,
      })
    }

    // ─── دمج البيانات ───
    servers = servers.map((s) => ({
      ...s,
      subscription: subsMap.get(s.id) || null,
      activity: activityMap.get(s.id) || { messages_7d: 0, commands_7d: 0 },
    }))

    // ─── بحث ───
    if (search) {
      servers = servers.filter((s) =>
        String(s.name || "").toLowerCase().includes(search) ||
        String(s.id).includes(search) ||
        String(s.owner_name || "").toLowerCase().includes(search)
      )
    }

    // ─── ترتيب ───
    switch (sort) {
      case "name":
        servers.sort((a, b) => String(a.name).localeCompare(String(b.name)))
        break
      case "joined":
        servers.sort((a, b) => (b.bot_joined_at || 0) - (a.bot_joined_at || 0))
        break
      case "activity":
        servers.sort((a, b) =>
          (b.activity.messages_7d + b.activity.commands_7d) -
          (a.activity.messages_7d + a.activity.commands_7d)
        )
        break
      case "members":
      default:
        servers.sort((a, b) => (b.member_count || 0) - (a.member_count || 0))
    }

    const result = {
      servers,
      total: servers.length,
      total_members: servers.reduce((s, x) => s + (x.member_count || 0), 0),
      total_subscribed: servers.filter((s) => s.subscription?.status === "active").length,
      updated_at: new Date().toISOString(),
    }

    setCached(cacheKey, result)
    res.json(result)
  })
)

// ════════════════════════════════════════════════════════════
//  GET /api/owner/servers/:guildId
//  تفاصيل سيرفر واحد كامل
// ════════════════════════════════════════════════════════════

router.get(
  "/owner/servers/:guildId",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params

    if (!/^\d{15,22}$/.test(guildId)) {
      throw new ApiError("Invalid guild ID", 400)
    }

    const cacheKey = `server-detail:${guildId}`
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    // ─── معلومات السيرفر من البوت ───
    const botData = await callBot("/api/internal/owner/server-detail", { guildId })

    if (!botData?.server) {
      throw new ApiError("Server not found or bot offline", 404)
    }

    // ─── الاشتراك ───
    const subResult = await query(
      `
      SELECT
        gs.owner_id,
        s.plan_id,
        s.status,
        s.expires_at,
        s.is_trial,
        s.created_at AS sub_started_at
      FROM guild_subscriptions gs
      LEFT JOIN subscriptions s ON s.user_id = gs.owner_id
      WHERE gs.guild_id = $1
      `,
      [guildId]
    ).catch(() => ({ rows: [] }))

    // ─── نشاط 30 يوم ───
    const activityResult = await query(
      `
      SELECT
        date,
        messages_count,
        commands_count,
        new_members_count
      FROM stats_counters
      WHERE guild_id = $1
        AND date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY date ASC
      `,
      [guildId]
    ).catch(() => ({ rows: [] }))

    // ─── إعدادات الأنظمة ───
    const settingsResult = await query(
      `
      SELECT
        ai_enabled,
        xp_enabled,
        economy_enabled,
        welcome_enabled,
        protection_enabled,
        logs_enabled,
        ticket_enabled
      FROM guilds
      WHERE id = $1
      `,
      [guildId]
    ).catch(() => ({ rows: [] }))

    // ─── آخر 10 أحداث (audit log) ───
    const auditResult = await query(
      `
      SELECT action_type, user_id, created_at, metadata
      FROM audit_logs
      WHERE guild_id = $1
      ORDER BY created_at DESC
      LIMIT 10
      `,
      [guildId]
    ).catch(() => ({ rows: [] }))

    const result = {
      server: botData.server,
      subscription: subResult.rows[0] || null,
      activity_30d: activityResult.rows || [],
      settings: settingsResult.rows[0] || {},
      recent_audit: auditResult.rows || [],
      updated_at: new Date().toISOString(),
    }

    setCached(cacheKey, result)
    res.json(result)
  })
)

// ════════════════════════════════════════════════════════════
//  POST /api/owner/servers/:guildId/message-owner
//  إرسال رسالة DM لمالك السيرفر
// ════════════════════════════════════════════════════════════

router.post(
  "/owner/servers/:guildId/message-owner",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params
    const { message } = req.body || {}

    if (!/^\d{15,22}$/.test(guildId)) {
      throw new ApiError("Invalid guild ID", 400)
    }

    if (!message || typeof message !== "string") {
      throw new ApiError("الرسالة مطلوبة", 400)
    }

    if (message.length > 2000) {
      throw new ApiError("الرسالة طويلة جداً (الحد 2000 حرف)", 400)
    }

    // استدعاء البوت لإرسال DM
    const result = await callBot("/api/internal/owner/dm-server-owner", {
      guildId,
      message,
      fromOwnerId: req.user.id,
    })

    if (!result?.success) {
      throw new ApiError(
        result?.error || "فشل إرسال الرسالة (مالك السيرفر قافل الـ DMs أو البوت غير متاح)",
        400
      )
    }

    // حذف cache التفاصيل
    cache.delete(`server-detail:${guildId}`)

    res.json({ success: true, sent_to: result.recipient_id })
  })
)

// ════════════════════════════════════════════════════════════
//  DELETE /api/owner/servers/:guildId/leave
//  خروج البوت من السيرفر
// ════════════════════════════════════════════════════════════

router.delete(
  "/owner/servers/:guildId/leave",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params

    if (!/^\d{15,22}$/.test(guildId)) {
      throw new ApiError("Invalid guild ID", 400)
    }

    // استدعاء البوت
    const result = await callBot("/api/internal/owner/leave-guild", {
      guildId,
      byUserId: req.user.id,
    })

    if (!result?.success) {
      throw new ApiError(
        result?.error || "فشل خروج البوت من السيرفر",
        400
      )
    }

    // مسح كل cache
    cache.clear()

    res.json({ success: true, guild_id: guildId, guild_name: result.guild_name })
  })
)

module.exports = router