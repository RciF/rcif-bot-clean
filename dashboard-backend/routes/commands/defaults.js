/**
 * ═══════════════════════════════════════════════════════════
 *  GET/PUT /api/guild/:guildId/commands/:commandName/defaults
 *
 *  الإعدادات الافتراضية لكل أمر:
 *  - default_duration:        الوقت الافتراضي للـ mute/ban (مثل "24h")
 *  - delete_invocation:       حذف رسالة الأمر بعد التنفيذ
 *  - delete_response:         حذف رد البوت بعد X ثواني
 *  - delete_response_after:   عدد الثواني للحذف
 *  - delete_on_user_delete:   حذف رد البوت إذا حذف العضو رسالته
 *
 *  ⚠️ المنطق الكامل (تطبيق على البوت) في الباتش 7-8
 * ═══════════════════════════════════════════════════════════
 */

const express = require("express")
const { asyncHandler, ApiError } = require("../../middleware/error")
const { requireAuth, requireGuildAdmin } = require("../../middleware/auth")
const { auditLog } = require("../../middleware/audit")
const { query } = require("../../config/database")
const { invalidateGuildCommands } = require("../../services/commandsCache")
const { isValidCommandName } = require("./_shared")

const router = express.Router({ mergeParams: true })

// ════════════════════════════════════════════════════════════
//  Validation helpers
// ════════════════════════════════════════════════════════════

/**
 * يتحقق من صيغة الوقت: "30s", "5m", "2h", "7d"
 */
function isValidDuration(duration) {
  if (duration === null || duration === undefined || duration === "") return true
  if (typeof duration !== "string") return false
  return /^\d+[smhdwSMHDW]$/.test(duration)
}

// ════════════════════════════════════════════════════════════
//  GET /:commandName/defaults
// ════════════════════════════════════════════════════════════

router.get(
  "/:commandName/defaults",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const { guildId, commandName } = req.params

    if (!isValidCommandName(commandName)) {
      throw new ApiError("الأمر غير موجود", 404)
    }

    const r = await query(
      `SELECT defaults FROM guild_command_defaults
       WHERE guild_id = $1 AND command_name = $2`,
      [guildId, commandName],
    )

    const defaults = r.rows[0]?.defaults || {}

    res.json({
      command_name: commandName,
      defaults: {
        default_duration: defaults.default_duration || null,
        delete_invocation: defaults.delete_invocation || false,
        delete_response: defaults.delete_response || false,
        delete_response_after: defaults.delete_response_after || 5,
        delete_on_user_delete: defaults.delete_on_user_delete || false,
      },
    })
  }),
)

// ════════════════════════════════════════════════════════════
//  PUT /:commandName/defaults
// ════════════════════════════════════════════════════════════

router.put(
  "/:commandName/defaults",
  requireAuth,
  requireGuildAdmin,
  auditLog("command.defaults.update"),
  asyncHandler(async (req, res) => {
    const { guildId, commandName } = req.params

    if (!isValidCommandName(commandName)) {
      throw new ApiError("الأمر غير موجود", 404)
    }

    const {
      default_duration = null,
      delete_invocation = false,
      delete_response = false,
      delete_response_after = 5,
      delete_on_user_delete = false,
    } = req.body || {}

    // ─── Validation ───
    if (!isValidDuration(default_duration)) {
      throw new ApiError(
        "صيغة الوقت غير صحيحة (مثال: 30s, 5m, 2h, 7d)",
        400,
        "INVALID_DURATION",
      )
    }

    if (typeof delete_invocation !== "boolean") {
      throw new ApiError("delete_invocation لازم يكون boolean", 400)
    }

    if (typeof delete_response !== "boolean") {
      throw new ApiError("delete_response لازم يكون boolean", 400)
    }

    if (typeof delete_on_user_delete !== "boolean") {
      throw new ApiError("delete_on_user_delete لازم يكون boolean", 400)
    }

    const after = parseInt(delete_response_after, 10)
    if (isNaN(after) || after < 1 || after > 60) {
      throw new ApiError(
        "delete_response_after لازم يكون بين 1 و 60 ثانية",
        400,
        "INVALID_DELETE_AFTER",
      )
    }

    const defaults = {
      default_duration,
      delete_invocation,
      delete_response,
      delete_response_after: after,
      delete_on_user_delete,
    }

    await query(
      `INSERT INTO guild_command_defaults
         (guild_id, command_name, defaults, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (guild_id, command_name)
       DO UPDATE SET
         defaults = EXCLUDED.defaults,
         updated_at = NOW()`,
      [guildId, commandName, JSON.stringify(defaults)],
    )

    invalidateGuildCommands(guildId).catch(() => {})

    res.json({
      success: true,
      command_name: commandName,
      defaults,
    })
  }),
)

module.exports = router