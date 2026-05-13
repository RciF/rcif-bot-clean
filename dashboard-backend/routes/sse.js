/**
 * ═══════════════════════════════════════════════════════════
 *  SSE Routes
 *  المسار: dashboard-backend/routes/sse.js
 *
 *  GET /api/guild/:guildId/sse  → اتصال SSE (يبقى مفتوح)
 *  GET /api/sse/stats           → diagnostics (owner only)
 *
 *  الخطة المطلوبة: Diamond
 *
 *  ⚠️ ملاحظة: SSE يحتاج auth عبر query param بدل header
 *  لأن EventSource ما يدعم custom headers.
 *  نقبل ?token=xxx + نتحقق منه يدوياً.
 * ═══════════════════════════════════════════════════════════
 */

const express = require("express")
const jwt = require("jsonwebtoken")
const { asyncHandler, ApiError } = require("../middleware/error")
const { getGuildPlan } = require("../services/guildPlan")
const { hasAccess, PLAN_TIERS } = require("../plans")
const sseService = require("../services/sseService")
const env = require("../config/env")

const router = express.Router({ mergeParams: true })

// ════════════════════════════════════════════════════════════
//  GET /api/guild/:guildId/sse
//  اتصال SSE — يبقى مفتوح حتى يغلق المستخدم التاب
// ════════════════════════════════════════════════════════════

router.get(
  "/guild/:guildId/sse",
  asyncHandler(async (req, res) => {
    const { guildId } = req.params

    // ─── Auth via query param (EventSource ما يدعم headers) ───
    const token = req.query.token
    if (!token || typeof token !== "string") {
      return res.status(401).json({ error: "غير مصرح", code: "NO_TOKEN" })
    }

    let user
    try {
      user = jwt.verify(token, env.JWT_SECRET)
    } catch {
      return res.status(401).json({ error: "توكن غير صالح", code: "INVALID_TOKEN" })
    }

    if (!user?.id) {
      return res.status(401).json({ error: "توكن غير صالح", code: "INVALID_TOKEN" })
    }

    // ─── Plan check (Diamond للحفاظ على الالتزام التجاري) ───
    const guildPlan = await getGuildPlan(guildId)
    if (!hasAccess(guildPlan, PLAN_TIERS.DIAMOND)) {
      return res.status(403).json({
        error: "Real-time updates يحتاج خطة Diamond",
        code: "PLAN_REQUIRED",
        details: { currentPlan: guildPlan, requiredPlan: PLAN_TIERS.DIAMOND },
      })
    }

    // ─── اشترك الـ client ───
    sseService.subscribe(guildId, user.id, res, req)

    // ما نرسل res.end() — الاتصال يبقى مفتوح
  }),
)

// ════════════════════════════════════════════════════════════
//  GET /api/sse/stats — للـ diagnostics (Owner only)
// ════════════════════════════════════════════════════════════

router.get(
  "/sse/stats",
  asyncHandler(async (req, res) => {
    // Owner check
    const token = req.headers.authorization?.replace("Bearer ", "")
    if (!token) return res.status(401).json({ error: "غير مصرح" })

    let user
    try {
      user = jwt.verify(token, env.JWT_SECRET)
    } catch {
      return res.status(401).json({ error: "توكن غير صالح" })
    }

    const ownerIds = (env.OWNER_IDS || "").split(",").map((s) => s.trim()).filter(Boolean)
    if (!ownerIds.includes(user.id)) {
      return res.status(403).json({ error: "للمالك فقط" })
    }

    res.json(sseService.getStats())
  }),
)

module.exports = router