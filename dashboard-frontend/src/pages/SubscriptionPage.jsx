/**
 * ═══════════════════════════════════════════════════════════
 *  Subscription Routes
 *  /api/subscription/*  /api/payment-requests
 * ═══════════════════════════════════════════════════════════
 */

const express = require("express")
const { asyncHandler, ApiError } = require("../middleware/error")
const { requireAuth, requireOwner } = require("../middleware/auth")
const { query } = require("../config/database")
const { invalidateGuildPlan } = require("../services/guildPlan")

const router = express.Router()

// ════════════════════════════════════════════════════════════
//  GET /api/subscription/:userId
// ════════════════════════════════════════════════════════════

router.get(
  "/subscription/:userId",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user.id !== req.params.userId && req.user.id !== process.env.OWNER_ID) {
      throw new ApiError("غير مصرح", 403)
    }

    const r = await query(
      `SELECT * FROM subscriptions WHERE user_id = $1 LIMIT 1`,
      [req.params.userId],
    )

    if (!r.rows.length) {
      return res.json({
        user_id: req.params.userId,
        plan_id: "free",
        status: "inactive",
        expires_at: null,
      })
    }

    const sub = r.rows[0]

    // فحص انتهاء الاشتراك
    if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
      await query(
        `UPDATE subscriptions SET status = 'expired', updated_at = NOW() WHERE user_id = $1`,
        [req.params.userId],
      )
      sub.status = "expired"
    }

    res.json(sub)
  }),
)

// ════════════════════════════════════════════════════════════
//  ✅ NEW: GET /api/payment-requests/me
//  جلب طلبات المستخدم الحالية (سجل المدفوعات)
// ════════════════════════════════════════════════════════════

router.get(
  "/payment-requests/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = await query(
      `SELECT id, plan_id, ref_number, status, notes, created_at, reviewed_at
       FROM payment_requests
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id],
    )
    res.json(r.rows)
  }),
)

// ════════════════════════════════════════════════════════════
//  POST /api/payment-requests
//  المستخدم يطلب اشتراك جديد
// ════════════════════════════════════════════════════════════

router.post(
  "/payment-requests",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { plan_id, ref_number } = req.body

    if (!plan_id || !ref_number) {
      throw new ApiError("plan_id و ref_number مطلوبين", 400)
    }

    if (!["silver", "gold", "diamond"].includes(plan_id)) {
      throw new ApiError("الخطة غير صالحة", 400)
    }

    // فحص لو فيه طلب pending
    const existing = await query(
      `SELECT id FROM payment_requests WHERE user_id = $1 AND status = 'pending' LIMIT 1`,
      [req.user.id],
    )

    if (existing.rows.length > 0) {
      throw new ApiError("لديك طلب قيد المراجعة بالفعل", 400, "PENDING_EXISTS")
    }

    const r = await query(
      `INSERT INTO payment_requests (user_id, plan_id, ref_number, status)
       VALUES ($1, $2, $3, 'pending') RETURNING *`,
      [req.user.id, plan_id, ref_number],
    )

    res.json(r.rows[0])
  }),
)

// ════════════════════════════════════════════════════════════
//  GET /api/admin/payment-requests (Owner only)
// ════════════════════════════════════════════════════════════

router.get(
  "/admin/payment-requests",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const status = req.query.status || "pending"
    const r = await query(
      `SELECT * FROM payment_requests WHERE status = $1 ORDER BY created_at DESC`,
      [status],
    )
    res.json(r.rows)
  }),
)

// ════════════════════════════════════════════════════════════
//  POST /api/admin/payment-requests/:id/approve
// ════════════════════════════════════════════════════════════

router.post(
  "/admin/payment-requests/:id/approve",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const { months = 1 } = req.body

    const reqRow = await query(`SELECT * FROM payment_requests WHERE id = $1`, [req.params.id])
    if (!reqRow.rows.length) throw new ApiError("طلب غير موجود", 404)

    const payment = reqRow.rows[0]
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + months)

    // تفعيل الاشتراك
    await query(
      `INSERT INTO subscriptions (user_id, plan_id, status, expires_at)
       VALUES ($1, $2, 'active', $3)
       ON CONFLICT (user_id) DO UPDATE SET
         plan_id = $2, status = 'active', expires_at = $3, updated_at = NOW()`,
      [payment.user_id, payment.plan_id, expiresAt],
    )

    // تحديث الطلب
    await query(
      `UPDATE payment_requests SET status = 'approved', reviewed_at = NOW() WHERE id = $1`,
      [req.params.id],
    )

    res.json({ success: true })
  }),
)

// ════════════════════════════════════════════════════════════
//  POST /api/admin/payment-requests/:id/reject
// ════════════════════════════════════════════════════════════

router.post(
  "/admin/payment-requests/:id/reject",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const { notes } = req.body
    await query(
      `UPDATE payment_requests SET status = 'rejected', notes = $1, reviewed_at = NOW() WHERE id = $2`,
      [notes || null, req.params.id],
    )
    res.json({ success: true })
  }),
)

// ════════════════════════════════════════════════════════════
//  POST /api/guild/:guildId/link
//  ربط الاشتراك بسيرفر
// ════════════════════════════════════════════════════════════

router.post(
  "/guild/:guildId/link",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params

    // فحص إن المستخدم عنده اشتراك نشط
    const sub = await query(
      `SELECT plan_id FROM subscriptions WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [req.user.id],
    )

    if (!sub.rows.length) {
      throw new ApiError("ما عندك اشتراك نشط", 400, "NO_SUBSCRIPTION")
    }

    // فحص إن المستخدم ما عنده ربط آخر
    const existing = await query(
      `SELECT guild_id FROM guild_subscriptions WHERE owner_id = $1`,
      [req.user.id],
    )

    if (existing.rows.length > 0 && existing.rows[0].guild_id !== guildId) {
      throw new ApiError(
        "اشتراكك مربوط بسيرفر آخر — فك الربط أولاً",
        400,
        "ALREADY_LINKED",
      )
    }

    await query(
      `INSERT INTO guild_subscriptions (guild_id, owner_id) VALUES ($1, $2)
       ON CONFLICT (guild_id) DO UPDATE SET owner_id = $2`,
      [guildId, req.user.id],
    )

    invalidateGuildPlan(guildId)
    res.json({ success: true })
  }),
)

router.delete(
  "/guild/:guildId/link",
  requireAuth,
  asyncHandler(async (req, res) => {
    await query(
      `DELETE FROM guild_subscriptions WHERE guild_id = $1 AND owner_id = $2`,
      [req.params.guildId, req.user.id],
    )
    invalidateGuildPlan(req.params.guildId)
    res.json({ success: true })
  }),
)

module.exports = router