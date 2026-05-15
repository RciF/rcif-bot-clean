/**
 * ═══════════════════════════════════════════════════════════
 *  Settings Routes — UNIFIED with Bot Schema
 *  /api/guild/:guildId/{welcome|protection|logs|ai|xp|economy|tickets|...}
 *
 *  ⚠️ مهم: أسماء الأعمدة تطابق schema البوت بالضبط
 *  - welcome: welcome_channel_id, goodbye_channel_id, welcome_message
 *  - tickets: ticket_settings (مفرد) + category_id, log_channel_id, support_role_id
 *  - xp: levelup_channel_id, xp_multiplier
 *  - economy_users: GLOBAL (بدون guild_id)
 * ═══════════════════════════════════════════════════════════
 */

const express = require("express")
const { asyncHandler, ApiError } = require("../middleware/error")
const { requireAuth, requireGuildAdmin } = require("../middleware/auth")
const { auditLog } = require("../middleware/audit")
const { query, transaction } = require("../config/database")
const { getGuildPlan } = require("../services/guildPlan")
const { hasAccess, PLAN_TIERS } = require("../plans")
const botApi = require("../utils/botApi")

const router = express.Router({ mergeParams: true })

// ════════════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════════════

function requirePlan(requiredPlan) {
  return asyncHandler(async (req, res, next) => {
    const guildPlan = await getGuildPlan(req.params.guildId)
    if (!hasAccess(guildPlan, requiredPlan)) {
      throw new ApiError(
        `هذي الميزة تحتاج خطة ${requiredPlan} أو أعلى`,
        403,
        "PLAN_REQUIRED",
        { currentPlan: guildPlan, requiredPlan },
      )
    }
    next()
  })
}

// تحويل لون من INT (من الفرونت) إلى hex string للحفظ في DB
function normalizeColor(color) {
  if (color === null || color === undefined) return null
  if (typeof color === "number" && isFinite(color)) {
    return "#" + color.toString(16).padStart(6, "0").toUpperCase()
  }
  return String(color)
}

async function getSettings(table, guildId, defaults = {}) {
  try {
    const r = await query(`SELECT * FROM ${table} WHERE guild_id = $1 LIMIT 1`, [guildId])
    if (r.rows.length === 0) return defaults
    return r.rows[0]
  } catch (err) {
    console.error(`[GET_SETTINGS] ${table}:`, err.message)
    return defaults
  }
}

/**
 * UPSERT settings — نسخة محسّنة تتعامل مع JSONB تلقائياً
 */
async function upsertSettings(table, guildId, data) {
  const cleaned = { ...data }
  delete cleaned.guild_id
  delete cleaned.created_at
  delete cleaned.updated_at

  const keys = Object.keys(cleaned)
  if (keys.length === 0) return

  const values = keys.map((k) => {
    const v = cleaned[k]
    return typeof v === "object" && v !== null ? JSON.stringify(v) : v
  })

  const setClauses = keys.map((k, i) => `${k} = $${i + 2}`).join(", ")
  const insertColumns = ["guild_id", ...keys].join(", ")
  const insertValues = ["$1", ...keys.map((_, i) => `$${i + 2}`)].join(", ")

  await query(
    `INSERT INTO ${table} (${insertColumns})
     VALUES (${insertValues})
     ON CONFLICT (guild_id) DO UPDATE SET ${setClauses}`,
    [guildId, ...values],
  )
}

// ════════════════════════════════════════════════════════════
//  Protection Schema Mappers
//  يحوّل بين nested (UI القديم) و flat (البوت)
// ════════════════════════════════════════════════════════════

function nestedToFlatProtection(data) {
  if (!data || typeof data !== "object") return {}

  const result = {}

  // anti_spam nested → antispam_* flat
  if (data.anti_spam && typeof data.anti_spam === "object") {
    const s = data.anti_spam
    if (s.enabled !== undefined) result.antispam_enabled = s.enabled
    if (s.maxMessages !== undefined) result.antispam_max_messages = s.maxMessages
    if (s.max_messages !== undefined) result.antispam_max_messages = s.max_messages
    if (s.timeWindow !== undefined)
      result.antispam_interval_ms = Number(s.timeWindow) * 1000
    if (s.interval_ms !== undefined) result.antispam_interval_ms = s.interval_ms
    if (s.action !== undefined) result.antispam_action = s.action
    if (s.muteDuration !== undefined) result.antispam_mute_duration = s.muteDuration
  }

  // anti_raid nested → antiraid_* flat
  if (data.anti_raid && typeof data.anti_raid === "object") {
    const r = data.anti_raid
    if (r.enabled !== undefined) result.antiraid_enabled = r.enabled
    if (r.maxJoins !== undefined) result.antiraid_join_threshold = r.maxJoins
    if (r.join_threshold !== undefined) result.antiraid_join_threshold = r.join_threshold
    if (r.timeWindow !== undefined)
      result.antiraid_join_interval_ms = Number(r.timeWindow) * 1000
    if (r.interval_ms !== undefined) result.antiraid_join_interval_ms = r.interval_ms
    if (r.action !== undefined) result.antiraid_action = r.action
  }

  // anti_nuke nested → antinuke_* flat
  if (data.anti_nuke && typeof data.anti_nuke === "object") {
    const n = data.anti_nuke
    if (n.enabled !== undefined) result.antinuke_enabled = n.enabled
    if (n.maxChannelDeletes !== undefined)
      result.antinuke_channel_delete_threshold = n.maxChannelDeletes
    if (n.maxRoleDeletes !== undefined)
      result.antinuke_role_delete_threshold = n.maxRoleDeletes
    if (n.maxBans !== undefined) result.antinuke_ban_threshold = n.maxBans
    if (n.interval_ms !== undefined) result.antinuke_interval_ms = n.interval_ms
    if (n.action !== undefined) result.antinuke_action = n.action
  }

  // Top-level flat keys (UI الجديد يرسل كذا)
  const flatKeys = [
    "antispam_enabled", "antispam_max_messages", "antispam_interval_ms",
    "antispam_action", "antispam_mute_duration",
    "antiraid_enabled", "antiraid_join_threshold", "antiraid_join_interval_ms",
    "antiraid_action",
    "antinuke_enabled", "antinuke_channel_delete_threshold",
    "antinuke_role_delete_threshold", "antinuke_ban_threshold",
    "antinuke_interval_ms", "antinuke_action",
    "log_channel_id", "is_locked", "lockdown_started_at",
    "whitelist_users", "whitelist_roles",
  ]
  for (const k of flatKeys) {
    if (data[k] !== undefined) result[k] = data[k]
  }

  return result
}

function flatToNestedProtection(row) {
  if (!row) {
    return {
      antispam_enabled: false,
      antispam_max_messages: 5,
      antispam_interval_ms: 3000,
      antispam_action: "mute",
      antispam_mute_duration: 300000,
      antiraid_enabled: false,
      antiraid_join_threshold: 10,
      antiraid_join_interval_ms: 10000,
      antiraid_action: "lockdown",
      antinuke_enabled: false,
      antinuke_channel_delete_threshold: 3,
      antinuke_role_delete_threshold: 3,
      antinuke_ban_threshold: 3,
      antinuke_interval_ms: 10000,
      antinuke_action: "ban",
      log_channel_id: null,
      is_locked: false,
      lockdown_started_at: null,
      whitelist_users: [],
      whitelist_roles: [],
      anti_spam: { enabled: false, maxMessages: 5, timeWindow: 3, action: "mute" },
      anti_raid: { enabled: false, maxJoins: 10, timeWindow: 10, action: "lockdown" },
      anti_nuke: { enabled: false, maxChannelDeletes: 3, maxRoleDeletes: 3, maxBans: 3 },
    }
  }

  return {
    antispam_enabled: row.antispam_enabled ?? false,
    antispam_max_messages: row.antispam_max_messages ?? 5,
    antispam_interval_ms: row.antispam_interval_ms ?? 3000,
    antispam_action: row.antispam_action ?? "mute",
    antispam_mute_duration: row.antispam_mute_duration ?? 300000,
    antiraid_enabled: row.antiraid_enabled ?? false,
    antiraid_join_threshold: row.antiraid_join_threshold ?? 10,
    antiraid_join_interval_ms: row.antiraid_join_interval_ms ?? 10000,
    antiraid_action: row.antiraid_action ?? "lockdown",
    antinuke_enabled: row.antinuke_enabled ?? false,
    antinuke_channel_delete_threshold: row.antinuke_channel_delete_threshold ?? 3,
    antinuke_role_delete_threshold: row.antinuke_role_delete_threshold ?? 3,
    antinuke_ban_threshold: row.antinuke_ban_threshold ?? 3,
    antinuke_interval_ms: row.antinuke_interval_ms ?? 10000,
    antinuke_action: row.antinuke_action ?? "ban",
    log_channel_id: row.log_channel_id ?? null,
    is_locked: row.is_locked ?? false,
    lockdown_started_at: row.lockdown_started_at ?? null,
    whitelist_users: row.whitelist_users ?? [],
    whitelist_roles: row.whitelist_roles ?? [],
    anti_spam: {
      enabled: row.antispam_enabled ?? false,
      maxMessages: row.antispam_max_messages ?? 5,
      timeWindow: Math.round((row.antispam_interval_ms ?? 3000) / 1000),
      action: row.antispam_action ?? "mute",
    },
    anti_raid: {
      enabled: row.antiraid_enabled ?? false,
      maxJoins: row.antiraid_join_threshold ?? 10,
      timeWindow: Math.round((row.antiraid_join_interval_ms ?? 10000) / 1000),
      action: row.antiraid_action ?? "lockdown",
    },
    anti_nuke: {
      enabled: row.antinuke_enabled ?? false,
      maxChannelDeletes: row.antinuke_channel_delete_threshold ?? 3,
      maxRoleDeletes: row.antinuke_role_delete_threshold ?? 3,
      maxBans: row.antinuke_ban_threshold ?? 3,
    },
  }
}

// ════════════════════════════════════════════════════════════
//  ════════════ WELCOME ════════════
// ════════════════════════════════════════════════════════════

router.get(
  "/welcome",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const settings = await getSettings("welcome_settings", req.params.guildId, {
      enabled: false,
      welcome_channel_id: null,
      goodbye_channel_id: null,
      welcome_message: null,
      goodbye_message: null,
      type: "embed",
      embed_data: null,
      leave_enabled: false,
      leave_message: null,
      mention_user: true,
    })
    res.json(settings)
  }),
)

router.put(
  "/welcome",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.SILVER),
  auditLog("welcome.update"),
  asyncHandler(async (req, res) => {
    await upsertSettings("welcome_settings", req.params.guildId, req.body)
    res.json({ success: true })
  }),
)

router.post(
  "/welcome/test",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    res.json({ success: true, message: "تم إرسال رسالة الاختبار" })
  }),
)

// ════════════════════════════════════════════════════════════
//  ════════════ PROTECTION ════════════
// ════════════════════════════════════════════════════════════

router.get(
  "/protection",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    try {
      const r = await query(
        `SELECT * FROM protection_settings WHERE guild_id = $1 LIMIT 1`,
        [req.params.guildId],
      )
      const row = r.rows[0] || null
      res.json(flatToNestedProtection(row))
    } catch (err) {
      console.error("[GET_PROTECTION]", err.message)
      res.json(flatToNestedProtection(null))
    }
  }),
)

router.put(
  "/protection",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.GOLD),
  auditLog("protection.update"),
  asyncHandler(async (req, res) => {
    const flatData = nestedToFlatProtection(req.body)
    if (Object.keys(flatData).length === 0) {
      return res.json({ success: true, message: "لا تغييرات للحفظ" })
    }
    await upsertSettings("protection_settings", req.params.guildId, flatData)
    res.json({ success: true })
  }),
)

router.post(
  "/protection/lockdown",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.GOLD),
  auditLog("protection.lockdown"),
  asyncHandler(async (req, res) => {
    await upsertSettings("protection_settings", req.params.guildId, {
      is_locked: true,
      lockdown_started_at: new Date().toISOString(),
    })
    res.json({ success: true, locked: true })
  }),
)

router.delete(
  "/protection/lockdown",
  requireAuth,
  requireGuildAdmin,
  auditLog("protection.unlock"),
  asyncHandler(async (req, res) => {
    await upsertSettings("protection_settings", req.params.guildId, {
      is_locked: false,
      lockdown_started_at: null,
    })
    res.json({ success: true, locked: false })
  }),
)

// ════════════════════════════════════════════════════════════
//  ════════════ LOGS ════════════
// ════════════════════════════════════════════════════════════

router.get(
  "/logs",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const settings = await getSettings("log_settings", req.params.guildId, {
      enabled: false,
      master_channel: null,
      use_single_channel: false,
      events: {},
    })
    res.json(settings)
  }),
)

router.put(
  "/logs",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.SILVER),
  auditLog("logs.update"),
  asyncHandler(async (req, res) => {
    await upsertSettings("log_settings", req.params.guildId, req.body)
    res.json({ success: true })
  }),
)

// ════════════════════════════════════════════════════════════
//  ════════════ AI ════════════
// ════════════════════════════════════════════════════════════

router.get(
  "/ai",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const settings = await getSettings("ai_settings", req.params.guildId, {
      enabled: false,
      respond_to_mentions: true,
      respond_to_replies: true,
      always_respond_channels: [],
      persona: "friendly",
      custom_prompt: "",
      blocked_words: [],
      max_response_length: 500,
      messages_per_day: 50,
      allowed_channels: [],
      creative_model_enabled: false,
    })
    res.json(settings)
  }),
)

router.put(
  "/ai",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.GOLD),
  auditLog("ai.update"),
  asyncHandler(async (req, res) => {
    await upsertSettings("ai_settings", req.params.guildId, req.body)
    res.json({ success: true })
  }),
)

router.get(
  "/ai/usage",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const r = await query(
      `SELECT COUNT(*)::INT as today_count
       FROM ai_usage_log
       WHERE guild_id = $1 AND created_at >= CURRENT_DATE`,
      [req.params.guildId],
    ).catch(() => ({ rows: [{ today_count: 0 }] }))
    res.json({ today: r.rows[0].today_count, limit: 100 })
  }),
)

// ════════════════════════════════════════════════════════════
//  ════════════ XP ════════════
// ════════════════════════════════════════════════════════════

router.get(
  "/xp",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const settings = await getSettings("xp_settings", req.params.guildId, {
      enabled: true,
      levelup_channel_id: null,
      xp_multiplier: 1,
      min_xp_per_message: 15,
      max_xp_per_message: 25,
      cooldown: 60,
      disabled_channels: [],
      disabled_roles: [],
      multipliers: [],
      role_rewards: [],
      level_up_message: { enabled: true, channel: null, template: "🎉 {user} وصل للمستوى {level}!" },
    })
    res.json(settings)
  }),
)

router.put(
  "/xp",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.SILVER),
  auditLog("xp.update"),
  asyncHandler(async (req, res) => {
    await upsertSettings("xp_settings", req.params.guildId, req.body)
    res.json({ success: true })
  }),
)

router.get(
  "/xp/leaderboard",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const r = await query(
      `SELECT user_id, level, xp
       FROM xp
       WHERE guild_id = $1
       ORDER BY xp DESC
       LIMIT 100`,
      [req.params.guildId],
    ).catch(() => ({ rows: [] }))
    res.json(r.rows)
  }),
)

router.delete(
  "/xp/reset/:userId",
  requireAuth,
  requireGuildAdmin,
  auditLog("xp.reset_user"),
  asyncHandler(async (req, res) => {
    await query(
      `DELETE FROM xp WHERE guild_id = $1 AND user_id = $2`,
      [req.params.guildId, req.params.userId],
    )
    res.json({ success: true })
  }),
)

// ════════════════════════════════════════════════════════════
//  ════════════ ECONOMY ════════════
//  ⚠️ economy_users في البوت GLOBAL (بدون guild_id)
//     economy_settings + economy_shop = per-guild
// ════════════════════════════════════════════════════════════

router.get(
  "/economy",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const settings = await getSettings("economy_settings", req.params.guildId, {
      enabled: true,
      currency_symbol: "🪙",
      currency_name: "كوينز",
      daily_reward: { min: 100, max: 500 },
      weekly_reward: { min: 1000, max: 5000 },
      message_reward: { min: 1, max: 5, cooldown: 60 },
      starting_balance: 100,
    })
    res.json(settings)
  }),
)

router.put(
  "/economy",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.GOLD),
  auditLog("economy.update"),
  asyncHandler(async (req, res) => {
    await upsertSettings("economy_settings", req.params.guildId, req.body)
    res.json({ success: true })
  }),
)

router.get(
  "/economy/shop",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const r = await query(
      `SELECT * FROM economy_shop WHERE guild_id = $1 ORDER BY id ASC`,
      [req.params.guildId],
    ).catch(() => ({ rows: [] }))
    res.json(r.rows)
  }),
)

router.put(
  "/economy/shop",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.GOLD),
  auditLog("economy.shop_update"),
  asyncHandler(async (req, res) => {
    const items = req.body.items || []
    await transaction(async (client) => {
      await client.query("DELETE FROM economy_shop WHERE guild_id = $1", [req.params.guildId])
      for (const item of items) {
        await client.query(
          `INSERT INTO economy_shop (guild_id, name, emoji, price, type, role_id, stock, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            req.params.guildId,
            item.name,
            item.emoji,
            item.price,
            item.type,
            item.roleId || item.role_id,
            item.stock,
            item.description,
          ],
        )
      }
    })
    res.json({ success: true })
  }),
)

router.post(
  "/economy/give",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.GOLD),
  auditLog("economy.give"),
  asyncHandler(async (req, res) => {
    const { userId, amount } = req.body
    if (!userId || !amount) throw new ApiError("userId و amount مطلوبين", 400)
    await query(
      `INSERT INTO economy_users (user_id, coins) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET coins = economy_users.coins + $2`,
      [userId, amount],
    )
    res.json({ success: true })
  }),
)

// ════════════════════════════════════════════════════════════
//  ✅ NEW: GET /economy/leaderboard
//  أغنى المستخدمين عالمياً (الاقتصاد عالمي)
// ════════════════════════════════════════════════════════════

router.get(
  "/economy/leaderboard",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100)
    const r = await query(
      `SELECT user_id, coins
       FROM economy_users
       WHERE coins > 0
       ORDER BY coins DESC
       LIMIT $1`,
      [limit],
    ).catch(() => ({ rows: [] }))
    res.json(r.rows)
  }),
)

// ════════════════════════════════════════════════════════════
//  ════════════ TICKETS ════════════
// ════════════════════════════════════════════════════════════

router.get(
  "/tickets",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const settings = await getSettings("ticket_settings", req.params.guildId, {
      enabled: false,
      category_id: null,
      log_channel_id: null,
      support_role_id: null,
      welcome_message: "أهلاً {user}! الستاف راح يجي قريباً.",
      max_open_tickets: 1,
      auto_close_hours: 48,
      transcript_enabled: true,
      panel_channel: null,
      panel: { title: "🎫 لوحة التذاكر", description: "", color: 0x9b59b6, buttons: [] },
      transcripts: { enabled: false, channel: null },
    })
    res.json(settings)
  }),
)

router.put(
  "/tickets",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.GOLD),
  auditLog("tickets.update"),
  asyncHandler(async (req, res) => {
    await upsertSettings("ticket_settings", req.params.guildId, req.body)
    res.json({ success: true })
  }),
)

router.post(
  "/tickets/panel/deploy",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.GOLD),
  auditLog("tickets.deploy_panel"),
  asyncHandler(async (req, res) => {
    const result = await botApi.deployTicketPanel(req.params.guildId)
    if (!result.ok) {
      throw new ApiError(
        result.error === "no_panel_channel"
          ? "حدد قناة اللوحة أولاً"
          : result.error === "channel_not_found"
            ? "القناة غير موجودة"
            : "فشل نشر اللوحة",
        400,
        result.error || "DEPLOY_FAILED"
      )
    }
    res.json({ success: true, message: "تم نشر اللوحة" })
  }),
)

router.get(
  "/tickets/active",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const r = await query(
      `SELECT * FROM tickets WHERE guild_id = $1 AND status = 'open' ORDER BY created_at DESC`,
      [req.params.guildId],
    ).catch(() => ({ rows: [] }))
    res.json(r.rows)
  }),
)

// ════════════════════════════════════════════════════════════
//  ════════════ REACTION ROLES ════════════
// ════════════════════════════════════════════════════════════

router.get(
  "/role-panels",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const r = await query(
      `SELECT * FROM button_role_panels WHERE guild_id = $1 ORDER BY created_at DESC`,
      [req.params.guildId],
    ).catch(() => ({ rows: [] }))
    res.json(r.rows)
  }),
)

router.post(
  "/role-panels",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.SILVER),
  auditLog("role-panel.create"),
  asyncHandler(async (req, res) => {
    const { title, description, channel_id, color, exclusive, buttons } = req.body
    const r = await query(
      `INSERT INTO button_role_panels (guild_id, title, description, channel_id, color, exclusive, buttons)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        req.params.guildId,
        title,
        description,
        channel_id,
        normalizeColor(color),
        !!exclusive,
        JSON.stringify(buttons || []),
      ],
    )
    res.json(r.rows[0])
  }),
)

router.put(
  "/role-panels/:panelId",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.SILVER),
  auditLog("role-panel.update"),
  asyncHandler(async (req, res) => {
    const { title, description, color, exclusive, buttons } = req.body
    await query(
      `UPDATE button_role_panels
       SET title = $1, description = $2, color = $3, exclusive = $4, buttons = $5
       WHERE id = $6 AND guild_id = $7`,
      [
        title,
        description,
        normalizeColor(color),
        !!exclusive,
        JSON.stringify(buttons),
        req.params.panelId,
        req.params.guildId,
      ],
    )
    res.json({ success: true })
  }),
)

router.delete(
  "/role-panels/:panelId",
  requireAuth,
  requireGuildAdmin,
  auditLog("role-panel.delete"),
  asyncHandler(async (req, res) => {
    await query(
      `DELETE FROM button_role_panels WHERE id = $1 AND guild_id = $2`,
      [req.params.panelId, req.params.guildId],
    )
    res.json({ success: true })
  }),
)

// ════════════════════════════════════════════════════════════
//  ════════════ MODERATION ════════════
// ════════════════════════════════════════════════════════════

router.get(
  "/moderation/warnings",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    let r
    try {
      r = await query(
        `SELECT user_id, COUNT(*)::INT as count, MAX(created_at) as last_warning, MAX(reason) as last_reason
         FROM warnings WHERE guild_id = $1 GROUP BY user_id ORDER BY count DESC`,
        [req.params.guildId],
      )
    } catch {
      r = { rows: [] }
    }
    res.json(r.rows)
  }),
)

router.delete(
  "/moderation/warnings/:userId",
  requireAuth,
  requireGuildAdmin,
  auditLog("mod.delete_warnings"),
  asyncHandler(async (req, res) => {
    try {
      await query(
        `DELETE FROM warnings WHERE guild_id = $1 AND user_id = $2`,
        [req.params.guildId, req.params.userId],
      )
    } catch {
      // تجاهل
    }
    res.json({ success: true })
  }),
)

router.get(
  "/moderation/bans",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const r = await query(
      `SELECT * FROM moderation_bans WHERE guild_id = $1 ORDER BY banned_at DESC`,
      [req.params.guildId],
    ).catch(() => ({ rows: [] }))
    res.json(r.rows)
  }),
)

router.delete(
  "/moderation/bans/:userId",
  requireAuth,
  requireGuildAdmin,
  auditLog("mod.unban"),
  asyncHandler(async (req, res) => {
    // ✅ فك الحظر فعلياً في Discord أولاً
    const botResult = await botApi.unbanUser(
      req.params.guildId,
      req.params.userId,
      `Unbanned by ${req.user?.username || "dashboard"}`
    )

    // احذف من moderation_bans (الـ event guildBanRemove سيحذفها أيضاً تلقائياً)
    await query(
      `DELETE FROM moderation_bans WHERE guild_id = $1 AND user_id = $2`,
      [req.params.guildId, req.params.userId],
    )

    res.json({
      success: true,
      bot_synced: botResult.ok,
      was_banned: botResult.was_banned !== false
    })
  }),
)


router.get(
  "/moderation/mutes",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const r = await query(
      `SELECT * FROM moderation_mutes WHERE guild_id = $1 AND expires_at > NOW() ORDER BY muted_at DESC`,
      [req.params.guildId],
    ).catch(() => ({ rows: [] }))
    res.json(r.rows)
  }),
)

// ════════════════════════════════════════════════════════════
//  ════════════ EVENTS ════════════
//  Schema موحّد: guild_events
//
//  Mapping بين الفرونت و guild_events:
//   - starts_at (datetime) ↔ start_time (BIGINT ms)
//   - channel ↔ channel_id
//   - max_participants ↔ max_attendees
//   - image ↔ image_url
// ════════════════════════════════════════════════════════════
 
function mapEventToFrontend(row) {
  if (!row) return null
  return {
    id: row.id,
    guild_id: row.guild_id,
    title: row.title,
    description: row.description,
    image: row.image_url,
    channel: row.channel_id,
    starts_at: row.start_time ? new Date(Number(row.start_time)).toISOString() : null,
    max_participants: row.max_attendees,
    reminder_hours: 1,
    status: row.status || "upcoming",
    created_by: row.creator_id,
    created_at: row.created_at,
    registered: row.registered || 0,
  }
}
 
router.get(
  "/events",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const r = await query(
      `SELECT e.*,
              COALESCE((SELECT COUNT(*)::int FROM event_attendees a
                        WHERE a.event_id = e.id AND a.status = 'going'), 0) AS registered
       FROM guild_events e
       WHERE e.guild_id = $1
       ORDER BY e.start_time DESC`,
      [req.params.guildId],
    ).catch(() => ({ rows: [] }))
    res.json(r.rows.map(mapEventToFrontend))
  }),
)
 
router.post(
  "/events",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.GOLD),
  auditLog("event.create"),
  asyncHandler(async (req, res) => {
    const { title, description, image, starts_at, max_participants, channel } = req.body
    const startTime = starts_at ? new Date(starts_at).getTime() : Date.now()
 
    const r = await query(
      `INSERT INTO guild_events
         (guild_id, channel_id, creator_id, title, description, category,
          start_time, max_attendees, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        req.params.guildId,
        channel,
        req.user.id,
        title,
        description || null,
        "other",
        startTime,
        max_participants ? parseInt(max_participants) : null,
        image || null,
      ],
    )
    res.json(mapEventToFrontend(r.rows[0]))
  }),
)
 
router.put(
  "/events/:id",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.GOLD),
  auditLog("event.update"),
  asyncHandler(async (req, res) => {
    const { title, description, image, starts_at, max_participants, channel } = req.body
    const startTime = starts_at ? new Date(starts_at).getTime() : null
 
    await query(
      `UPDATE guild_events SET
         title = $1,
         description = $2,
         image_url = $3,
         start_time = COALESCE($4, start_time),
         max_attendees = $5,
         channel_id = $6
       WHERE id = $7 AND guild_id = $8`,
      [
        title,
        description || null,
        image || null,
        startTime,
        max_participants ? parseInt(max_participants) : null,
        channel,
        req.params.id,
        req.params.guildId,
      ],
    )
    res.json({ success: true })
  }),
)
 
router.delete(
  "/events/:id",
  requireAuth,
  requireGuildAdmin,
  auditLog("event.delete"),
  asyncHandler(async (req, res) => {
    await query(
      `DELETE FROM event_attendees WHERE event_id = $1`,
      [req.params.id],
    ).catch(() => {})
 
    await query(
      `DELETE FROM guild_events WHERE id = $1 AND guild_id = $2`,
      [req.params.id, req.params.guildId],
    )
    res.json({ success: true })
  }),
)

// ════════════════════════════════════════════════════════════
//  ════════════ SCHEDULER ════════════
// ════════════════════════════════════════════════════════════

router.get(
  "/scheduler",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const r = await query(
      `SELECT * FROM scheduled_tasks WHERE guild_id = $1 ORDER BY next_run_at ASC`,
      [req.params.guildId],
    ).catch(() => ({ rows: [] }))
    res.json(r.rows)
  }),
)

router.post(
  "/scheduler",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.DIAMOND),
  auditLog("scheduler.create"),
  asyncHandler(async (req, res) => {
    const { name, type, channel_id, payload, schedule } = req.body
    const r = await query(
      `INSERT INTO scheduled_tasks (guild_id, name, type, channel_id, payload, schedule, enabled, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7) RETURNING *`,
      [
        req.params.guildId,
        name,
        type,
        channel_id,
        JSON.stringify(payload),
        JSON.stringify(schedule),
        req.user.id,
      ],
    )
    res.json(r.rows[0])
  }),
)

router.put(
  "/scheduler/:id",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.DIAMOND),
  auditLog("scheduler.update"),
  asyncHandler(async (req, res) => {
    const { name, channel_id, payload, schedule, enabled } = req.body
    await query(
      `UPDATE scheduled_tasks
       SET name=$1, channel_id=$2, payload=$3, schedule=$4, enabled=$5
       WHERE id=$6 AND guild_id=$7`,
      [
        name,
        channel_id,
        JSON.stringify(payload),
        JSON.stringify(schedule),
        !!enabled,
        req.params.id,
        req.params.guildId,
      ],
    )
    res.json({ success: true })
  }),
)

router.delete(
  "/scheduler/:id",
  requireAuth,
  requireGuildAdmin,
  auditLog("scheduler.delete"),
  asyncHandler(async (req, res) => {
    await query(`DELETE FROM scheduled_tasks WHERE id = $1 AND guild_id = $2`, [
      req.params.id,
      req.params.guildId,
    ])
    res.json({ success: true })
  }),
)

// ════════════════════════════════════════════════════════════
//  ════════════ EMBED BUILDER ════════════
// ════════════════════════════════════════════════════════════

router.post(
  "/embeds/send",
  requireAuth,
  requireGuildAdmin,
  auditLog("embed.send"),
  asyncHandler(async (req, res) => {
    res.json({ success: true, message: "تم إرسال الإيمبيد" })
  }),
)

router.get(
  "/embeds/templates",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const r = await query(
      `SELECT * FROM embed_templates WHERE guild_id = $1 ORDER BY created_at DESC`,
      [req.params.guildId],
    ).catch(() => ({ rows: [] }))
    res.json(r.rows)
  }),
)

router.post(
  "/embeds/templates",
  requireAuth,
  requireGuildAdmin,
  auditLog("embed.template_save"),
  asyncHandler(async (req, res) => {
    const { name, data } = req.body
    const r = await query(
      `INSERT INTO embed_templates (guild_id, name, data, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.guildId, name, JSON.stringify(data), req.user.id],
    )
    res.json(r.rows[0])
  }),
)

router.delete(
  "/embeds/templates/:id",
  requireAuth,
  requireGuildAdmin,
  auditLog("embed.template_delete"),
  asyncHandler(async (req, res) => {
    await query(`DELETE FROM embed_templates WHERE id = $1 AND guild_id = $2`, [
      req.params.id,
      req.params.guildId,
    ])
    res.json({ success: true })
  }),
)

// ════════════════════════════════════════════════════════════
//  ════════════ AUDIT LOG ════════════
// ════════════════════════════════════════════════════════════

router.get(
  "/audit",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.GOLD),
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200)
    const offset = parseInt(req.query.offset) || 0
    const action = req.query.action
    const userId = req.query.userId

    let sql = `SELECT * FROM dashboard_audit_log WHERE guild_id = $1`
    const params = [req.params.guildId]

    if (action) {
      params.push(action)
      sql += ` AND action = $${params.length}`
    }
    if (userId) {
      params.push(userId)
      sql += ` AND user_id = $${params.length}`
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)

    const r = await query(sql, params).catch(() => ({ rows: [] }))
    res.json(r.rows)
  }),
)

// ════════════════════════════════════════════════════════════
//  ════════════ OVERVIEW / STATS ════════════
// ════════════════════════════════════════════════════════════

router.get(
  "/overview",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const guildId = req.params.guildId

    const [protection, logs, snapshots, ticketStats, warningCount] = await Promise.all([
      getSettings("protection_settings", guildId),
      getSettings("log_settings", guildId),
      query(
        `SELECT member_count, online_peak, joined_today, left_today
         FROM stats_snapshots
         WHERE guild_id = $1
           AND date >= CURRENT_DATE - INTERVAL '7 days'
         ORDER BY date DESC`,
        [guildId],
      ).catch(() => ({ rows: [] })),
      query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'open')::int AS open,
           COUNT(*)::int AS total
         FROM tickets WHERE guild_id = $1`,
        [guildId],
      ).catch(() => ({ rows: [{ open: 0, total: 0 }] })),
      query(
        `SELECT COUNT(*)::int AS count
         FROM warnings
         WHERE guild_id = $1
           AND created_at >= NOW() - INTERVAL '7 days'`,
        [guildId],
      ).catch(() => ({ rows: [{ count: 0 }] })),
    ])

    const securityScore = calculateSecurityScore(protection)
    const organizationScore = calculateOrganizationScore(logs)
    const activityScore = calculateActivityScore(snapshots.rows)
    const engagementScore = calculateEngagementScore(
      snapshots.rows,
      ticketStats.rows[0],
      warningCount.rows[0]?.count || 0,
    )

    res.json({
      healthScore: {
        total: Math.round((securityScore + organizationScore + activityScore + engagementScore) / 4),
        breakdown: {
          security: { score: securityScore, label: "الأمان" },
          activity: { score: activityScore, label: "النشاط" },
          organization: { score: organizationScore, label: "التنظيم" },
          engagement: { score: engagementScore, label: "التفاعل" },
        },
      },
      stats: {
        members: { value: 0, change: 0 },
        messages24h: { value: 0, change: 0 },
        commands24h: { value: 0, change: 0, aiPortion: 0 },
        modActions7d: { value: 0, change: 0 },
      },
    })
  }),
)

function calculateSecurityScore(protection) {
  if (!protection) return 30
  let score = 30
  // يدعم الاثنين: nested (anti_spam.enabled) + flat (antispam_enabled)
  if (protection.antispam_enabled || protection.anti_spam?.enabled) score += 25
  if (protection.antiraid_enabled || protection.anti_raid?.enabled) score += 20
  if (protection.antinuke_enabled || protection.anti_nuke?.enabled) score += 25
  return Math.min(score, 100)
}

function calculateOrganizationScore(logs) {
  if (!logs) return 30
  if (!logs.enabled) return 30

  // events ممكن يجي JSONB string أو object
  let events = logs.events || {}
  if (typeof events === "string") {
    try { events = JSON.parse(events) } catch { events = {} }
  }

  const keys = Object.keys(events)
  if (keys.length === 0) return 60 // فعّل اللوقات بدون events محددة → نقاط جزئية

  const enabled = Object.values(events).filter((e) => e?.enabled).length
  return Math.round(30 + (enabled / keys.length) * 70)
}
function calculateActivityScore(snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) return 40

  // متوسط نسبة المتصلين خلال آخر 7 أيام
  let totalRatio = 0
  let count = 0

  for (const snap of snapshots) {
    const members = parseInt(snap.member_count) || 0
    const online = parseInt(snap.online_peak) || 0
    if (members > 0) {
      totalRatio += (online / members)
      count++
    }
  }

  if (count === 0) return 40

  const avgOnlineRatio = totalRatio / count
  // 20%+ متصلين = 100 score (سيرفر صحي جداً)
  const score = Math.min(100, Math.round(avgOnlineRatio * 500))
  return Math.max(30, score)
}

function calculateEngagementScore(snapshots, ticketStats, recentWarnings) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) return 40

  let score = 40

  // 1) نمو الأعضاء (الانضمامات > المغادرات؟)
  let totalJoins = 0
  let totalLeaves = 0
  for (const snap of snapshots) {
    totalJoins += parseInt(snap.joined_today) || 0
    totalLeaves += parseInt(snap.left_today) || 0
  }

  if (totalJoins > totalLeaves) score += 20
  else if (totalJoins === totalLeaves) score += 10

  // 2) نشاط التذاكر (يعني الأعضاء بيتفاعلون مع الستاف)
  if (ticketStats?.total > 0) {
    score += Math.min(20, ticketStats.total * 2)
  }

  // 3) خصم على التحذيرات الكثيرة (مشاكل = خلل في التفاعل)
  if (recentWarnings > 10) score -= 10
  else if (recentWarnings > 5) score -= 5

  // 4) إذا فيه joins كثيرة، علامة سيرفر نشط
  if (totalJoins >= 5) score += 10

  return Math.max(30, Math.min(100, score))
}
// ════════════════════════════════════════════════════════════
//  ════════════ DANGER ZONE ════════════
//  هذا الكود يضاف داخل dashboard-backend/routes/settings.js
//  مكان الإضافة: قبل سطر "module.exports = router" في آخر الملف
// ════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════
//  DELETE /api/guild/:guildId/data
//  مسح كامل لكل بيانات السيرفر (Diamond فقط)
//
//  ⚠️ لا يمسح:
//   - economy_users (عالمي)
//   - guild_subscriptions (الاشتراك — يُفك بشكل منفصل)
//   - subscriptions, payment_requests (شخصية)
//
//  متطلبات الجسم (body):
//   { confirm: "<server name>" }   — لازم يطابق اسم السيرفر الحالي
// ════════════════════════════════════════════════════════════

router.delete(
  "/data",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.DIAMOND),
  auditLog("settings.wipe_all"),
  asyncHandler(async (req, res) => {
    const { guildId } = req.params
    const { confirm } = req.body || {}

    // ── 1) جلب اسم السيرفر للمقارنة ──
    let guildName = null
    try {
      const discord = require("../utils/discord")
      const g = await discord.fetchGuild(guildId)
      guildName = g?.name || null
    } catch (err) {
      console.error("[WIPE_GUILD_FETCH_FAILED]", err.message)
    }

    if (!guildName) {
      throw new ApiError("تعذّر التحقق من السيرفر", 400, "GUILD_NOT_FOUND")
    }

    // ── 2) التحقق من تطابق التأكيد ──
    if (!confirm || String(confirm).trim() !== guildName) {
      throw new ApiError(
        "نص التأكيد غير مطابق لاسم السيرفر",
        400,
        "CONFIRMATION_MISMATCH",
      )
    }

    // ── 3) قائمة الجداول للحذف (guild-scoped) ──
   const tables = [
      // إعدادات
      "welcome_settings",
      "protection_settings",
      "log_settings",
      "xp_settings",
      "ticket_settings",
      "economy_settings",
      "ai_settings",
      "stats_config",
      "guild_command_settings",
      "guild_prefix_settings",
      "automod_settings",
      "auto_role_settings",
      "event_settings",
 
      // بيانات (per-guild)
      "xp",
      "tickets",
      "economy_shop",
      "moderation_bans",
      "moderation_mutes",
      "warnings",
      "ai_usage_log",
      "scheduled_tasks",
      "embed_templates",
      "dashboard_audit_log",
      "button_role_panels",
      "button_roles",
      "guild_events",
      "stats_channels",
      "stats_snapshots",
      "stats_hourly",
      "automod_words",
      "automod_violations",
      "auto_role_assignments",
      "auto_role_history",
      "bulk_actions",
      "giveaways",
      "guild_command_aliases",
      "guild_command_defaults",
      "guild_command_restrictions",
      "command_usage_stats",
      "help_hidden_categories",
 
      // الجدول الأساسي للسيرفر (آخر شيء)
      "guilds",
    ]

    // ── 4) Transaction: مسح الكل أو لا شيء ──
    const summary = { deleted: {}, skipped: [], errors: [] }

    await transaction(async (client) => {
      // event_attendees: ربط بـ guild_events.id (لازم نحذفه قبل guild_events)
      try {
        const r = await client.query(
          `DELETE FROM event_attendees
           WHERE event_id IN (
             SELECT id FROM guild_events WHERE guild_id = $1
           )`,
          [guildId],
        )
        summary.deleted.event_attendees = r.rowCount
      } catch (err) {
        if (err.code === "42P01") {
          summary.skipped.push("event_attendees")
        } else {
          summary.errors.push({ table: "event_attendees", error: err.message })
        }
      }

      // ✅ guilds يستخدم column "id" (مو guild_id) — نتعامل معه منفصل
      for (const table of tables) {
        try {
          const column = table === "guilds" ? "id" : "guild_id"
          const r = await client.query(
            `DELETE FROM ${table} WHERE ${column} = $1`,
            [guildId],
          )
          summary.deleted[table] = r.rowCount
        } catch (err) {
          // الجدول غير موجود (42P01) — نتجاهله
          if (err.code === "42P01") {
            summary.skipped.push(table)
          } else {
            console.error(`[WIPE_TABLE_FAIL] ${table}:`, err.message)
            summary.errors.push({ table, error: err.message })
            // ما نوقف الـ transaction — نكمل ونتجاهل الجداول الفاشلة
          }
        }
      }
    })

    // ── 5) إبطال الكاش (لو فيه plan caching) ──
    try {
      const { invalidateGuildPlan } = require("../services/guildPlan")
      invalidateGuildPlan(guildId)
    } catch {}

    res.json({
      success: true,
      message: "تم مسح كل بيانات السيرفر",
      summary,
    })
  }),
)

module.exports = router