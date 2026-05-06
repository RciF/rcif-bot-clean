/**
 * ═══════════════════════════════════════════════════════════
 *  Stats Routes
 *  /api/guild/:guildId/stats/*
 *
 *  - GET /stats/historical?days=7   لقطات يومية + نمو
 *  - GET /stats/activity?days=30    نشاط الإدارة من audit log
 *  - GET /stats/summary             ملخص شامل (members + tickets + economy)
 * ═══════════════════════════════════════════════════════════
 */

const express = require("express")
const { asyncHandler, ApiError } = require("../middleware/error")
const { requireAuth, requireGuildAdmin } = require("../middleware/auth")
const { query } = require("../config/database")
const { getGuildPlan } = require("../services/guildPlan")
const { hasAccess, PLAN_TIERS } = require("../plans")
const discord = require("../utils/discord")

const router = express.Router({ mergeParams: true })

// ── Helper: تحقق من خطة Silver+ ──
async function ensureStatsPlan(guildId) {
  const guildPlan = await getGuildPlan(guildId)
  if (!hasAccess(guildPlan, PLAN_TIERS.SILVER)) {
    throw new ApiError(
      "الإحصائيات المتقدمة تحتاج خطة Silver أو أعلى",
      403,
      "PLAN_REQUIRED",
    )
  }
}

// ════════════════════════════════════════════════════════════
//  GET /stats/historical?days=7
//  بيانات stats_snapshots (يكتبها بوت Lyn يومياً)
// ════════════════════════════════════════════════════════════

router.get(
  "/stats/historical",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params
    await ensureStatsPlan(guildId)
    const days = Math.min(parseInt(req.query.days) || 7, 90)

    const r = await query(
      `SELECT
         date,
         member_count,
         joined_today,
         left_today,
         online_peak,
         online_peak_hour
       FROM stats_snapshots
       WHERE guild_id = $1
         AND date >= CURRENT_DATE - ($2::int || ' days')::interval
       ORDER BY date ASC`,
      [guildId, days],
    ).catch(() => ({ rows: [] }))

    res.json({
      days,
      snapshots: r.rows,
      hasData: r.rows.length > 0,
    })
  }),
)

// ════════════════════════════════════════════════════════════
//  GET /stats/activity?days=30
//  نشاط الإدارة من dashboard_audit_log (مجمّع باليوم)
// ════════════════════════════════════════════════════════════

router.get(
  "/stats/activity",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params
    await ensureStatsPlan(guildId)
    const days = Math.min(parseInt(req.query.days) || 30, 90)

    const r = await query(
      `SELECT
         DATE(created_at) AS date,
         COUNT(*)::int AS count
       FROM dashboard_audit_log
       WHERE guild_id = $1
         AND created_at >= NOW() - ($2::int || ' days')::interval
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [guildId, days],
    ).catch(() => ({ rows: [] }))

    // أكثر الإجراءات
    const topActions = await query(
      `SELECT action, COUNT(*)::int AS count
       FROM dashboard_audit_log
       WHERE guild_id = $1
         AND created_at >= NOW() - ($2::int || ' days')::interval
       GROUP BY action
       ORDER BY count DESC
       LIMIT 5`,
      [guildId, days],
    ).catch(() => ({ rows: [] }))

    res.json({
      days,
      daily: r.rows,
      topActions: topActions.rows,
    })
  }),
)

// ════════════════════════════════════════════════════════════
//  GET /stats/summary
//  ملخص شامل: discord info + tickets + warnings + economy users
// ════════════════════════════════════════════════════════════

router.get(
  "/stats/summary",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params
    await ensureStatsPlan(guildId)

    const [guild, ticketStats, warningCount, lastSnapshot, peakHourRow] = await Promise.all([
      discord.fetchGuild(guildId).catch(() => null),
      query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'open')::int AS open,
           COUNT(*) FILTER (WHERE status = 'closed')::int AS closed,
           COUNT(*)::int AS total
         FROM tickets WHERE guild_id = $1`,
        [guildId],
      ).catch(() => ({ rows: [{ open: 0, closed: 0, total: 0 }] })),
      query(
        `SELECT COUNT(DISTINCT user_id)::int AS count
         FROM warnings WHERE guild_id = $1`,
        [guildId],
      ).catch(() => ({ rows: [{ count: 0 }] })),
      query(
        `SELECT date, member_count, joined_today, left_today, online_peak
         FROM stats_snapshots
         WHERE guild_id = $1
         ORDER BY date DESC LIMIT 1`,
        [guildId],
      ).catch(() => ({ rows: [] })),
      query(
        `SELECT hour, avg_online
         FROM stats_hourly
         WHERE guild_id = $1
         ORDER BY avg_online DESC LIMIT 1`,
        [guildId],
      ).catch(() => ({ rows: [] })),
    ])

    res.json({
      members: {
        total: guild?.approximate_member_count || 0,
        online: guild?.approximate_presence_count || 0,
      },
      boosts: {
        count: guild?.premium_subscription_count || 0,
        tier: guild?.premium_tier || 0,
      },
      tickets: ticketStats.rows[0] || { open: 0, closed: 0, total: 0 },
      warnings: {
        users: warningCount.rows[0]?.count || 0,
      },
      lastSnapshot: lastSnapshot.rows[0] || null,
      peakHour: peakHourRow.rows[0] || null,
    })
  }),
)

module.exports = router