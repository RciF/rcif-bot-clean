/**
 * ═══════════════════════════════════════════════════════════
 *  GET/PUT /api/guild/:guildId/commands/:commandName/restrictions
 *
 *  ⚠️ ملاحظة: هذا الملف يحتوي على البنية الأساسية فقط.
 *  المنطق الكامل (تحقق الصلاحيات، تطبيق على البوت) في الباتش 6.
 *
 *  الحالي: GET/PUT بسيط للقراءة والكتابة في DB
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
//  GET /:commandName/restrictions
// ════════════════════════════════════════════════════════════

router.get(
  "/:commandName/restrictions",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const { guildId, commandName } = req.params

    if (!isValidCommandName(commandName)) {
      throw new ApiError("الأمر غير موجود", 404)
    }

    const r = await query(
      `SELECT restrictions FROM guild_command_restrictions
       WHERE guild_id = $1 AND command_name = $2`,
      [guildId, commandName],
    )

    const restrictions = r.rows[0]?.restrictions || {}

    res.json({
      command_name: commandName,
      restrictions: {
        enabled_roles: restrictions.enabled_roles || [],
        disabled_roles: restrictions.disabled_roles || [],
        enabled_channels: restrictions.enabled_channels || [],
        disabled_channels: restrictions.disabled_channels || [],
      },
    })
  }),
)

// ════════════════════════════════════════════════════════════
//  PUT /:commandName/restrictions
//
//  Body:
//  {
//    enabled_roles?:    string[],
//    disabled_roles?:   string[],
//    enabled_channels?: string[],
//    disabled_channels?:string[]
//  }
// ════════════════════════════════════════════════════════════

router.put(
  "/:commandName/restrictions",
  requireAuth,
  requireGuildAdmin,
  auditLog("command.restrictions.update"),
  asyncHandler(async (req, res) => {
    const { guildId, commandName } = req.params

    if (!isValidCommandName(commandName)) {
      throw new ApiError("الأمر غير موجود", 404)
    }

    const {
      enabled_roles = [],
      disabled_roles = [],
      enabled_channels = [],
      disabled_channels = [],
    } = req.body || {}

    // ─── Validation ───
    for (const arr of [
      enabled_roles,
      disabled_roles,
      enabled_channels,
      disabled_channels,
    ]) {
      if (!Array.isArray(arr)) {
        throw new ApiError("القيم لازم تكون مصفوفات", 400)
      }
      // Discord IDs = أرقام فقط
      for (const id of arr) {
        if (typeof id !== "string" || !/^\d{15,22}$/.test(id)) {
          throw new ApiError(`ID غير صالح: ${id}`, 400, "INVALID_ID")
        }
      }
    }

    const restrictions = {
      enabled_roles,
      disabled_roles,
      enabled_channels,
      disabled_channels,
    }

    await query(
      `INSERT INTO guild_command_restrictions
         (guild_id, command_name, restrictions, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (guild_id, command_name)
       DO UPDATE SET
         restrictions = EXCLUDED.restrictions,
         updated_at = NOW()`,
      [guildId, commandName, JSON.stringify(restrictions)],
    )

    invalidateGuildCommands(guildId).catch(() => {})

    res.json({
      success: true,
      command_name: commandName,
      restrictions,
    })
  }),
)

module.exports = router