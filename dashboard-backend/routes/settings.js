/**
 * ═══════════════════════════════════════════════════════════
 *  Settings Routes
 *  /api/guild/:guildId/{welcome|protection|logs|ai|xp|economy|tickets|...}
 *
 *  كل الـ settings routes في ملف واحد لسهولة الصيانة
 * ═══════════════════════════════════════════════════════════
 */

const express = require("express")
const { asyncHandler, ApiError } = require("../middleware/error")
const { requireAuth, requireGuildAdmin } = require("../middleware/auth")
const { auditLog } = require("../middleware/audit")
const { query, transaction } = require("../config/database")
const { getGuildPlan } = require("../services/guildPlan")
const { hasAccess, PLAN_TIERS } = require("../plans")

const router = express.Router({ mergeParams: true })

// ════════════════════════════════════════════════════════════
//  Helper: تحقق من الخطة قبل التعديل
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

// ════════════════════════════════════════════════════════════
//  Helper: get/set settings — generic
// ════════════════════════════════════════════════════════════

/**
 * يجلب settings من جدول معين، مع defaults لو ما فيه entry
 */
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
 * يحفظ settings (UPSERT بسيط)
 */
async function upsertSettings(table, guildId, data) {
  // تنظيف data: حذف الحقول اللي ما تنحط في DB
  const cleaned = { ...data }
  delete cleaned.guild_id

  const keys = Object.keys(cleaned)
  if (keys.length === 0) return

  // تحويل الـ objects/arrays لـ JSONB
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
     ON CONFLICT (guild_id) DO UPDATE SET ${setClauses}, updated_at = NOW()`,
    [guildId, ...values],
  )
}

// ════════════════════════════════════════════════════════════
//  ════════════ WELCOME SETTINGS (Silver+) ════════════
// ════════════════════════════════════════════════════════════

router.get(
  "/welcome",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const settings = await getSettings("welcome_settings", req.params.guildId, {
      enabled: false,
      welcome_channel: null,
      leave_channel: null,
      type: "embed",
      message_text: null,
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
    // TODO: ترسل رسالة اختبار للقناة عبر البوت
    // حالياً نرجع success فقط
    res.json({ success: true, message: "تم إرسال رسالة الاختبار" })
  }),
)

// ════════════════════════════════════════════════════════════
//  ════════════ PROTECTION SETTINGS (Gold+) ════════════
// ════════════════════════════════════════════════════════════

router.get(
  "/protection",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const settings = await getSettings("protection_settings", req.params.guildId, {
      anti_spam: { enabled: false, maxMessages: 5, timeWindow: 5, action: "mute" },
      anti_raid: { enabled: false, maxJoins: 10, timeWindow: 30, action: "lockdown" },
      anti_nuke: { enabled: false, maxChannelDeletes: 3, maxRoleDeletes: 3, maxBans: 5 },
      whitelist: { roles: [], members: [] },
      log_channel: null,
      is_locked: false,
    })
    res.json(settings)
  }),
)

router.put(
  "/protection",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.GOLD),
  auditLog("protection.update"),
  asyncHandler(async (req, res) => {
    await upsertSettings("protection_settings", req.params.guildId, req.body)
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
//  ════════════ LOGS SETTINGS (Silver+) ════════════
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
//  ════════════ AI SETTINGS (Gold+) ════════════
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
//  ════════════ XP / LEVELS SETTINGS (Silver+) ════════════
// ════════════════════════════════════════════════════════════

router.get(
  "/xp",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const settings = await getSettings("xp_settings", req.params.guildId, {
      enabled: true,
      min_xp_per_message: 15,
      max_xp_per_message: 25,
      cooldown: 60,
      multiplier: 1,
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
      `SELECT user_id, level, xp, messages
       FROM xp_users
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
      `DELETE FROM xp_users WHERE guild_id = $1 AND user_id = $2`,
      [req.params.guildId, req.params.userId],
    )
    res.json({ success: true })
  }),
)

// ════════════════════════════════════════════════════════════
//  ════════════ ECONOMY SETTINGS (Gold+) ════════════
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
          [req.params.guildId, item.name, item.emoji, item.price, item.type, item.roleId, item.stock, item.description],
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
//  ════════════ TICKETS (Gold+) ════════════
// ════════════════════════════════════════════════════════════

router.get(
  "/tickets",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const settings = await getSettings("tickets_settings", req.params.guildId, {
      enabled: false,
      panel_channel: null,
      category_channel: null,
      staff_role: null,
      auto_archive_hours: 48,
      transcripts: { enabled: false, channel: null },
      welcome_message: "أهلاً {user}! الستاف راح يجي قريباً.",
      panel: { title: "🎫 لوحة التذاكر", description: "", color: 0x9b59b6, buttons: [] },
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
    await upsertSettings("tickets_settings", req.params.guildId, req.body)
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
    // TODO: ينشر اللوحة في القناة عبر البوت
    res.json({ success: true, message: "تم نشر اللوحة" })
  }),
)

router.get(
  "/tickets/active",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const r = await query(
      `SELECT * FROM tickets WHERE guild_id = $1 AND status = 'open' ORDER BY opened_at DESC`,
      [req.params.guildId],
    ).catch(() => ({ rows: [] }))
    res.json(r.rows)
  }),
)

// ════════════════════════════════════════════════════════════
//  ════════════ REACTION ROLES (Silver+) ════════════
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
        color,
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
       SET title = $1, description = $2, color = $3, exclusive = $4, buttons = $5, updated_at = NOW()
       WHERE id = $6 AND guild_id = $7`,
      [title, description, color, !!exclusive, JSON.stringify(buttons), req.params.panelId, req.params.guildId],
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
    const r = await query(
      `SELECT user_id, COUNT(*)::INT as count, MAX(created_at) as last_warning, MAX(reason) as last_reason
       FROM moderation_warnings WHERE guild_id = $1 GROUP BY user_id ORDER BY count DESC`,
      [req.params.guildId],
    ).catch(() => ({ rows: [] }))
    res.json(r.rows)
  }),
)

router.delete(
  "/moderation/warnings/:userId",
  requireAuth,
  requireGuildAdmin,
  auditLog("mod.delete_warnings"),
  asyncHandler(async (req, res) => {
    await query(
      `DELETE FROM moderation_warnings WHERE guild_id = $1 AND user_id = $2`,
      [req.params.guildId, req.params.userId],
    )
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
    await query(
      `DELETE FROM moderation_bans WHERE guild_id = $1 AND user_id = $2`,
      [req.params.guildId, req.params.userId],
    )
    res.json({ success: true })
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
//  ════════════ EVENTS (Gold+) ════════════
// ════════════════════════════════════════════════════════════

router.get(
  "/events",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const r = await query(
      `SELECT * FROM events WHERE guild_id = $1 ORDER BY starts_at DESC`,
      [req.params.guildId],
    ).catch(() => ({ rows: [] }))
    res.json(r.rows)
  }),
)

router.post(
  "/events",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.GOLD),
  auditLog("event.create"),
  asyncHandler(async (req, res) => {
    const { title, description, image, starts_at, max_participants, channel, reminder_hours } = req.body
    const r = await query(
      `INSERT INTO events (guild_id, title, description, image, starts_at, max_participants, channel, reminder_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.params.guildId, title, description, image, starts_at, max_participants, channel, reminder_hours],
    )
    res.json(r.rows[0])
  }),
)

router.put(
  "/events/:id",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.GOLD),
  auditLog("event.update"),
  asyncHandler(async (req, res) => {
    const { title, description, image, starts_at, max_participants, channel, reminder_hours } = req.body
    await query(
      `UPDATE events SET title=$1, description=$2, image=$3, starts_at=$4, max_participants=$5, channel=$6, reminder_hours=$7
       WHERE id=$8 AND guild_id=$9`,
      [title, description, image, starts_at, max_participants, channel, reminder_hours, req.params.id, req.params.guildId],
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
    await query(`DELETE FROM events WHERE id = $1 AND guild_id = $2`, [req.params.id, req.params.guildId])
    res.json({ success: true })
  }),
)

// ════════════════════════════════════════════════════════════
//  ════════════ SCHEDULER (Diamond) ════════════
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
    await query(`DELETE FROM scheduled_tasks WHERE id = $1 AND guild_id = $2`, [req.params.id, req.params.guildId])
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
    // TODO: يرسل الـ embed عبر البوت للقناة المحددة
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
    await query(`DELETE FROM embed_templates WHERE id = $1 AND guild_id = $2`, [req.params.id, req.params.guildId])
    res.json({ success: true })
  }),
)

// ════════════════════════════════════════════════════════════
//  ════════════ AUDIT LOG (Gold+) ════════════
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

    const r = await query(sql, params)
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

    // إحصائيات أساسية مجمعة
    const [protection, logs] = await Promise.all([
      getSettings("protection_settings", guildId),
      getSettings("log_settings", guildId),
    ])

    // حساب Health Score
    const securityScore = calculateSecurityScore(protection)
    const organizationScore = calculateOrganizationScore(logs)

    res.json({
      healthScore: {
        total: Math.round((securityScore + organizationScore + 75 + 80) / 4),
        breakdown: {
          security: { score: securityScore, label: "الأمان" },
          activity: { score: 75, label: "النشاط" },
          organization: { score: organizationScore, label: "التنظيم" },
          engagement: { score: 80, label: "التفاعل" },
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
  if (protection.anti_spam?.enabled) score += 25
  if (protection.anti_raid?.enabled) score += 20
  if (protection.anti_nuke?.enabled) score += 25
  return Math.min(score, 100)
}

function calculateOrganizationScore(logs) {
  if (!logs) return 30
  if (!logs.enabled) return 30
  const events = logs.events || {}
  const enabled = Object.values(events).filter((e) => e.enabled).length
  const total = Math.max(Object.keys(events).length, 1)
  return Math.round(30 + (enabled / total) * 70)
}

module.exports = router
