/**
 * ═══════════════════════════════════════════════════════════
 *  Card Subscription Routes
 *  المسار: dashboard-backend/routes/cardSubscription.js
 *
 *  منفصل تماماً عن routes/subscription.js (اشتراكات البوت)
 *
 *  ────────────────────────────────────────────────────────
 *   USER ENDPOINTS
 *  ────────────────────────────────────────────────────────
 *  GET    /api/card/me                        → اشتراكي + إعداداتي
 *  GET    /api/card/settings                  → إعدادات بطاقتي
 *  PUT    /api/card/settings                  → حفظ إعدادات
 *  POST   /api/card/settings/reset            → إعادة تعيين
 *  GET    /api/card/tiers                     → كل الفئات
 *  GET    /api/card/requests/me               → طلباتي
 *  POST   /api/card/requests                  → إرسال طلب اشتراك
 *  GET    /api/card/logs/me                   → سجل أحداث اشتراكي
 *
 *  ────────────────────────────────────────────────────────
 *   ADMIN ENDPOINTS (Owner only)
 *  ────────────────────────────────────────────────────────
 *  GET    /api/card/admin/stats               → إحصائيات
 *  GET    /api/card/admin/requests            → كل الطلبات
 *  POST   /api/card/admin/requests/:id/approve → قبول طلب
 *  POST   /api/card/admin/requests/:id/reject  → رفض طلب
 *  GET    /api/card/admin/subscriptions       → كل المشتركين
 *  GET    /api/card/admin/subscriptions/:userId → اشتراك مستخدم محدد
 *  POST   /api/card/admin/subscriptions/:userId/extend → تمديد يدوي
 *  POST   /api/card/admin/subscriptions/:userId/cancel → إلغاء
 *  POST   /api/card/admin/subscriptions/:userId/change-tier → تغيير الفئة
 *  POST   /api/card/admin/gift                → منح اشتراك هدية
 *  GET    /api/card/admin/logs                → سجل كل الأحداث
 * ═══════════════════════════════════════════════════════════
 */

const express = require("express")
const { asyncHandler, ApiError } = require("../middleware/error")
const { requireAuth, requireOwner } = require("../middleware/auth")
const { query } = require("../config/database")
const env = require("../config/env")
const {
  CARD_TIERS,
  TIER_ORDER,
  getTier,
  getPrice,
  hasAccess,
  calculateExpiryDate,
  addDays,
  isExpired,
  daysLeft,
  getAllTiers,
  getPaidTiers,
  isValidTier,
  isValidDuration,
} = require("../config/cardPlans")

const router = express.Router()

// ════════════════════════════════════════════════════════════
//  Helper: استدعاء البوت لإرسال DM إشعار
// ════════════════════════════════════════════════════════════

async function notifyUser(userId, eventType, payload = {}) {
  const botUrl = env.BOT_URL || process.env.BOT_URL
  const botSecret = env.BOT_SECRET || process.env.BOT_SECRET

  if (!botUrl || !botSecret) {
    console.warn("[CARD_NOTIFY] BOT_URL or BOT_SECRET not set — skipping")
    return false
  }

  try {
    const response = await fetch(`${botUrl}/api/card/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": botSecret,
      },
      body: JSON.stringify({ userId, eventType, payload }),
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      console.error(`[CARD_NOTIFY] Bot returned ${response.status}`)
      return false
    }

    return true
  } catch (err) {
    console.error("[CARD_NOTIFY] Failed:", err.message)
    return false
  }
}

// ════════════════════════════════════════════════════════════
//  Helper: تسجيل حدث في الـ logs
// ════════════════════════════════════════════════════════════

async function logEvent({
  userId,
  action,
  daysAdded = null,
  oldTier = null,
  newTier = null,
  oldExpiresAt = null,
  newExpiresAt = null,
  reason = null,
  adminId = null,
  metadata = {},
}) {
  await query(
    `INSERT INTO card_subscription_logs
      (user_id, action, days_added, old_tier, new_tier, old_expires_at, new_expires_at, reason, admin_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [userId, action, daysAdded, oldTier, newTier, oldExpiresAt, newExpiresAt, reason, adminId, JSON.stringify(metadata)]
  )
}

// ════════════════════════════════════════════════════════════
//  Helper: جلب اشتراك مع status محدّث
// ════════════════════════════════════════════════════════════

async function getSubscription(userId) {
  const r = await query(`SELECT * FROM card_subscriptions WHERE user_id = $1 LIMIT 1`, [userId])
  if (!r.rows.length) return null

  const sub = r.rows[0]

  // فحص الانتهاء التلقائي
  if (sub.status === "active" && isExpired(sub.expires_at)) {
    await query(
      `UPDATE card_subscriptions SET status = 'expired', updated_at = NOW() WHERE user_id = $1`,
      [userId]
    )
    sub.status = "expired"

    await logEvent({
      userId,
      action: "expired",
      oldTier: sub.tier,
      reason: "Subscription auto-expired",
    })
  }

  return {
    ...sub,
    days_left: daysLeft(sub.expires_at),
    is_expired: isExpired(sub.expires_at),
  }
}

// ════════════════════════════════════════════════════════════
//  Helper: جلب إعدادات + ضمان وجودها
// ════════════════════════════════════════════════════════════

async function getOrCreateSettings(userId) {
  const r = await query(`SELECT * FROM card_settings WHERE user_id = $1 LIMIT 1`, [userId])

  if (r.rows.length) return r.rows[0]

  // إنشاء إعدادات افتراضية
  await query(
    `INSERT INTO card_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  )

  const fresh = await query(`SELECT * FROM card_settings WHERE user_id = $1 LIMIT 1`, [userId])
  return fresh.rows[0]
}

// ════════════════════════════════════════════════════════════
//  ══════════════════════════════════════════════════════════
//   USER ENDPOINTS
//  ══════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────
//  GET /card/me — اشتراكي + إعداداتي + الفئات + الميزات
// ────────────────────────────────────────────────────────────
router.get(
  "/card/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user.id

    const sub = await getSubscription(userId)
    const settings = await getOrCreateSettings(userId)

    const currentTier = sub?.status === "active" ? sub.tier : "free"
    const tierData = getTier(currentTier)

    res.json({
      user_id: userId,
      subscription: sub || {
        user_id: userId,
        tier: "free",
        status: "inactive",
        expires_at: null,
        days_left: 0,
        is_expired: true,
      },
      currentTier,
      tierData,
      settings,
    })
  })
)

// ────────────────────────────────────────────────────────────
//  GET /card/settings — إعدادات بطاقتي
// ────────────────────────────────────────────────────────────
router.get(
  "/card/settings",
  requireAuth,
  asyncHandler(async (req, res) => {
    const settings = await getOrCreateSettings(req.user.id)
    res.json(settings)
  })
)

// ────────────────────────────────────────────────────────────
//  PUT /card/settings — حفظ إعدادات
// ────────────────────────────────────────────────────────────
router.put(
  "/card/settings",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const {
      background_id,
      custom_background_url,
      theme_id,
      custom_colors,
      badges,
      effects,
      border_style,
      avatar_url,
    } = req.body

    // ── جلب الاشتراك للتحقق من الصلاحيات
    const sub = await getSubscription(userId)
    const currentTier = sub?.status === "active" ? sub.tier : "free"
    const tierData = getTier(currentTier)

    // ── التحقق من الصلاحيات
    if (custom_background_url && !tierData.features.customBackground) {
      throw new ApiError("خلفية شخصية غير متاحة في فئتك", 403, "TIER_RESTRICTED", {
        requiredTier: "advanced",
      })
    }

    if (custom_colors && Object.keys(custom_colors).length > 0 && !tierData.features.customColorPicker) {
      throw new ApiError("الألوان المخصصة غير متاحة في فئتك", 403, "TIER_RESTRICTED", {
        requiredTier: "advanced",
      })
    }

    if (Array.isArray(badges) && badges.length > tierData.features.badges) {
      throw new ApiError(
        `فئتك تسمح بـ ${tierData.features.badges} شارات فقط`,
        403,
        "TIER_RESTRICTED",
        { allowed: tierData.features.badges, requested: badges.length }
      )
    }

    if (effects && typeof effects === "object") {
      const activeEffects = Object.values(effects).filter(Boolean).length
      if (activeEffects > tierData.features.effects) {
        throw new ApiError(
          `فئتك تسمح بـ ${tierData.features.effects} تأثيرات فقط`,
          403,
          "TIER_RESTRICTED",
          { allowed: tierData.features.effects, requested: activeEffects }
        )
      }
    }

    // ── بناء UPDATE
    const fields = []
    const values = [userId]
    let idx = 2

    if (background_id !== undefined) {
      fields.push(`background_id = $${idx++}`)
      values.push(background_id)
    }
    if (custom_background_url !== undefined) {
      fields.push(`custom_background_url = $${idx++}`)
      values.push(custom_background_url || null)
    }
    if (theme_id !== undefined) {
      fields.push(`theme_id = $${idx++}`)
      values.push(theme_id)
    }
    if (custom_colors !== undefined) {
      fields.push(`custom_colors = $${idx++}`)
      values.push(JSON.stringify(custom_colors || {}))
    }
    if (badges !== undefined) {
      fields.push(`badges = $${idx++}`)
      values.push(JSON.stringify(badges || []))
    }
    if (effects !== undefined) {
      fields.push(`effects = $${idx++}`)
      values.push(JSON.stringify(effects || {}))
    }
    if (border_style !== undefined) {
      fields.push(`border_style = $${idx++}`)
      values.push(border_style)
    }
    if (avatar_url !== undefined) {
      fields.push(`avatar_url = $${idx++}`)
      values.push(avatar_url || null)
    }

    if (fields.length === 0) {
      throw new ApiError("لا توجد حقول للتحديث", 400)
    }

    fields.push(`updated_at = NOW()`)

    await query(
      `INSERT INTO card_settings (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET ${fields.join(", ")}`,
      values
    )

    const updated = await query(`SELECT * FROM card_settings WHERE user_id = $1`, [userId])
    res.json(updated.rows[0])
  })
)

// ────────────────────────────────────────────────────────────
//  POST /card/settings/reset — إعادة تعيين
// ────────────────────────────────────────────────────────────
router.post(
  "/card/settings/reset",
  requireAuth,
  asyncHandler(async (req, res) => {
    await query(
      `UPDATE card_settings SET
        background_id = 'default',
        custom_background_url = NULL,
        theme_id = 'amber',
        custom_colors = '{}'::jsonb,
        badges = '[]'::jsonb,
        effects = '{}'::jsonb,
        border_style = 'default',
        avatar_url = NULL,
        updated_at = NOW()
       WHERE user_id = $1`,
      [req.user.id]
    )

    res.json({ success: true, message: "تم إعادة تعيين البطاقة للشكل الافتراضي" })
  })
)

// ────────────────────────────────────────────────────────────
//  GET /card/tiers — كل الفئات
// ────────────────────────────────────────────────────────────
router.get(
  "/card/tiers",
  asyncHandler(async (req, res) => {
    res.json({
      tiers: getAllTiers(),
      paidTiers: getPaidTiers(),
    })
  })
)

// ────────────────────────────────────────────────────────────
//  GET /card/requests/me — طلباتي
// ────────────────────────────────────────────────────────────
router.get(
  "/card/requests/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = await query(
      `SELECT * FROM card_subscription_requests
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    )
    res.json(r.rows)
  })
)

// ────────────────────────────────────────────────────────────
//  POST /card/requests — إرسال طلب اشتراك جديد
// ────────────────────────────────────────────────────────────
router.post(
  "/card/requests",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { tier, duration, ref_number, payment_proof_url, user_notes } = req.body

    if (!isValidTier(tier) || tier === "free") {
      throw new ApiError("الفئة غير صالحة", 400)
    }
    if (!isValidDuration(duration)) {
      throw new ApiError("المدة غير صالحة (monthly أو yearly فقط)", 400)
    }
    if (!ref_number) {
      throw new ApiError("رقم المرجع مطلوب", 400)
    }

    // فحص وجود طلب pending سابق
    const existing = await query(
      `SELECT id FROM card_subscription_requests
       WHERE user_id = $1 AND status = 'pending'
       LIMIT 1`,
      [req.user.id]
    )

    if (existing.rows.length > 0) {
      throw new ApiError("لديك طلب قيد المراجعة بالفعل", 400, "PENDING_EXISTS")
    }

    const amount = getPrice(tier, duration)

    const r = await query(
      `INSERT INTO card_subscription_requests
        (user_id, username, tier, duration, amount, ref_number, payment_proof_url, user_notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
       RETURNING *`,
      [
        req.user.id,
        req.user.username || null,
        tier,
        duration,
        amount,
        ref_number,
        payment_proof_url || null,
        user_notes || null,
      ]
    )

    res.json(r.rows[0])
  })
)

// ────────────────────────────────────────────────────────────
//  GET /card/logs/me — سجل أحداث اشتراكي
// ────────────────────────────────────────────────────────────
router.get(
  "/card/logs/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = await query(
      `SELECT id, action, days_added, old_tier, new_tier, old_expires_at, new_expires_at,
              reason, admin_id, created_at
       FROM card_subscription_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    )
    res.json(r.rows)
  })
)

// ════════════════════════════════════════════════════════════
//  ══════════════════════════════════════════════════════════
//   ADMIN ENDPOINTS (Owner only)
//  ══════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────
//  GET /card/admin/stats — إحصائيات لوحة الأدمن
// ────────────────────────────────────────────────────────────
router.get(
  "/card/admin/stats",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    // ── عدد الطلبات حسب الحالة
    const reqCounts = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')  AS pending,
        COUNT(*) FILTER (WHERE status = 'approved') AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
        COUNT(*) AS total
      FROM card_subscription_requests
    `)

    // ── عدد المشتركين النشطين حسب الفئة
    const activeSubs = await query(`
      SELECT tier, COUNT(*) AS count
      FROM card_subscriptions
      WHERE status = 'active'
        AND (expires_at IS NULL OR expires_at > NOW())
      GROUP BY tier
    `)

    const subsByTier = { basic: 0, advanced: 0, legendary: 0 }
    for (const row of activeSubs.rows || []) {
      if (subsByTier[row.tier] !== undefined) {
        subsByTier[row.tier] = parseInt(row.count, 10) || 0
      }
    }
    const totalActive = subsByTier.basic + subsByTier.advanced + subsByTier.legendary

    // ── إيرادات هذا الشهر (من الطلبات المقبولة)
    const thisMonthRevenue = await query(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM card_subscription_requests
      WHERE status = 'approved'
        AND reviewed_at >= date_trunc('month', NOW())
    `)

    // ── الهدايا النشطة
    const gifts = await query(`
      SELECT COUNT(*) AS count
      FROM card_subscriptions
      WHERE is_gift = TRUE
        AND status = 'active'
        AND expires_at > NOW()
    `)

    // ── منتهي الصلاحية خلال 7 أيام
    const expiringSoon = await query(`
      SELECT COUNT(*) AS count
      FROM card_subscriptions
      WHERE status = 'active'
        AND expires_at > NOW()
        AND expires_at < NOW() + INTERVAL '7 days'
    `)

    res.json({
      requests: {
        pending:  parseInt(reqCounts.rows[0]?.pending,  10) || 0,
        approved: parseInt(reqCounts.rows[0]?.approved, 10) || 0,
        rejected: parseInt(reqCounts.rows[0]?.rejected, 10) || 0,
        total:    parseInt(reqCounts.rows[0]?.total,    10) || 0,
      },
      activeSubscriptions: {
        total: totalActive,
        byTier: subsByTier,
      },
      monthlyRevenue: parseFloat(thisMonthRevenue.rows[0]?.total || 0),
      activeGifts: parseInt(gifts.rows[0]?.count, 10) || 0,
      expiringSoon: parseInt(expiringSoon.rows[0]?.count, 10) || 0,
    })
  })
)

// ────────────────────────────────────────────────────────────
//  GET /card/admin/requests — كل الطلبات
// ────────────────────────────────────────────────────────────
router.get(
  "/card/admin/requests",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const status = req.query.status || "pending"
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200)
    const offset = parseInt(req.query.offset, 10) || 0

    const r = await query(
      `SELECT * FROM card_subscription_requests
       WHERE status = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    )
    res.json(r.rows)
  })
)

// ────────────────────────────────────────────────────────────
//  POST /card/admin/requests/:id/approve — قبول طلب
// ────────────────────────────────────────────────────────────
router.post(
  "/card/admin/requests/:id/approve",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const { admin_note } = req.body

    const reqRow = await query(
      `SELECT * FROM card_subscription_requests WHERE id = $1`,
      [req.params.id]
    )
    if (!reqRow.rows.length) throw new ApiError("الطلب غير موجود", 404)

    const request = reqRow.rows[0]
    if (request.status !== "pending") {
      throw new ApiError("هذا الطلب تمت معالجته بالفعل", 400)
    }

    // ── حساب تاريخ الانتهاء
    const expiresAt = calculateExpiryDate(request.duration)

    // ── جلب الاشتراك الحالي (لو موجود) للسجل
    const existing = await getSubscription(request.user_id)

    // ── تفعيل/تجديد الاشتراك
    await query(
      `INSERT INTO card_subscriptions (user_id, tier, status, duration, started_at, expires_at, is_gift)
       VALUES ($1, $2, 'active', $3, NOW(), $4, FALSE)
       ON CONFLICT (user_id) DO UPDATE SET
         tier = $2,
         status = 'active',
         duration = $3,
         expires_at = $4,
         is_gift = FALSE,
         updated_at = NOW()`,
      [request.user_id, request.tier, request.duration, expiresAt]
    )

    // ── تحديث الطلب
    await query(
      `UPDATE card_subscription_requests
       SET status = 'approved',
           admin_note = $1,
           reviewed_by = $2,
           reviewed_at = NOW()
       WHERE id = $3`,
      [admin_note || null, req.user.id, req.params.id]
    )

    // ── تسجيل الحدث
    await logEvent({
      userId: request.user_id,
      action: existing?.tier ? "renewed" : "created",
      oldTier: existing?.tier || null,
      newTier: request.tier,
      oldExpiresAt: existing?.expires_at || null,
      newExpiresAt: expiresAt,
      reason: admin_note || `${request.duration === "yearly" ? "اشتراك سنوي" : "اشتراك شهري"}`,
      adminId: req.user.id,
      metadata: { request_id: request.id, amount: request.amount },
    })

    // ── إشعار المستخدم في Discord (non-blocking)
    notifyUser(request.user_id, "subscription_approved", {
      tier: request.tier,
      duration: request.duration,
      expires_at: expiresAt,
      amount: request.amount,
    }).catch(() => {})

    res.json({ success: true, request_id: request.id, expires_at: expiresAt })
  })
)

// ────────────────────────────────────────────────────────────
//  POST /card/admin/requests/:id/reject — رفض طلب
// ────────────────────────────────────────────────────────────
router.post(
  "/card/admin/requests/:id/reject",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const { admin_note } = req.body

    const reqRow = await query(
      `SELECT * FROM card_subscription_requests WHERE id = $1`,
      [req.params.id]
    )
    if (!reqRow.rows.length) throw new ApiError("الطلب غير موجود", 404)
    if (reqRow.rows[0].status !== "pending") {
      throw new ApiError("هذا الطلب تمت معالجته بالفعل", 400)
    }

    await query(
      `UPDATE card_subscription_requests
       SET status = 'rejected',
           admin_note = $1,
           reviewed_by = $2,
           reviewed_at = NOW()
       WHERE id = $3`,
      [admin_note || null, req.user.id, req.params.id]
    )

    notifyUser(reqRow.rows[0].user_id, "subscription_rejected", {
      tier: reqRow.rows[0].tier,
      reason: admin_note || null,
    }).catch(() => {})

    res.json({ success: true })
  })
)

// ────────────────────────────────────────────────────────────
//  GET /card/admin/subscriptions — كل المشتركين
// ────────────────────────────────────────────────────────────
router.get(
  "/card/admin/subscriptions",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const filter = req.query.filter || "all"  // 'all' | 'active' | 'expired' | 'gifts'
    const tier = req.query.tier || null
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200)
    const offset = parseInt(req.query.offset, 10) || 0

    let whereClauses = []
    const params = []
    let idx = 1

    if (filter === "active") {
      whereClauses.push(`status = 'active'`)
      whereClauses.push(`expires_at > NOW()`)
    } else if (filter === "expired") {
      whereClauses.push(`(status = 'expired' OR expires_at <= NOW())`)
    } else if (filter === "gifts") {
      whereClauses.push(`is_gift = TRUE`)
    } else if (filter === "expiring_soon") {
      whereClauses.push(`status = 'active'`)
      whereClauses.push(`expires_at > NOW()`)
      whereClauses.push(`expires_at < NOW() + INTERVAL '7 days'`)
    }

    if (tier && isValidTier(tier)) {
      params.push(tier)
      whereClauses.push(`tier = $${idx++}`)
    }

    const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : ""

    params.push(limit, offset)
    const r = await query(
      `SELECT * FROM card_subscriptions
       ${whereSQL}
       ORDER BY expires_at DESC NULLS LAST
       LIMIT $${idx++} OFFSET $${idx}`,
      params
    )

    const enriched = r.rows.map(sub => ({
      ...sub,
      days_left: daysLeft(sub.expires_at),
      is_expired: isExpired(sub.expires_at),
    }))

    res.json(enriched)
  })
)

// ────────────────────────────────────────────────────────────
//  GET /card/admin/subscriptions/:userId — اشتراك مستخدم
// ────────────────────────────────────────────────────────────
router.get(
  "/card/admin/subscriptions/:userId",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const sub = await getSubscription(req.params.userId)

    if (!sub) {
      return res.json({
        user_id: req.params.userId,
        tier: "free",
        status: "inactive",
        expires_at: null,
        days_left: 0,
        is_expired: true,
      })
    }

    // جلب آخر 10 أحداث من السجل
    const logs = await query(
      `SELECT * FROM card_subscription_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [req.params.userId]
    )

    res.json({ ...sub, recent_logs: logs.rows })
  })
)

// ────────────────────────────────────────────────────────────
//  POST /card/admin/subscriptions/:userId/extend — تمديد يدوي
// ────────────────────────────────────────────────────────────
router.post(
  "/card/admin/subscriptions/:userId/extend",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const { days, reason } = req.body
    const userId = req.params.userId

    const daysNum = parseInt(days, 10)
    if (!daysNum || daysNum < 1 || daysNum > 730) {
      throw new ApiError("عدد الأيام يجب أن يكون بين 1 و 730", 400)
    }

    const sub = await query(`SELECT * FROM card_subscriptions WHERE user_id = $1`, [userId])
    if (!sub.rows.length) {
      throw new ApiError("هذا المستخدم ليس لديه اشتراك. استخدم منح هدية بدلاً من ذلك", 404)
    }

    const current = sub.rows[0]
    const oldExpires = current.expires_at

    // إذا كان منتهي → نمدّد من تاريخ اليوم
    // إذا كان نشط → نمدّد من تاريخ الانتهاء الحالي
    const baseDate = isExpired(current.expires_at) ? new Date() : new Date(current.expires_at)
    const newExpires = addDays(baseDate, daysNum)

    await query(
      `UPDATE card_subscriptions
       SET expires_at = $1,
           status = 'active',
           updated_at = NOW()
       WHERE user_id = $2`,
      [newExpires, userId]
    )

    await logEvent({
      userId,
      action: "extended",
      daysAdded: daysNum,
      oldTier: current.tier,
      newTier: current.tier,
      oldExpiresAt: oldExpires,
      newExpiresAt: newExpires,
      reason: reason || `تمديد ${daysNum} يوم`,
      adminId: req.user.id,
    })

    notifyUser(userId, "subscription_extended", {
      days: daysNum,
      tier: current.tier,
      old_expires_at: oldExpires,
      new_expires_at: newExpires,
      reason: reason || null,
    }).catch(() => {})

    res.json({
      success: true,
      old_expires_at: oldExpires,
      new_expires_at: newExpires,
      days_added: daysNum,
    })
  })
)

// ────────────────────────────────────────────────────────────
//  POST /card/admin/subscriptions/:userId/cancel — إلغاء
// ────────────────────────────────────────────────────────────
router.post(
  "/card/admin/subscriptions/:userId/cancel",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const { reason } = req.body
    const userId = req.params.userId

    const sub = await query(`SELECT * FROM card_subscriptions WHERE user_id = $1`, [userId])
    if (!sub.rows.length) throw new ApiError("لا يوجد اشتراك", 404)

    await query(
      `UPDATE card_subscriptions
       SET status = 'cancelled', updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    )

    await logEvent({
      userId,
      action: "cancelled",
      oldTier: sub.rows[0].tier,
      reason: reason || "إلغاء يدوي من الأدمن",
      adminId: req.user.id,
    })

    notifyUser(userId, "subscription_cancelled", {
      tier: sub.rows[0].tier,
      reason: reason || null,
    }).catch(() => {})

    res.json({ success: true })
  })
)

// ────────────────────────────────────────────────────────────
//  POST /card/admin/subscriptions/:userId/change-tier — تغيير الفئة
// ────────────────────────────────────────────────────────────
router.post(
  "/card/admin/subscriptions/:userId/change-tier",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const { tier, reason } = req.body
    const userId = req.params.userId

    if (!isValidTier(tier) || tier === "free") {
      throw new ApiError("الفئة غير صالحة", 400)
    }

    const sub = await query(`SELECT * FROM card_subscriptions WHERE user_id = $1`, [userId])
    if (!sub.rows.length) throw new ApiError("لا يوجد اشتراك", 404)

    const oldTier = sub.rows[0].tier
    const isUpgrade = TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(oldTier)

    await query(
      `UPDATE card_subscriptions
       SET tier = $1, updated_at = NOW()
       WHERE user_id = $2`,
      [tier, userId]
    )

    await logEvent({
      userId,
      action: isUpgrade ? "upgraded" : "downgraded",
      oldTier,
      newTier: tier,
      reason: reason || `${isUpgrade ? "ترقية" : "تخفيض"} من ${oldTier} إلى ${tier}`,
      adminId: req.user.id,
    })

    notifyUser(userId, "tier_changed", {
      old_tier: oldTier,
      new_tier: tier,
      is_upgrade: isUpgrade,
      reason: reason || null,
    }).catch(() => {})

    res.json({ success: true, old_tier: oldTier, new_tier: tier })
  })
)

// ────────────────────────────────────────────────────────────
//  POST /card/admin/gift — منح اشتراك هدية
// ────────────────────────────────────────────────────────────
router.post(
  "/card/admin/gift",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const { user_id, tier, days, reason } = req.body

    if (!user_id || !/^\d{15,22}$/.test(user_id)) {
      throw new ApiError("user_id غير صالح", 400)
    }
    if (!isValidTier(tier) || tier === "free") {
      throw new ApiError("الفئة غير صالحة", 400)
    }

    const daysNum = parseInt(days, 10)
    if (!daysNum || daysNum < 1 || daysNum > 730) {
      throw new ApiError("عدد الأيام يجب أن يكون بين 1 و 730", 400)
    }

    // فحص لو عنده اشتراك بالفعل
    const existing = await getSubscription(user_id)

    let expiresAt
    let action

    if (existing && existing.status === "active" && !existing.is_expired) {
      // عنده اشتراك نشط → نمدّد
      expiresAt = addDays(new Date(existing.expires_at), daysNum)
      action = "extended"
    } else {
      // مالكوش اشتراك أو منتهي → نسوي جديد
      expiresAt = addDays(new Date(), daysNum)
      action = "gifted"
    }

    await query(
      `INSERT INTO card_subscriptions
        (user_id, tier, status, started_at, expires_at, is_gift, gifted_by, gift_reason)
       VALUES ($1, $2, 'active', NOW(), $3, TRUE, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         tier = $2,
         status = 'active',
         expires_at = $3,
         is_gift = TRUE,
         gifted_by = $4,
         gift_reason = $5,
         updated_at = NOW()`,
      [user_id, tier, expiresAt, req.user.id, reason || null]
    )

    await logEvent({
      userId: user_id,
      action,
      daysAdded: daysNum,
      oldTier: existing?.tier || null,
      newTier: tier,
      oldExpiresAt: existing?.expires_at || null,
      newExpiresAt: expiresAt,
      reason: reason || `هدية ${daysNum} يوم`,
      adminId: req.user.id,
      metadata: { is_gift: true },
    })

    notifyUser(user_id, "subscription_gifted", {
      tier,
      days: daysNum,
      expires_at: expiresAt,
      reason: reason || null,
    }).catch(() => {})

    res.json({
      success: true,
      user_id,
      tier,
      expires_at: expiresAt,
      days_added: daysNum,
    })
  })
)

// ────────────────────────────────────────────────────────────
//  GET /card/admin/logs — سجل كل الأحداث
// ────────────────────────────────────────────────────────────
router.get(
  "/card/admin/logs",
  requireAuth,
  requireOwner,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200)
    const offset = parseInt(req.query.offset, 10) || 0
    const action = req.query.action || null
    const userId = req.query.user_id || null

    let whereClauses = []
    const params = []
    let idx = 1

    if (action) {
      params.push(action)
      whereClauses.push(`action = $${idx++}`)
    }
    if (userId) {
      params.push(userId)
      whereClauses.push(`user_id = $${idx++}`)
    }

    const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : ""

    params.push(limit, offset)
    const r = await query(
      `SELECT * FROM card_subscription_logs
       ${whereSQL}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      params
    )

    res.json(r.rows)
  })
)

module.exports = router