/**
 * ═══════════════════════════════════════════════════════════
 *  AutoMod Dashboard Routes
 *  المسار: dashboard-backend/routes/automod.js
 *
 *  GET    /automod                 → الإعدادات
 *  PUT    /automod                 → حفظ الإعدادات
 *  GET    /automod/words           → قائمة الكلمات
 *  POST   /automod/words           → إضافة كلمة
 *  DELETE /automod/words/:id       → حذف كلمة
 *  GET    /automod/violations      → سجل المخالفات
 *
 *  الخطة المطلوبة: Silver+
 * ═══════════════════════════════════════════════════════════
 */

const express = require("express")
const { asyncHandler, ApiError } = require("../middleware/error")
const { requireAuth, requireGuildAdmin } = require("../middleware/auth")
const { auditLog } = require("../middleware/audit")
const { query } = require("../config/database")
const { getGuildPlan } = require("../services/guildPlan")
const { hasAccess, PLAN_TIERS } = require("../plans")

const router = express.Router({ mergeParams: true })

// ════════════════════════════════════════════════════════════
//  Plan gate
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
//  GET /automod — جلب الإعدادات
// ════════════════════════════════════════════════════════════

router.get(
  "/automod",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params

    const result = await query(
      "SELECT * FROM automod_settings WHERE guild_id = $1",
      [guildId],
    )

    const row = result.rows[0] || {}

    res.json({
      enabled: row.enabled === true,
      filters: row.filters
        ? (typeof row.filters === "string" ? JSON.parse(row.filters) : row.filters)
        : {},
      whitelist: row.whitelist
        ? (typeof row.whitelist === "string" ? JSON.parse(row.whitelist) : row.whitelist)
        : { roles: [], channels: [], users: [] },
      log_channel: row.log_channel || null,
    })
  }),
)

// ════════════════════════════════════════════════════════════
//  PUT /automod — حفظ الإعدادات
// ════════════════════════════════════════════════════════════

router.put(
  "/automod",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.SILVER),
  auditLog("automod.update"),
  asyncHandler(async (req, res) => {
    const { guildId } = req.params
    const { enabled, filters, whitelist, log_channel } = req.body

    // ─── Validate ───
    const enabledVal = enabled === true
    const filtersVal = (filters && typeof filters === "object") ? filters : {}
    const whitelistVal = {
      roles: Array.isArray(whitelist?.roles)
        ? whitelist.roles.filter(s => typeof s === "string" && /^\d+$/.test(s)).slice(0, 50)
        : [],
      channels: Array.isArray(whitelist?.channels)
        ? whitelist.channels.filter(s => typeof s === "string" && /^\d+$/.test(s)).slice(0, 50)
        : [],
      users: Array.isArray(whitelist?.users)
        ? whitelist.users.filter(s => typeof s === "string" && /^\d+$/.test(s)).slice(0, 100)
        : [],
    }
    const logChannelVal = (log_channel && typeof log_channel === "string" && /^\d+$/.test(log_channel))
      ? log_channel
      : null

    await query(
      `INSERT INTO automod_settings (guild_id, enabled, filters, whitelist, log_channel, updated_at)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, NOW())
       ON CONFLICT (guild_id) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         filters = EXCLUDED.filters,
         whitelist = EXCLUDED.whitelist,
         log_channel = EXCLUDED.log_channel,
         updated_at = NOW()`,
      [
        guildId,
        enabledVal,
        JSON.stringify(filtersVal),
        JSON.stringify(whitelistVal),
        logChannelVal,
      ],
    )

    res.json({ success: true })
  }),
)

// ════════════════════════════════════════════════════════════
//  GET /automod/words — قائمة الكلمات المخصصة
// ════════════════════════════════════════════════════════════

router.get(
  "/automod/words",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params

    const result = await query(
      `SELECT id, word, type, match_type, created_at
       FROM automod_words
       WHERE guild_id = $1
       ORDER BY created_at DESC
       LIMIT 500`,
      [guildId],
    )

    res.json({ words: result.rows || [] })
  }),
)

// ════════════════════════════════════════════════════════════
//  POST /automod/words — إضافة كلمة
// ════════════════════════════════════════════════════════════

router.post(
  "/automod/words",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.SILVER),
  auditLog("automod.word.add"),
  asyncHandler(async (req, res) => {
    const { guildId } = req.params
    const { word, type } = req.body

    if (!word || typeof word !== "string" || word.trim().length === 0) {
      throw new ApiError("الكلمة مطلوبة", 400, "INVALID_WORD")
    }
    if (word.length > 100) {
      throw new ApiError("الكلمة طويلة جداً (الأقصى 100 حرف)", 400, "WORD_TOO_LONG")
    }

    const cleanWord = word.trim().toLowerCase()
    const cleanType = ["banned", "warned"].includes(type) ? type : "banned"

    // فحص الحد الأقصى
    const countResult = await query(
      "SELECT COUNT(*)::int AS count FROM automod_words WHERE guild_id = $1",
      [guildId],
    )
    if ((countResult.rows[0]?.count || 0) >= 500) {
      throw new ApiError("وصلت الحد الأقصى من الكلمات (500)", 400, "LIMIT_REACHED")
    }

    await query(
      `INSERT INTO automod_words (guild_id, word, type, match_type)
       VALUES ($1, $2, $3, 'contains')
       ON CONFLICT (guild_id, word) DO UPDATE SET type = EXCLUDED.type
       RETURNING id, word, type, match_type, created_at`,
      [guildId, cleanWord, cleanType],
    )

    res.json({ success: true })
  }),
)

// ════════════════════════════════════════════════════════════
//  DELETE /automod/words/:id — حذف كلمة
// ════════════════════════════════════════════════════════════

router.delete(
  "/automod/words/:id",
  requireAuth,
  requireGuildAdmin,
  auditLog("automod.word.delete"),
  asyncHandler(async (req, res) => {
    const { guildId, id } = req.params

    await query(
      "DELETE FROM automod_words WHERE id = $1 AND guild_id = $2",
      [id, guildId],
    )

    res.json({ success: true })
  }),
)

// ════════════════════════════════════════════════════════════
//  GET /automod/violations — سجل المخالفات
// ════════════════════════════════════════════════════════════

router.get(
  "/automod/violations",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params
    const limit = Math.min(parseInt(req.query.limit) || 50, 200)
    const userId = req.query.user_id

    let sql = `
      SELECT id, user_id, filter_type, action, content, created_at
      FROM automod_violations
      WHERE guild_id = $1
    `
    const params = [guildId]

    if (userId) {
      params.push(userId)
      sql += ` AND user_id = $${params.length}`
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`
    params.push(limit)

    const result = await query(sql, params)

    // إحصائيات سريعة
    const statsResult = await query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int AS last_24h,
         COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS last_7d
       FROM automod_violations
       WHERE guild_id = $1`,
      [guildId],
    )

    res.json({
      violations: result.rows || [],
      stats: statsResult.rows[0] || { total: 0, last_24h: 0, last_7d: 0 },
    })
  }),
)

module.exports = router