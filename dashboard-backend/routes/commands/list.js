/**
 * ═══════════════════════════════════════════════════════════
 *  GET /api/guild/:guildId/commands
 *
 *  يرجع قائمة كاملة بكل الأوامر مع:
 *  - اسم الأمر الأصلي + الفئة + الوصف
 *  - الاسم المخصص (legacy — يستخدمه الباتش 1)
 *  - Enabled/disabled
 *  - الـ aliases المضافة
 *  - الـ restrictions (روولات/رومات)
 *  - الـ defaults (وقت افتراضي، حذف تلقائي)
 *  - usage_count من إحصائيات الاستخدام
 * ═══════════════════════════════════════════════════════════
 */

const express = require("express")
const { asyncHandler } = require("../../middleware/error")
const { requireAuth, requireGuildAdmin } = require("../../middleware/auth")
const { query } = require("../../config/database")
const { getGuildPlan } = require("../../services/guildPlan")
const { COMMANDS_REGISTRY, CATEGORIES_META } = require("../../data/commandsRegistry")

const router = express.Router({ mergeParams: true })

// ════════════════════════════════════════════════════════════
//  GET /commands
// ════════════════════════════════════════════════════════════

router.get(
  "/",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params
    const guildPlan = await getGuildPlan(guildId)

    // ─── 1) Legacy settings: enabled/disabled + custom_name ───
    const settingsResult = await query(
      `SELECT command_name, custom_name, enabled
       FROM guild_command_settings
       WHERE guild_id = $1`,
      [guildId],
    )

    const legacySettings = {}
    for (const row of settingsResult.rows) {
      legacySettings[row.command_name] = {
        custom_name: row.custom_name,
        enabled: row.enabled,
      }
    }

    // ─── 2) Aliases (الباتش 1: الجديد) ───
    const aliasesResult = await query(
      `SELECT command_name, alias
       FROM guild_command_aliases
       WHERE guild_id = $1`,
      [guildId],
    )

    const aliasesByCommand = {}
    for (const row of aliasesResult.rows) {
      if (!aliasesByCommand[row.command_name]) {
        aliasesByCommand[row.command_name] = []
      }
      aliasesByCommand[row.command_name].push(row.alias)
    }

    // ─── 3) Restrictions (الباتش 6) ───
    const restrictionsResult = await query(
      `SELECT command_name, restrictions
       FROM guild_command_restrictions
       WHERE guild_id = $1`,
      [guildId],
    )

    const restrictionsByCommand = {}
    for (const row of restrictionsResult.rows) {
      restrictionsByCommand[row.command_name] = row.restrictions || {}
    }

    // ─── 4) Defaults (الباتش 7-8) ───
    const defaultsResult = await query(
      `SELECT command_name, defaults
       FROM guild_command_defaults
       WHERE guild_id = $1`,
      [guildId],
    )

    const defaultsByCommand = {}
    for (const row of defaultsResult.rows) {
      defaultsByCommand[row.command_name] = row.defaults || {}
    }

    // ─── 5) Usage stats (للـ leaderboard في الكارت) ───
    const usageResult = await query(
      `SELECT command_name, usage_count, last_used_at
       FROM command_usage_stats
       WHERE guild_id = $1`,
      [guildId],
    )

    const usageByCommand = {}
    for (const row of usageResult.rows) {
      usageByCommand[row.command_name] = {
        count: parseInt(row.usage_count, 10) || 0,
        last_used_at: row.last_used_at,
      }
    }

    // ─── 6) دمج كل الإعدادات مع الـ registry ───
    const commands = COMMANDS_REGISTRY.map((cmd) => {
      const legacy = legacySettings[cmd.name] || null
      const aliases = aliasesByCommand[cmd.name] || []
      const restrictions = restrictionsByCommand[cmd.name] || {}
      const defaults = defaultsByCommand[cmd.name] || {}
      const usage = usageByCommand[cmd.name] || { count: 0, last_used_at: null }

      return {
        ...cmd,
        // Legacy
        custom_name: legacy?.custom_name || null,
        enabled: legacy?.enabled !== false, // default true

        // الباتش 1: aliases
        aliases,

        // الباتش 6: restrictions (نخلّيها فاضية الحين)
        restrictions: {
          enabled_roles: restrictions.enabled_roles || [],
          disabled_roles: restrictions.disabled_roles || [],
          enabled_channels: restrictions.enabled_channels || [],
          disabled_channels: restrictions.disabled_channels || [],
        },

        // الباتش 7-8: defaults (نخلّيها فاضية الحين)
        defaults: {
          default_duration: defaults.default_duration || null,
          delete_invocation: defaults.delete_invocation || false,
          delete_response: defaults.delete_response || false,
          delete_response_after: defaults.delete_response_after || 5,
          delete_on_user_delete: defaults.delete_on_user_delete || false,
        },

        // Usage
        usage_count: usage.count,
        last_used_at: usage.last_used_at,
      }
    })

    res.json({
      guild_plan: guildPlan,
      commands,
      categories: CATEGORIES_META,

      // Backward compat للصفحة القديمة لو لسا تستخدم هذا
      custom_settings: legacySettings,
    })
  }),
)

module.exports = router