/**
 * ═══════════════════════════════════════════════════════════
 *  Guild Resources Routes
 *  /api/guild/:guildId/*
 *
 *  - GET /channels    قنوات السيرفر
 *  - GET /roles       رتب السيرفر
 *  - GET /members     أعضاء السيرفر (paginated + search)
 *  - GET /emojis      إيموجيات السيرفر
 *  - GET /info        معلومات السيرفر
 *  - GET /plan        خطة السيرفر
 * ═══════════════════════════════════════════════════════════
 */

const express = require("express")
const { asyncHandler } = require("../middleware/error")
const { requireAuth, requireGuildAdmin } = require("../middleware/auth")
const discord = require("../utils/discord")
const { getGuildPlan } = require("../services/guildPlan")
const env = require("../config/env")

const router = express.Router({ mergeParams: true })

// ════════════════════════════════════════════════════════════
//  GET /api/guild/:guildId/info
// ════════════════════════════════════════════════════════════

router.get(
  "/info",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params
    const guild = await discord.fetchGuild(guildId)

    res.json({
      id: guild.id,
      name: guild.name,
      icon: discord.getGuildIconUrl(guild),
      banner: guild.banner,
      description: guild.description,
      ownerId: guild.owner_id,
      memberCount: guild.approximate_member_count,
      onlineCount: guild.approximate_presence_count,
      preferredLocale: guild.preferred_locale,
      verificationLevel: guild.verification_level,
      premiumTier: guild.premium_tier,
      premiumSubscriptionCount: guild.premium_subscription_count,
      features: guild.features,
    })
  }),
)

// ════════════════════════════════════════════════════════════
//  GET /api/guild/:guildId/channels
// ════════════════════════════════════════════════════════════

router.get(
  "/channels",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params
    const channels = await discord.fetchGuildChannels(guildId)

    const sorted = channels
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        position: c.position,
        parentId: c.parent_id,
        topic: c.topic,
        nsfw: c.nsfw,
      }))
      .sort((a, b) => a.position - b.position)

    res.json(sorted)
  }),
)

// ════════════════════════════════════════════════════════════
//  GET /api/guild/:guildId/roles
// ════════════════════════════════════════════════════════════

router.get(
  "/roles",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params
    const roles = await discord.fetchGuildRoles(guildId)

    const sorted = roles
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        position: r.position,
        permissions: r.permissions,
        managed: r.managed,
        mentionable: r.mentionable,
        hoist: r.hoist,
        icon: r.icon,
      }))
      .sort((a, b) => b.position - a.position)

    res.json(sorted)
  }),
)

// ════════════════════════════════════════════════════════════
//  GET /api/guild/:guildId/members
//  دعم: ?limit=100&after=ID&search=text
// ════════════════════════════════════════════════════════════

router.get(
  "/members",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000)
    const after = req.query.after
    const search = req.query.search

    const members = await discord.fetchGuildMembers(guildId, { limit, after })

    let mapped = members.map((m) => ({
      id: m.user.id,
      username: m.user.global_name || m.user.username,
      discriminator: m.user.discriminator,
      avatar: discord.getUserAvatarUrl(m.user),
      bot: m.user.bot || false,
      nick: m.nick,
      roles: m.roles,
      joinedAt: m.joined_at,
      premiumSince: m.premium_since,
      pending: m.pending,
    }))

    if (search) {
      const q = search.toLowerCase()
      mapped = mapped.filter(
        (m) =>
          m.username.toLowerCase().includes(q) ||
          (m.nick && m.nick.toLowerCase().includes(q)) ||
          m.id.includes(q),
      )
    }

    res.json(mapped)
  }),
)

// ════════════════════════════════════════════════════════════
//  GET /api/guild/:guildId/emojis
// ════════════════════════════════════════════════════════════

router.get(
  "/emojis",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params
    const emojis = await discord.fetchGuildEmojis(guildId)

    res.json(
      emojis.map((e) => ({
        id: e.id,
        name: e.name,
        animated: e.animated,
        available: e.available,
        url: `https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? "gif" : "png"}`,
      })),
    )
  }),
)

// ════════════════════════════════════════════════════════════
//  GET /api/guild/:guildId/plan
//  ✅ يرجع plan_id (مو plan فقط)
// ════════════════════════════════════════════════════════════

router.get(
  "/plan",
  requireAuth,
  requireGuildAdmin,
  asyncHandler(async (req, res) => {
    const { guildId } = req.params
    const plan_id = await getGuildPlan(guildId)
    res.json({ plan_id })
  }),
)

module.exports = router