/**
 * ═══════════════════════════════════════════════════════════
 *  Commands Aliases CRUD
 *
 *  Endpoints:
 *  - GET    /:commandName/aliases          — قائمة aliases الأمر
 *  - POST   /:commandName/aliases          — إضافة alias
 *  - DELETE /:commandName/aliases/:alias   — حذف alias محدد
 *  - PUT    /:commandName/aliases          — استبدال كامل (bulk)
 *
 *  جميع الـ endpoints تحت: /api/guild/:guildId/commands/:commandName/aliases
 * ═══════════════════════════════════════════════════════════
 */

const express = require("express")
const { asyncHandler, ApiError } = require("../../middleware/error")
const { requireAuth, requireGuildAdmin } = require("../../middleware/auth")
const { auditLog } = require("../../middleware/audit")
const { query, transaction } = require("../../config/database")
const { invalidateGuildCommands } = require("../../services/commandsCache")
const {
  MAX_ALIASES_PER_COMMAND,
  isValidCommandName,
  validateAlias,
  normalizeAlias,
} = require("./_shared")

const router = express.Router({ mergeParams: true })

// ════════════════════════════════════════════════════════════
//  GET /:commandName/aliases
//  قائمة aliases الأمر
// ════════════════════════════════════════════════════════════

router.get(
  "/:commandName/aliases",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const { guildId, commandName } = req.params

    if (!isValidCommandName(commandName)) {
      throw new ApiError("الأمر غير موجود", 404)
    }

    const r = await query(
      `SELECT alias, created_at
       FROM guild_command_aliases
       WHERE guild_id = $1 AND command_name = $2
       ORDER BY created_at ASC`,
      [guildId, commandName],
    )

    res.json({
      command_name: commandName,
      aliases: r.rows.map((row) => row.alias),
      count: r.rows.length,
      max: MAX_ALIASES_PER_COMMAND,
    })
  }),
)

// ════════════════════════════════════════════════════════════
//  POST /:commandName/aliases
//  إضافة alias جديد
//
//  Body: { alias: "..." }
// ════════════════════════════════════════════════════════════

router.post(
  "/:commandName/aliases",
  requireAuth,
  requireGuildAdmin,
  auditLog("command.alias.add"),
  asyncHandler(async (req, res) => {
    const { guildId, commandName } = req.params
    const { alias } = req.body

    if (!isValidCommandName(commandName)) {
      throw new ApiError("الأمر غير موجود", 404)
    }

    // ─── Validation ───
    const validationError = validateAlias(alias)
    if (validationError) {
      throw new ApiError(validationError, 400, "INVALID_ALIAS")
    }

    const normalized = normalizeAlias(alias)

    // ─── تحقق إن الـ alias مو هو نفس اسم الأمر ───
    if (normalized === commandName) {
      throw new ApiError(
        "ما تقدر تستخدم اسم الأمر نفسه كـ alias",
        400,
        "ALIAS_EQUALS_COMMAND",
      )
    }

    // ─── تحقق من الحد الأقصى + التكرار ───
    const result = await transaction(async (client) => {
      // 1) عدد الـ aliases الحالية
      const countRes = await client.query(
        `SELECT COUNT(*) AS cnt FROM guild_command_aliases
         WHERE guild_id = $1 AND command_name = $2`,
        [guildId, commandName],
      )

      const currentCount = parseInt(countRes.rows[0].cnt, 10) || 0

      if (currentCount >= MAX_ALIASES_PER_COMMAND) {
        throw new ApiError(
          `وصلت للحد الأقصى (${MAX_ALIASES_PER_COMMAND} aliases). احذف واحد عشان تضيف جديد.`,
          400,
          "MAX_ALIASES_REACHED",
        )
      }

      // 2) تحقق إن الـ alias ما هو مستخدم لأي أمر آخر في نفس السيرفر
      const existingRes = await client.query(
        `SELECT command_name FROM guild_command_aliases
         WHERE guild_id = $1 AND alias = $2`,
        [guildId, normalized],
      )

      if (existingRes.rows.length > 0) {
        const existingCmd = existingRes.rows[0].command_name
        if (existingCmd === commandName) {
          throw new ApiError(
            `الـ alias "${normalized}" مضاف بالفعل لهذا الأمر`,
            400,
            "ALIAS_DUPLICATE",
          )
        }
        throw new ApiError(
          `الـ alias "${normalized}" مستخدم لأمر آخر (/${existingCmd})`,
          400,
          "ALIAS_USED_BY_OTHER",
        )
      }

      // 3) إضافة
      await client.query(
        `INSERT INTO guild_command_aliases (guild_id, alias, command_name)
         VALUES ($1, $2, $3)`,
        [guildId, normalized, commandName],
      )

      return { added: normalized, total: currentCount + 1 }
    })

    // ─── إخبار البوت ───
    invalidateGuildCommands(guildId).catch(() => {})

    res.json({
      success: true,
      ...result,
    })
  }),
)

// ════════════════════════════════════════════════════════════
//  DELETE /:commandName/aliases/:alias
//  حذف alias محدد
// ════════════════════════════════════════════════════════════

router.delete(
  "/:commandName/aliases/:alias",
  requireAuth,
  requireGuildAdmin,
  auditLog("command.alias.remove"),
  asyncHandler(async (req, res) => {
    const { guildId, commandName, alias } = req.params

    if (!isValidCommandName(commandName)) {
      throw new ApiError("الأمر غير موجود", 404)
    }

    // ⚠️ نفك الـ URL encoding (لو الـ alias فيه أحرف خاصة)
    const decodedAlias = decodeURIComponent(alias)

    const r = await query(
      `DELETE FROM guild_command_aliases
       WHERE guild_id = $1 AND command_name = $2 AND alias = $3
       RETURNING alias`,
      [guildId, commandName, decodedAlias],
    )

    if (r.rows.length === 0) {
      throw new ApiError("الـ alias غير موجود", 404)
    }

    invalidateGuildCommands(guildId).catch(() => {})

    res.json({
      success: true,
      removed: decodedAlias,
    })
  }),
)

// ════════════════════════════════════════════════════════════
//  PUT /:commandName/aliases
//  استبدال كل الـ aliases بقائمة جديدة (bulk replace)
//
//  Body: { aliases: ["alias1", "alias2", ...] }
//
//  مفيد لما الواجهة تعدّل القائمة كاملة وتبعث الجديد
// ════════════════════════════════════════════════════════════

router.put(
  "/:commandName/aliases",
  requireAuth,
  requireGuildAdmin,
  auditLog("command.alias.replace"),
  asyncHandler(async (req, res) => {
    const { guildId, commandName } = req.params
    const { aliases } = req.body

    if (!isValidCommandName(commandName)) {
      throw new ApiError("الأمر غير موجود", 404)
    }

    if (!Array.isArray(aliases)) {
      throw new ApiError("aliases لازم تكون مصفوفة", 400)
    }

    if (aliases.length > MAX_ALIASES_PER_COMMAND) {
      throw new ApiError(
        `الحد الأقصى ${MAX_ALIASES_PER_COMMAND} aliases`,
        400,
        "MAX_ALIASES_REACHED",
      )
    }

    // ─── Validate كل alias ───
    const normalized = []
    const seen = new Set()

    for (const alias of aliases) {
      const error = validateAlias(alias)
      if (error) {
        throw new ApiError(`${error}: "${alias}"`, 400, "INVALID_ALIAS")
      }

      const norm = normalizeAlias(alias)

      if (norm === commandName) {
        throw new ApiError(
          `ما تقدر تستخدم "${commandName}" كـ alias لنفسه`,
          400,
        )
      }

      if (seen.has(norm)) {
        throw new ApiError(`alias مكرر: "${norm}"`, 400, "DUPLICATE_ALIAS")
      }
      seen.add(norm)
      normalized.push(norm)
    }

    // ─── تحقق ما فيه تعارض مع أوامر أخرى ───
    if (normalized.length > 0) {
      const conflictRes = await query(
        `SELECT alias, command_name FROM guild_command_aliases
         WHERE guild_id = $1
           AND alias = ANY($2::text[])
           AND command_name <> $3`,
        [guildId, normalized, commandName],
      )

      if (conflictRes.rows.length > 0) {
        const conflict = conflictRes.rows[0]
        throw new ApiError(
          `الـ alias "${conflict.alias}" مستخدم لأمر آخر (/${conflict.command_name})`,
          400,
          "ALIAS_USED_BY_OTHER",
        )
      }
    }

    // ─── Replace في transaction ───
    await transaction(async (client) => {
      // 1) احذف القديم
      await client.query(
        `DELETE FROM guild_command_aliases
         WHERE guild_id = $1 AND command_name = $2`,
        [guildId, commandName],
      )

      // 2) أضف الجديد
      for (const alias of normalized) {
        await client.query(
          `INSERT INTO guild_command_aliases (guild_id, alias, command_name)
           VALUES ($1, $2, $3)`,
          [guildId, alias, commandName],
        )
      }
    })

    invalidateGuildCommands(guildId).catch(() => {})

    res.json({
      success: true,
      aliases: normalized,
      count: normalized.length,
    })
  }),
)

module.exports = router