/**
 * ═══════════════════════════════════════════════════════════
 *  Bulk Actions Routes
 *  المسار: dashboard-backend/routes/bulk.js
 *
 *  POST /bulk/ban         → حظر جماعي
 *  POST /bulk/kick        → طرد جماعي
 *  POST /bulk/mute        → كتم جماعي
 *  POST /bulk/role-add    → إضافة رتبة جماعي
 *  POST /bulk/role-remove → حذف رتبة جماعي
 *  POST /bulk/undo        → تراجع
 *  GET  /bulk/recent      → آخر العمليات (لإظهار زر undo)
 *
 *  الخطة المطلوبة: Silver+ (لكل العمليات الجماعية)
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
//  Bot proxy
// ════════════════════════════════════════════════════════════

async function callBot(path, body) {
  if (!env.BOT_API_URL || !env.BOT_SECRET) {
    throw new ApiError("Bot API not configured", 500, "BOT_API_NOT_CONFIGURED")
  }

  const response = await fetch(`${env.BOT_API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bot-secret": env.BOT_SECRET,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000), // bulk operations may take time
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
//  Validate
// ════════════════════════════════════════════════════════════

function validateUserIds(userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new ApiError("user_ids مطلوب", 400, "INVALID_USER_IDS")
  }
  if (userIds.length > 50) {
    throw new ApiError("الحد الأقصى 50 عضو لكل عملية", 400, "TOO_MANY_USERS")
  }
  for (const id of userIds) {
    if (typeof id !== "string" || !/^\d+$/.test(id)) {
      throw new ApiError(`user_id غير صالح: ${id}`, 400, "INVALID_USER_ID")
    }
  }
}

// ════════════════════════════════════════════════════════════
//  POST /bulk/ban
// ════════════════════════════════════════════════════════════

router.post(
  "/bulk/ban",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.SILVER),
  auditLog("bulk.ban"),
  asyncHandler(async (req, res) => {
    validateUserIds(req.body.user_ids)

    const result = await callBot("/api/internal/bulk/ban", {
      guild_id: req.params.guildId,
      user_ids: req.body.user_ids,
      executor_id: req.user.id,
      reason: req.body.reason || null,
    })

    res.json(result)
  }),
)

// ════════════════════════════════════════════════════════════
//  POST /bulk/kick
// ════════════════════════════════════════════════════════════

router.post(
  "/bulk/kick",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.SILVER),
  auditLog("bulk.kick"),
  asyncHandler(async (req, res) => {
    validateUserIds(req.body.user_ids)

    const result = await callBot("/api/internal/bulk/kick", {
      guild_id: req.params.guildId,
      user_ids: req.body.user_ids,
      executor_id: req.user.id,
      reason: req.body.reason || null,
    })

    res.json(result)
  }),
)

// ════════════════════════════════════════════════════════════
//  POST /bulk/mute
// ════════════════════════════════════════════════════════════

router.post(
  "/bulk/mute",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.SILVER),
  auditLog("bulk.mute"),
  asyncHandler(async (req, res) => {
    validateUserIds(req.body.user_ids)

    const durationMs = parseInt(req.body.duration_ms)
    if (!isFinite(durationMs) || durationMs < 60000) {
      throw new ApiError("المدة قصيرة جداً (الأقل دقيقة)", 400, "INVALID_DURATION")
    }
    if (durationMs > 28 * 24 * 60 * 60 * 1000) {
      throw new ApiError("المدة طويلة جداً (الأقصى 28 يوم)", 400, "INVALID_DURATION")
    }

    const result = await callBot("/api/internal/bulk/mute", {
      guild_id: req.params.guildId,
      user_ids: req.body.user_ids,
      executor_id: req.user.id,
      duration_ms: durationMs,
      reason: req.body.reason || null,
    })

    res.json(result)
  }),
)

// ════════════════════════════════════════════════════════════
//  POST /bulk/role-add
// ════════════════════════════════════════════════════════════

router.post(
  "/bulk/role-add",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.SILVER),
  auditLog("bulk.role_add"),
  asyncHandler(async (req, res) => {
    validateUserIds(req.body.user_ids)

    const roleId = req.body.role_id
    if (!roleId || !/^\d+$/.test(String(roleId))) {
      throw new ApiError("role_id مطلوب", 400, "INVALID_ROLE_ID")
    }

    const result = await callBot("/api/internal/bulk/role-add", {
      guild_id: req.params.guildId,
      user_ids: req.body.user_ids,
      executor_id: req.user.id,
      role_id: roleId,
      reason: req.body.reason || null,
    })

    res.json(result)
  }),
)

// ════════════════════════════════════════════════════════════
//  POST /bulk/role-remove
// ════════════════════════════════════════════════════════════

router.post(
  "/bulk/role-remove",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.SILVER),
  auditLog("bulk.role_remove"),
  asyncHandler(async (req, res) => {
    validateUserIds(req.body.user_ids)

    const roleId = req.body.role_id
    if (!roleId || !/^\d+$/.test(String(roleId))) {
      throw new ApiError("role_id مطلوب", 400, "INVALID_ROLE_ID")
    }

    const result = await callBot("/api/internal/bulk/role-remove", {
      guild_id: req.params.guildId,
      user_ids: req.body.user_ids,
      executor_id: req.user.id,
      role_id: roleId,
      reason: req.body.reason || null,
    })

    res.json(result)
  }),
)

// ════════════════════════════════════════════════════════════
//  POST /bulk/undo
// ════════════════════════════════════════════════════════════

router.post(
  "/bulk/undo",
  requireAuth,
  requireGuildAdmin,
  auditLog("bulk.undo"),
  asyncHandler(async (req, res) => {
    const actionId = parseInt(req.body.action_id)
    if (!isFinite(actionId)) {
      throw new ApiError("action_id مطلوب", 400, "INVALID_ACTION_ID")
    }

    // فحص الملكية: action لازم يكون في نفس السيرفر
    const check = await query(
      "SELECT id, created_at, reverted_at FROM bulk_actions WHERE id = $1 AND guild_id = $2",
      [actionId, req.params.guildId],
    )

    if (check.rows.length === 0) {
      throw new ApiError("العملية غير موجودة", 404, "NOT_FOUND")
    }

    if (check.rows[0].reverted_at) {
      throw new ApiError("تم التراجع عن هذه العملية مسبقاً", 400, "ALREADY_REVERTED")
    }

    const result = await callBot("/api/internal/bulk/undo", {
      action_id: actionId,
      executor_id: req.user.id,
    })

    res.json(result)
  }),
)

// ════════════════════════════════════════════════════════════
//  GET /bulk/recent — آخر العمليات (للـ undo UI)
// ════════════════════════════════════════════════════════════

router.get(
  "/bulk/recent",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50)

    const result = await query(
      `SELECT id, action_type, target_type, success_count, failed_count,
              reverted_at, created_at,
              executed_by,
              jsonb_array_length(targets) AS total
       FROM bulk_actions
       WHERE guild_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [req.params.guildId, limit],
    )

    res.json({ actions: result.rows || [] })
  }),
)

module.exports = router