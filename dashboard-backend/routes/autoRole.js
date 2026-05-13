/**
 * ═══════════════════════════════════════════════════════════
 *  Auto-Role Routes
 *  /api/guild/:guildId/auto-role
 *
 *  GET    /  → جلب الإعدادات + قائمة الرتب
 *  PUT    /  → حفظ الإعدادات + استبدال قائمة الرتب
 *
 *  الخطة المطلوبة: Silver أو أعلى
 *  (نفس Welcome — ميزة "كل سيرفر يبيها")
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
//  Plan gate helper
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
//  GET /auto-role
// ════════════════════════════════════════════════════════════

router.get(
  "/auto-role",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params

    // إعدادات
    const settingsResult = await query(
      "SELECT * FROM auto_role_settings WHERE guild_id = $1",
      [guildId],
    )
    const settings = settingsResult.rows[0] || {}

    // assignments
    const assignmentsResult = await query(
      `SELECT role_id, type
       FROM auto_role_assignments
       WHERE guild_id = $1
       ORDER BY id ASC`,
      [guildId],
    )

    res.json({
      enabled: settings.enabled === true,
      delay_seconds: parseInt(settings.delay_seconds) || 0,
      require_verified: settings.require_verified === true,
      assignments: assignmentsResult.rows || [],
    })
  }),
)

// ════════════════════════════════════════════════════════════
//  PUT /auto-role
// ════════════════════════════════════════════════════════════

router.put(
  "/auto-role",
  requireAuth,
  requireGuildAdmin,
  requirePlan(PLAN_TIERS.SILVER),
  auditLog("auto_role.update"),
  asyncHandler(async (req, res) => {
    const { guildId } = req.params
    const { enabled, delay_seconds, require_verified, assignments } = req.body

    // ─── Validate ───
    const enabledVal = enabled === true
    const delayVal = Math.max(0, Math.min(parseInt(delay_seconds) || 0, 300))
    const verifiedVal = require_verified === true

    // فلترة assignments: only role_id strings + type صحيح
    const validTypes = new Set(["human", "bot", "both"])
    const cleanAssignments = Array.isArray(assignments)
      ? assignments
          .filter((a) => a && typeof a.role_id === "string" && /^\d+$/.test(a.role_id))
          .map((a) => ({
            role_id: a.role_id,
            type: validTypes.has(a.type) ? a.type : "human",
          }))
          .slice(0, 25) // حد أقصى 25 رتبة (تجنب الـ rate limits)
      : []

    // ─── Transaction ───
    await transaction(async (client) => {
      // إعدادات
      await client.query(
        `INSERT INTO auto_role_settings (guild_id, enabled, delay_seconds, require_verified, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (guild_id) DO UPDATE SET
           enabled = EXCLUDED.enabled,
           delay_seconds = EXCLUDED.delay_seconds,
           require_verified = EXCLUDED.require_verified,
           updated_at = NOW()`,
        [guildId, enabledVal, delayVal, verifiedVal],
      )

      // استبدال كامل لقائمة assignments
      await client.query(
        "DELETE FROM auto_role_assignments WHERE guild_id = $1",
        [guildId],
      )

      for (const a of cleanAssignments) {
        await client.query(
          `INSERT INTO auto_role_assignments (guild_id, role_id, type)
           VALUES ($1, $2, $3)
           ON CONFLICT (guild_id, role_id, type) DO NOTHING`,
          [guildId, a.role_id, a.type],
        )
      }
    })

    res.json({ success: true })
  }),
)

module.exports = router