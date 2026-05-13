// ══════════════════════════════════════════════════════════════════
//  GIVEAWAY INTERNAL API
//  المسار: systems/apiServerSystem/giveawayRoutes.js
//
//  تُستدعى من dashboard-backend عبر x-bot-secret
//  المسارات:
//   POST /api/internal/giveaway/create
//   POST /api/internal/giveaway/end
//   POST /api/internal/giveaway/cancel
//   POST /api/internal/giveaway/reroll
//
//  Express Router — يُضاف في apiServerSystem الرئيسي
// ══════════════════════════════════════════════════════════════════

const express = require("express")
const giveawaySystem = require("./giveawaySystem")
const logger = require("../loggerSystem")

const router = express.Router()

// ─── Middleware: x-bot-secret ───
router.use((req, res, next) => {
  const secret = req.headers["x-bot-secret"]
  if (!secret || secret !== process.env.BOT_SECRET) {
    return res.status(401).json({ error: "غير مصرح", code: "INVALID_SECRET" })
  }
  next()
})

// ─── Helper: get client ───
function getClient(req) {
  return req.app.locals?.discordClient || req.app.get?.("client") || null
}

// ════════════════════════════════════════════════════════════
//  POST /create
// ════════════════════════════════════════════════════════════

router.post("/create", async (req, res) => {
  try {
    const {
      guild_id,
      channel_id,
      host_id,
      prize,
      description,
      winner_count,
      duration_ms,
      required_role,
      required_level,
    } = req.body

    const client = getClient(req)
    if (!client?.isReady?.()) {
      return res.status(503).json({ error: "البوت غير متصل", code: "BOT_NOT_READY" })
    }

    const guild = client.guilds.cache.get(guild_id)
    if (!guild) {
      return res.status(404).json({ error: "السيرفر غير موجود", code: "GUILD_NOT_FOUND" })
    }

    const giveaway = await giveawaySystem.createGiveaway({
      guild,
      channelId: channel_id,
      hostId: host_id,
      prize,
      description,
      winnerCount: winner_count,
      durationMs: duration_ms,
      requiredRole: required_role,
      requiredLevel: required_level,
    })

    res.json({ success: true, giveaway })
  } catch (err) {
    logger.error("API_GIVEAWAY_CREATE_FAILED", { error: err.message })
    res.status(500).json({ error: err.message, code: "CREATE_FAILED" })
  }
})

// ════════════════════════════════════════════════════════════
//  POST /end
// ════════════════════════════════════════════════════════════

router.post("/end", async (req, res) => {
  try {
    const { giveaway_id } = req.body
    if (!giveaway_id) {
      return res.status(400).json({ error: "giveaway_id مطلوب" })
    }

    const result = await giveawaySystem.endGiveaway(giveaway_id)
    if (!result.ok) {
      return res.status(400).json({ error: result.reason, code: "END_FAILED" })
    }

    res.json({ success: true, ...result })
  } catch (err) {
    logger.error("API_GIVEAWAY_END_FAILED", { error: err.message })
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
//  POST /cancel
// ════════════════════════════════════════════════════════════

router.post("/cancel", async (req, res) => {
  try {
    const { giveaway_id } = req.body
    if (!giveaway_id) {
      return res.status(400).json({ error: "giveaway_id مطلوب" })
    }

    const result = await giveawaySystem.cancelGiveaway(giveaway_id)
    if (!result.ok) {
      return res.status(400).json({ error: result.reason })
    }

    res.json({ success: true })
  } catch (err) {
    logger.error("API_GIVEAWAY_CANCEL_FAILED", { error: err.message })
    res.status(500).json({ error: err.message })
  }
})

// ════════════════════════════════════════════════════════════
//  POST /reroll
// ════════════════════════════════════════════════════════════

router.post("/reroll", async (req, res) => {
  try {
    const { giveaway_id, count } = req.body
    if (!giveaway_id) {
      return res.status(400).json({ error: "giveaway_id مطلوب" })
    }

    const result = await giveawaySystem.rerollGiveaway(giveaway_id, count || 1)
    if (!result.ok) {
      return res.status(400).json({ error: result.reason })
    }

    res.json({ success: true, new_winners: result.newWinners })
  } catch (err) {
    logger.error("API_GIVEAWAY_REROLL_FAILED", { error: err.message })
    res.status(500).json({ error: err.message })
  }
})

module.exports = router