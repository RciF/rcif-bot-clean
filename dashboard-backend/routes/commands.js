/**
 * ═══════════════════════════════════════════════════════════
 *  Commands & Prefix Routes
 *  /api/guild/:guildId/commands
 *  /api/guild/:guildId/prefix
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
//  GET /api/guild/:guildId/commands
//  قائمة الأوامر مع الإعدادات المخصصة
// ════════════════════════════════════════════════════════════

router.get(
  "/commands",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params
    const guildPlan = await getGuildPlan(guildId)

    // جلب الإعدادات المخصصة
    const r = await query(
      `SELECT command_name, custom_name, enabled FROM guild_command_settings WHERE guild_id = $1`,
      [guildId],
    )

    const customMap = {}
    for (const row of r.rows) {
      customMap[row.command_name] = {
        custom_name: row.custom_name,
        enabled: row.enabled,
      }
    }

    // قائمة الأوامر الكاملة (يجب أن تأتي من helpSystem.js لاحقاً)
    // حالياً نرجع map الإعدادات فقط، الفرونت يدمجه مع قائمة الأوامر
    res.json({
      guild_plan: guildPlan,
      custom_settings: customMap,
    })
  }),
)

// ════════════════════════════════════════════════════════════
//  PATCH /api/guild/:guildId/commands/:commandName
// ════════════════════════════════════════════════════════════

router.patch(
  "/commands/:commandName",
  requireAuth,
  requireGuildAdmin,
  auditLog("command.update"),
  asyncHandler(async (req, res) => {
    const { guildId, commandName } = req.params
    const { custom_name, enabled } = req.body

    // تحقق إن لديه خطة Silver لتغيير الاسم
    if (custom_name !== undefined) {
      const guildPlan = await getGuildPlan(guildId)
      if (!hasAccess(guildPlan, PLAN_TIERS.SILVER)) {
        throw new ApiError(
          "تغيير الأسماء يحتاج خطة Silver أو أعلى",
          403,
          "PLAN_REQUIRED",
        )
      }
    }

    const finalName =
      custom_name === ""
        ? null
        : custom_name?.trim()
          ? custom_name.trim()
          : null

    await query(
      `INSERT INTO guild_command_settings (guild_id, command_name, custom_name, enabled, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (guild_id, command_name) DO UPDATE SET
         custom_name = CASE WHEN $3::TEXT IS NOT NULL THEN $3 ELSE guild_command_settings.custom_name END,
         enabled = CASE WHEN $4::BOOLEAN IS NOT NULL THEN $4 ELSE guild_command_settings.enabled END,
         updated_at = NOW()`,
      [guildId, commandName, finalName, enabled !== undefined ? Boolean(enabled) : null],
    )

    res.json({ success: true })
  }),
)

// ════════════════════════════════════════════════════════════
//  DELETE /api/guild/:guildId/commands/reset
// ════════════════════════════════════════════════════════════

router.delete(
  "/commands/reset",
  requireAuth,
  requireGuildAdmin,
  auditLog("commands.reset_all"),
  asyncHandler(async (req, res) => {
    await query(
      `DELETE FROM guild_command_settings WHERE guild_id = $1`,
      [req.params.guildId],
    )
    res.json({ success: true, message: "تم إعادة كل الأوامر للافتراضي" })
  }),
)

// ════════════════════════════════════════════════════════════
//  GET / POST /api/guild/:guildId/prefix
// ════════════════════════════════════════════════════════════

router.get(
  "/prefix",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const r = await query(
      `SELECT prefix FROM guild_prefix_settings WHERE guild_id = $1`,
      [req.params.guildId],
    )
    res.json({ prefix: r.rows[0]?.prefix || "!" })
  }),
)

router.post(
  "/prefix",
  requireAuth,
  requireGuildAdmin,
  auditLog("prefix.update"),
  asyncHandler(async (req, res) => {
    const { prefix } = req.body
    if (!prefix || typeof prefix !== "string") {
      throw new ApiError("البريفكس مطلوب", 400)
    }

    const trimmed = prefix.trim()
    if (trimmed.length === 0 || trimmed.length > 5) {
      throw new ApiError("البريفكس 1-5 أحرف فقط", 400)
    }

    // تحقق من الخطة
    const guildPlan = await getGuildPlan(req.params.guildId)
    if (!hasAccess(guildPlan, PLAN_TIERS.SILVER)) {
      throw new ApiError(
        "البريفكس المخصص يحتاج خطة Silver أو أعلى",
        403,
        "PLAN_REQUIRED",
      )
    }

    await query(
      `INSERT INTO guild_prefix_settings (guild_id, prefix, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (guild_id) DO UPDATE SET prefix = $2, updated_at = NOW()`,
      [req.params.guildId, trimmed],
    )

    res.json({ success: true, prefix: trimmed })
  }),
)

module.exports = router
