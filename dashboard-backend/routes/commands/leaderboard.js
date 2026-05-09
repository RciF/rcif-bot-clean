/**
 * ═══════════════════════════════════════════════════════════
 *  GET /api/guild/:guildId/commands/leaderboard
 *
 *  أكثر الأوامر استخداماً في السيرفر (Top N)
 *
 *  Query params:
 *  - limit: عدد الأوامر (default 10, max 50)
 * ═══════════════════════════════════════════════════════════
 */

const express = require("express")
const { asyncHandler } = require("../../middleware/error")
const { requireAuth, requireGuildAdmin } = require("../../middleware/auth")
const { query } = require("../../config/database")
const { COMMANDS_REGISTRY } = require("../../data/commandsRegistry")

const router = express.Router({ mergeParams: true })

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 50

// ════════════════════════════════════════════════════════════
//  GET /leaderboard
// ════════════════════════════════════════════════════════════

router.get(
  "/leaderboard",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params

    let limit = parseInt(req.query.limit, 10)
    if (isNaN(limit) || limit <= 0) limit = DEFAULT_LIMIT
    if (limit > MAX_LIMIT) limit = MAX_LIMIT

    const r = await query(
      `SELECT command_name, usage_count, last_used_at
       FROM command_usage_stats
       WHERE guild_id = $1
       ORDER BY usage_count DESC, last_used_at DESC
       LIMIT $2`,
      [guildId, limit],
    )

    // إثراء بيانات الـ registry لكل أمر
    const leaderboard = r.rows.map((row, idx) => {
      const meta = COMMANDS_REGISTRY.find((c) => c.name === row.command_name) || null

      return {
        rank: idx + 1,
        command_name: row.command_name,
        usage_count: parseInt(row.usage_count, 10) || 0,
        last_used_at: row.last_used_at,
        // metadata من الـ registry (لو موجود)
        category: meta?.category || null,
        description: meta?.description || null,
        emoji: meta?.emoji || null,
      }
    })

    // إجمالي الاستخدام في السيرفر
    const totalRes = await query(
      `SELECT COALESCE(SUM(usage_count), 0) AS total
       FROM command_usage_stats
       WHERE guild_id = $1`,
      [guildId],
    )

    res.json({
      total_commands_used: parseInt(totalRes.rows[0]?.total, 10) || 0,
      leaderboard,
      count: leaderboard.length,
      limit,
    })
  }),
)

module.exports = router