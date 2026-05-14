/**
 * ═══════════════════════════════════════════════════════════
 *  Giveaway Routes
 *  المسار: dashboard-backend/routes/giveaway.js
 *
 *  GET    /giveaway              → قائمة السحوبات
 *  GET    /giveaway/:id          → تفاصيل سحب + المشاركون
 *  POST   /giveaway              → إنشاء سحب جديد
 *  POST   /giveaway/:id/end      → إنهاء سحب
 *  POST   /giveaway/:id/cancel   → إلغاء سحب
 *  POST   /giveaway/:id/reroll   → إعادة سحب
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
const env = require("../config/env")

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
//  Bot communication helper
// ════════════════════════════════════════════════════════════

async function callBot(path, body) {
  if (!env.BOT_API_URL || !env.BOT_SECRET) {
    throw new ApiError("Bot API غير مكوّن", 500, "BOT_API_NOT_CONFIGURED")
  }

  const response = await fetch(`${env.BOT_API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bot-secret": env.BOT_SECRET,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new ApiError(
      data.error || "فشل الاتصال بالبوت",
      response.status,
      data.code || "BOT_ERROR",
    )
  }

  return data
}

// ════════════════════════════════════════════════════════════
//  GET /giveaway — قائمة السحوبات
// ════════════════════════════════════════════════════════════

router.get(
  "/giveaway",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params
    const status = req.query.status // active | ended | cancelled | all
    const limit = Math.min(parseInt(req.query.limit) || 50, 100)

    let sql = `
      SELECT g.*,
             COALESCE((SELECT COUNT(*)::int FROM giveaway_entries e
                       WHERE e.giveaway_id = g.id), 0) AS entry_count
      FROM giveaways g
      WHERE g.guild_id = $1
    `
    const params = [guildId]

    if (status && status !== "all") {
      params.push(status)
      sql += ` AND g.status = $${params.length}`
    }

    sql += ` ORDER BY g.created_at DESC LIMIT $${params.length + 1}`
    params.push(limit)

    const result = await query(sql, params)
    res.json({ giveaways: result.rows || [] })
  }),
)

// ════════════════════════════════════════════════════════════
//  GET /giveaway/:id — تفاصيل سحب
// ════════════════════════════════════════════════════════════

router.get(
  "/giveaway/:id",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const { guildId, id } = req.params

    const giveawayResult = await query(
      "SELECT * FROM giveaways WHERE id = $1 AND guild_id = $2",
      [id, guildId],
    )

    const giveaway = giveawayResult.rows[0]
    if (!giveaway) throw new ApiError("السحب غير موجود", 404, "NOT_FOUND")

    const entriesResult = await query(
      `SELECT user_id, entered_at
       FROM giveaway_entries
       WHERE giveaway_id = $1
       ORDER BY entered_at DESC
       LIMIT 200`,
      [id],
    )

    res.json({
      giveaway,
      entries: entriesResult.rows || [],
      entry_count: entriesResult.rows?.length || 0,
    })
  }),
)

// ════════════════════════════════════════════════════════════
//  POST /giveaway — إنشاء سحب
// ════════════════════════════════════════════════════════════

router.post(
  "/giveaway",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.SILVER),
  auditLog("giveaway.create"),
  asyncHandler(async (req, res) => {
    const { guildId } = req.params
    const {
      channel_id,
      prize,
      description,
      winner_count,
      duration_ms,
      required_role,
      required_level,
    } = req.body

    // ─── Validate ───
    if (!channel_id || typeof channel_id !== "string") {
      throw new ApiError("القناة مطلوبة", 400, "INVALID_CHANNEL")
    }
    if (!prize || typeof prize !== "string" || prize.length < 1) {
      throw new ApiError("الجائزة مطلوبة", 400, "INVALID_PRIZE")
    }
    if (!duration_ms || duration_ms < 60 * 1000) {
      throw new ApiError("المدة قصيرة جداً (الأقل دقيقة)", 400, "INVALID_DURATION")
    }
    if (duration_ms > 30 * 24 * 60 * 60 * 1000) {
      throw new ApiError("المدة طويلة جداً (الأقصى 30 يوم)", 400, "INVALID_DURATION")
    }

    // ─── Call bot to create giveaway (since it needs Discord.js) ───
    const result = await callBot("/api/internal/giveaway/create", {
      guild_id: guildId,
      channel_id,
      host_id: req.user.id,
      prize: String(prize).slice(0, 200),
      description: description ? String(description).slice(0, 1000) : null,
      winner_count: Math.max(1, Math.min(parseInt(winner_count) || 1, 20)),
      duration_ms: parseInt(duration_ms),
      required_role: required_role || null,
      required_level: Math.max(0, parseInt(required_level) || 0),
    })

    res.json({ success: true, giveaway: result.giveaway })
  }),
)

// ════════════════════════════════════════════════════════════
//  POST /giveaway/:id/end — إنهاء سحب
// ════════════════════════════════════════════════════════════

router.post(
  "/giveaway/:id/end",
  requireAuth,
  requireGuildAdmin,
  auditLog("giveaway.end"),
  asyncHandler(async (req, res) => {
    const { guildId, id } = req.params

    // تأكد من الملكية
    const check = await query(
      "SELECT id FROM giveaways WHERE id = $1 AND guild_id = $2",
      [id, guildId],
    )
    if (check.rows.length === 0) {
      throw new ApiError("السحب غير موجود", 404, "NOT_FOUND")
    }

    const result = await callBot("/api/internal/giveaway/end", { giveaway_id: parseInt(id) })
    res.json(result)
  }),
)

// ════════════════════════════════════════════════════════════
//  POST /giveaway/:id/cancel — إلغاء سحب
// ════════════════════════════════════════════════════════════

router.post(
  "/giveaway/:id/cancel",
  requireAuth,
  requireGuildAdmin,
  auditLog("giveaway.cancel"),
  asyncHandler(async (req, res) => {
    const { guildId, id } = req.params

    const check = await query(
      "SELECT id FROM giveaways WHERE id = $1 AND guild_id = $2",
      [id, guildId],
    )
    if (check.rows.length === 0) {
      throw new ApiError("السحب غير موجود", 404, "NOT_FOUND")
    }

    const result = await callBot("/api/internal/giveaway/cancel", { giveaway_id: parseInt(id) })
    res.json(result)
  }),
)

// ════════════════════════════════════════════════════════════
//  POST /giveaway/:id/reroll — إعادة اختيار فائز
// ════════════════════════════════════════════════════════════

router.post(
  "/giveaway/:id/reroll",
  requireAuth,
  requireGuildAdmin,
  auditLog("giveaway.reroll"),
  asyncHandler(async (req, res) => {
    const { guildId, id } = req.params
    const count = Math.max(1, Math.min(parseInt(req.body?.count) || 1, 10))

    const check = await query(
      "SELECT id FROM giveaways WHERE id = $1 AND guild_id = $2",
      [id, guildId],
    )
    if (check.rows.length === 0) {
      throw new ApiError("السحب غير موجود", 404, "NOT_FOUND")
    }

    const result = await callBot("/api/internal/giveaway/reroll", {
      giveaway_id: parseInt(id),
      count,
    })
    res.json(result)
  }),
)
// ══════════════════════════════════════════════════════════════════
//  PATCH: يضاف لملف dashboard-backend/routes/giveaway.js
//  المكان: قبل module.exports = router مباشرة
// ══════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════
//  POST /giveaway/bulk-delete — حذف جماعي
//  يحذف فقط السحوبات المنتهية أو الملغية (الـ active يستخدم /cancel)
// ════════════════════════════════════════════════════════════

router.post(
  "/giveaway/bulk-delete",
  requireAuth,
  requireGuildAdmin,
  auditLog("giveaway.bulk_delete"),
  asyncHandler(async (req, res) => {
    const { guildId } = req.params
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ApiError("ids مطلوب", 400, "INVALID_IDS")
    }

    if (ids.length > 100) {
      throw new ApiError("الحد الأقصى 100 سحب", 400, "TOO_MANY")
    }

    // فلتر للأرقام الصالحة
    const validIds = ids
      .map(id => parseInt(id))
      .filter(id => isFinite(id) && id > 0)

    if (validIds.length === 0) {
      throw new ApiError("لا توجد أرقام صالحة", 400, "INVALID_IDS")
    }

    // حذف من DB — فقط للسحوبات اللي خلصت أو ألغيت (مش الـ active)
    const result = await query(
      `DELETE FROM giveaways
       WHERE guild_id = $1
         AND id = ANY($2::int[])
         AND status IN ('ended', 'cancelled')
       RETURNING id`,
      [guildId, validIds],
    )

    const deletedCount = result.rows?.length || 0
    const skippedCount = validIds.length - deletedCount

    res.json({
      success: true,
      deleted_count: deletedCount,
      skipped_count: skippedCount,
      message: skippedCount > 0
        ? `تم حذف ${deletedCount}, تخطّى ${skippedCount} (نشطة أو غير موجودة)`
        : `تم حذف ${deletedCount} سحب`,
    })
  }),
)

module.exports = router