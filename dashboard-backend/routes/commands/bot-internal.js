/**
 * ═══════════════════════════════════════════════════════════
 *  Bot Internal Endpoints (Commands)
 *
 *  هذه الـ endpoints يستخدمها البوت فقط (محمية بـ x-bot-secret).
 *
 *  - GET  /bot/guild/:guildId/commands-config
 *      البوت يجيب كل إعدادات أوامر السيرفر (aliases + restrictions + defaults)
 *
 *  - POST /bot/guild/:guildId/track-usage
 *      البوت يسجل استخدام أمر (للـ leaderboard)
 *
 *  ⚠️ هذه الـ endpoints مو محمية بـ requireAuth (للمستخدمين)
 *     بل بـ x-bot-secret في الـ header
 * ═══════════════════════════════════════════════════════════
 */

const express = require("express")
const { asyncHandler, ApiError } = require("../../middleware/error")
const { query } = require("../../config/database")

const router = express.Router()

// ════════════════════════════════════════════════════════════
//  Middleware: requireBotSecret
// ════════════════════════════════════════════════════════════

function requireBotSecret(req, res, next) {
  const expected = process.env.BOT_SECRET
  const provided = req.headers["x-bot-secret"]

  if (!expected) {
    return res.status(503).json({ error: "BOT_SECRET not configured" })
  }

  if (!provided || provided !== expected) {
    return res.status(401).json({ error: "Invalid bot secret" })
  }

  next()
}

// ════════════════════════════════════════════════════════════
//  GET /bot/guild/:guildId/commands-config
//
//  البوت يستدعي هذا لما يحتاج إعدادات أوامر سيرفر معين.
//  يرجع object بهذا الشكل:
//
//  {
//    aliases: { "alias1": "command_name", ... },
//    legacy: {
//      "command_name": { custom_name, enabled }
//    },
//    restrictions: {
//      "command_name": { enabled_roles, disabled_roles, ... }
//    },
//    defaults: {
//      "command_name": { default_duration, delete_invocation, ... }
//    }
//  }
// ════════════════════════════════════════════════════════════

router.get(
  "/bot/guild/:guildId/commands-config",
  requireBotSecret,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params

    // ─── Aliases ───
    const aliasesRes = await query(
      `SELECT alias, command_name FROM guild_command_aliases WHERE guild_id = $1`,
      [guildId],
    )

    const aliases = {}
    for (const row of aliasesRes.rows) {
      aliases[row.alias] = row.command_name
    }

    // ─── Legacy settings (custom_name + enabled) ───
    const legacyRes = await query(
      `SELECT command_name, custom_name, enabled
       FROM guild_command_settings WHERE guild_id = $1`,
      [guildId],
    )

    const legacy = {}
    for (const row of legacyRes.rows) {
      legacy[row.command_name] = {
        custom_name: row.custom_name,
        enabled: row.enabled,
      }
    }

    // ─── Restrictions ───
    const restRes = await query(
      `SELECT command_name, restrictions
       FROM guild_command_restrictions WHERE guild_id = $1`,
      [guildId],
    )

    const restrictions = {}
    for (const row of restRes.rows) {
      restrictions[row.command_name] = row.restrictions || {}
    }

    // ─── Defaults ───
    const defRes = await query(
      `SELECT command_name, defaults
       FROM guild_command_defaults WHERE guild_id = $1`,
      [guildId],
    )

    const defaults = {}
    for (const row of defRes.rows) {
      defaults[row.command_name] = row.defaults || {}
    }

    res.json({
      guild_id: guildId,
      aliases,
      legacy,
      restrictions,
      defaults,
      fetched_at: Date.now(),
    })
  }),
)

// ════════════════════════════════════════════════════════════
//  POST /bot/guild/:guildId/track-usage
//
//  Body: { command_name: "..." }
//
//  البوت يستدعي هذا بعد تنفيذ كل أمر ناجح
// ════════════════════════════════════════════════════════════

router.post(
  "/bot/guild/:guildId/track-usage",
  requireBotSecret,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params
    const { command_name } = req.body

    if (!command_name || typeof command_name !== "string") {
      throw new ApiError("command_name مطلوب", 400)
    }

    await query(
      `INSERT INTO command_usage_stats (guild_id, command_name, usage_count, last_used_at)
       VALUES ($1, $2, 1, NOW())
       ON CONFLICT (guild_id, command_name)
       DO UPDATE SET
         usage_count = command_usage_stats.usage_count + 1,
         last_used_at = NOW()`,
      [guildId, command_name],
    )

    res.json({ success: true })
  }),
)

module.exports = router