/**
 * ═══════════════════════════════════════════════════════════
 *  Subscription Routes
 *  /api/subscription/*  /api/payment-requests
 *
 *  ✅ NEW: يستدعي البوت بعد approve/reject/expire لمزامنة الرتبة
 *  ✅ NEW: GET /api/admin/stats للوحة الأونر
 * ═══════════════════════════════════════════════════════════
 */

const express = require("express")
const { asyncHandler, ApiError } = require("../middleware/error")
const { requireAuth, requireOwner } = require("../middleware/auth")
const { query } = require("../config/database")
const { invalidateGuildPlan } = require("../services/guildPlan")
const env = require("../config/env")

const router = express.Router()

// ════════════════════════════════════════════════════════════
//  Helper: استدعاء البوت لمزامنة الرتبة
// ════════════════════════════════════════════════════════════

async function syncBotRole(userId, planId, status) {
  const botUrl = env.BOT_URL || process.env.BOT_URL
  const botSecret = env.BOT_SECRET || process.env.BOT_SECRET

  if (!botUrl || !botSecret) {
    console.warn("[SYNC_ROLE] BOT_URL or BOT_SECRET not set — skipping")
    return false
  }

  try {
    const response = await fetch(`${botUrl}/api/sync-subscription-role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": botSecret,
      },
      body: JSON.stringify({ userId, planId, status }),
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      console.error(`[SYNC_ROLE] Bot returned ${response.status}`)
      return false
    }

    const result = await response.json()
    console.log(`[SYNC_ROLE] ✅ ${userId} → ${planId} (${status})`, result)
    return true
  } catch (err) {
    console.error("[SYNC_ROLE] Failed:", err.message)
    return false
  }
}

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
      const wasActive = sub.status === "active"

      await query(
        `UPDATE subscriptions SET status = 'expired', updated_at = NOW() WHERE user_id = $1`,
        [req.params.userId],
      )
      sub.status = "expired"

      // ✅ سحب الرتبة لو كان active
      if (wasActive) {
        syncBotRole(req.params.userId, sub.plan_id, "expired").catch(() => {})
      }
    }

    res.json(sub)
  }),
)

// ════════════════════════════════════════════════════════════
//  GET /api/payment-requests/me
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
//  GET /api/admin/payment-requests
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
//  ✅ يستدعي البوت لإعطاء رتبة الاشتراك
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

    // ✅ مزامنة رتبة الاشتراك في البوت (non-blocking)
    syncBotRole(payment.user_id, payment.plan_id, "active").catch(() => {})

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
//  POST /api/admin/subscriptions/:userId/cancel
//  إلغاء اشتراك مستخدم يدوياً (للأونر) — يسحب الرتبة
// ════════════════════════════════════════════════════════════

router.post(
  "/admin/subscriptions/:userId/cancel",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const userId = req.params.userId

    const sub = await query(
      `SELECT plan_id FROM subscriptions WHERE user_id = $1 LIMIT 1`,
      [userId],
    )

    await query(
      `UPDATE subscriptions SET status = 'cancelled', updated_at = NOW() WHERE user_id = $1`,
      [userId],
    )

    // فك ربط أي سيرفر مرتبط
    const linked = await query(
      `DELETE FROM guild_subscriptions WHERE owner_id = $1 RETURNING guild_id`,
      [userId],
    )
    for (const row of linked.rows || []) {
      invalidateGuildPlan(row.guild_id)
    }

    // ✅ سحب الرتبة في البوت
    syncBotRole(userId, sub.rows[0]?.plan_id || null, "cancelled").catch(() => {})

    res.json({ success: true, unlinked: linked.rows.length })
  }),
)

// ════════════════════════════════════════════════════════════
//  ✅ NEW: GET /api/admin/stats
//  إحصائيات سريعة للوحة المالك
// ════════════════════════════════════════════════════════════

router.get(
  "/admin/stats",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    // ─── Counts of payment requests by status ───
    const counts = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')  AS pending,
        COUNT(*) FILTER (WHERE status = 'approved') AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
        COUNT(*)                                    AS total
      FROM payment_requests
    `)

    // ─── Active subscriptions count by plan ───
    const subs = await query(`
      SELECT
        plan_id,
        COUNT(*) AS count
      FROM subscriptions
      WHERE status = 'active'
        AND (expires_at IS NULL OR expires_at > NOW())
      GROUP BY plan_id
    `)

    const subsByPlan = { silver: 0, gold: 0, diamond: 0 }
    for (const row of subs.rows || []) {
      if (subsByPlan[row.plan_id] !== undefined) {
        subsByPlan[row.plan_id] = parseInt(row.count, 10) || 0
      }
    }

    const totalActiveSubs =
      subsByPlan.silver + subsByPlan.gold + subsByPlan.diamond

    // ─── Approved this month (revenue indicator) ───
    const thisMonth = await query(`
      SELECT plan_id, COUNT(*) AS count
      FROM payment_requests
      WHERE status = 'approved'
        AND reviewed_at >= date_trunc('month', NOW())
      GROUP BY plan_id
    `)

    const approvedThisMonth = { silver: 0, gold: 0, diamond: 0 }
    for (const row of thisMonth.rows || []) {
      if (approvedThisMonth[row.plan_id] !== undefined) {
        approvedThisMonth[row.plan_id] = parseInt(row.count, 10) || 0
      }
    }

    res.json({
      requests: {
        pending:  parseInt(counts.rows[0]?.pending,  10) || 0,
        approved: parseInt(counts.rows[0]?.approved, 10) || 0,
        rejected: parseInt(counts.rows[0]?.rejected, 10) || 0,
        total:    parseInt(counts.rows[0]?.total,    10) || 0,
      },
      activeSubscriptions: {
        total: totalActiveSubs,
        byPlan: subsByPlan,
      },
      approvedThisMonth,
    })
  }),
)

// ════════════════════════════════════════════════════════════
//  POST /api/guild/:guildId/link
// ════════════════════════════════════════════════════════════

router.post(
  "/guild/:guildId/link",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params

    const sub = await query(
      `SELECT plan_id FROM subscriptions WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [req.user.id],
    )

    if (!sub.rows.length) {
      throw new ApiError("ما عندك اشتراك نشط", 400, "NO_SUBSCRIPTION")
    }

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
// ══════════════════════════════════════════════════════════════════
//  ✅ ADD THIS TO: dashboard-backend/routes/subscription.js
//
//  Free Trial System — منح تجربة مجانية للأونر فقط
//  المسار: POST /api/admin/subscriptions/grant-trial
//
//  ⚠️ مهم: ضيف هذا الكود قبل `module.exports = router` في
//     ملف dashboard-backend/routes/subscription.js
//
//  هذا الـ endpoint:
//   • يمنح اشتراك مؤقت لمستخدم بمدة محددة (1-30 يوم)
//   • يمنع منح Trial مرتين لنفس المستخدم
//   • يضيف عمود is_trial = true في DB للتفريق
//   • يستدعي البوت لمزامنة الرتبة تلقائياً
// ══════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────────
//  POST /api/admin/subscriptions/grant-trial
//  Grant free trial subscription (Owner only)
// ────────────────────────────────────────────────────────────────────

router.post(
  "/admin/subscriptions/grant-trial",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const { userId, planId, days, notes } = req.body

    // ─── Validate inputs ───
    if (!userId || !/^\d{15,22}$/.test(userId)) {
      throw new ApiError("user ID غير صالح", 400, "INVALID_USER_ID")
    }

    if (!planId || !["silver", "gold", "diamond"].includes(planId)) {
      throw new ApiError("الخطة غير صالحة", 400, "INVALID_PLAN")
    }

    const trialDays = parseInt(days, 10)
    if (!trialDays || trialDays < 1 || trialDays > 30) {
      throw new ApiError("المدة يجب تكون بين 1 و 30 يوم", 400, "INVALID_DAYS")
    }

    // ─── Check existing subscription ───
    const existing = await query(
      `SELECT plan_id, status, expires_at, is_trial FROM subscriptions WHERE user_id = $1 LIMIT 1`,
      [userId],
    )

    // منع منح Trial مرتين
    if (existing.rows.length > 0 && existing.rows[0].is_trial === true) {
      throw new ApiError(
        "هذا المستخدم استلم تجربة مجانية من قبل",
        400,
        "TRIAL_ALREADY_GRANTED"
      )
    }

    // منع منح Trial لمشترك مدفوع نشط
    if (existing.rows.length > 0) {
      const sub = existing.rows[0]
      const isActiveAndPaid = sub.status === "active" &&
                              sub.is_trial !== true &&
                              (!sub.expires_at || new Date(sub.expires_at) > new Date())
      if (isActiveAndPaid) {
        throw new ApiError(
          "هذا المستخدم عنده اشتراك مدفوع نشط — لا يحتاج Trial",
          400,
          "HAS_PAID_SUBSCRIPTION"
        )
      }
    }

    // ─── Calculate expiry ───
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + trialDays)

    // ─── Upsert subscription with is_trial = true ───
    await query(
      `INSERT INTO subscriptions (user_id, plan_id, status, expires_at, is_trial, trial_notes)
       VALUES ($1, $2, 'active', $3, true, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         plan_id    = $2,
         status     = 'active',
         expires_at = $3,
         is_trial   = true,
         trial_notes = $4,
         updated_at = NOW()`,
      [userId, planId, expiresAt, notes || null],
    )

    // ─── Sync bot role (non-blocking) ───
    syncBotRole(userId, planId, "active").catch(() => {})

    res.json({
      success: true,
      userId,
      planId,
      days: trialDays,
      expiresAt: expiresAt.toISOString(),
      message: `✅ تم منح تجربة مجانية بنجاح: ${planId} لمدة ${trialDays} يوم`
    })
  }),
)

// ────────────────────────────────────────────────────────────────────
//  GET /api/admin/subscriptions/trials
//  List all active trial subscriptions
// ────────────────────────────────────────────────────────────────────

router.get(
  "/admin/subscriptions/trials",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const r = await query(
      `SELECT user_id, plan_id, status, expires_at, trial_notes, created_at, updated_at
       FROM subscriptions
       WHERE is_trial = true
       ORDER BY expires_at DESC
       LIMIT 100`,
    )

    // فلتر: نشط vs منتهي
    const now = new Date()
    const trials = (r.rows || []).map(row => {
      const expired = row.expires_at && new Date(row.expires_at) < now
      const daysLeft = row.expires_at
        ? Math.max(0, Math.ceil((new Date(row.expires_at) - now) / 86_400_000))
        : null

      return {
        user_id: row.user_id,
        plan_id: row.plan_id,
        status: expired ? "expired" : row.status,
        expires_at: row.expires_at,
        days_left: daysLeft,
        notes: row.trial_notes,
        created_at: row.created_at,
        is_expired: expired
      }
    })

    res.json({
      total: trials.length,
      active: trials.filter(t => !t.is_expired).length,
      expired: trials.filter(t => t.is_expired).length,
      trials
    })
  }),
)
module.exports = router