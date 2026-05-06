/**
 * ═══════════════════════════════════════════════════════════
 *  AI Usage Routes
 *  /api/guild/:guildId/ai/usage
 * ═══════════════════════════════════════════════════════════
 */

const express = require("express")
const { asyncHandler } = require("../middleware/error")
const { requireAuth, requireGuildAdmin } = require("../middleware/auth")
const { query } = require("../config/database")

const router = express.Router({ mergeParams: true })

// ════════════════════════════════════════════════════════════
//  GET /ai/usage
//  إحصائيات استخدام AI الفعلية من ai_usage_log
// ════════════════════════════════════════════════════════════

router.get(
  "/ai/usage",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params

    // جلب الحد اليومي من ai_settings
    const settingsRow = await query(
      `SELECT messages_per_day FROM ai_settings WHERE guild_id = $1`,
      [guildId],
    ).catch(() => ({ rows: [] }))

    const limit = settingsRow.rows[0]?.messages_per_day || 50

    // الاستخدام اليوم
    const todayRow = await query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(tokens_used), 0)::int AS tokens
       FROM ai_usage_log
       WHERE guild_id = $1 AND created_at >= CURRENT_DATE`,
      [guildId],
    ).catch(() => ({ rows: [{ count: 0, tokens: 0 }] }))

    // آخر 7 أيام (يومي)
    const dailyRow = await query(
      `SELECT
         DATE(created_at) AS date,
         COUNT(*)::int AS count,
         COALESCE(SUM(tokens_used), 0)::int AS tokens
       FROM ai_usage_log
       WHERE guild_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [guildId],
    ).catch(() => ({ rows: [] }))

    // أكثر مستخدمين هذا اليوم
    const topUsersRow = await query(
      `SELECT user_id, COUNT(*)::int AS count
       FROM ai_usage_log
       WHERE guild_id = $1 AND created_at >= CURRENT_DATE
       GROUP BY user_id
       ORDER BY count DESC
       LIMIT 5`,
      [guildId],
    ).catch(() => ({ rows: [] }))

    const usedToday = todayRow.rows[0]?.count || 0
    const tokensToday = todayRow.rows[0]?.tokens || 0

    res.json({
      today: {
        count: usedToday,
        tokens: tokensToday,
        limit,
        remaining: Math.max(0, limit - usedToday),
        percentage: limit > 0 ? Math.round((usedToday / limit) * 100) : 0,
      },
      weekly: dailyRow.rows,
      topUsers: topUsersRow.rows,
    })
  }),
)

module.exports = router