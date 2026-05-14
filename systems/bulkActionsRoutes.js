// ══════════════════════════════════════════════════════════════════
//  BULK ACTIONS INTERNAL API
//  المسار: systems/bulkActionsRoutes.js
//
//  تُستدعى من dashboard-backend
//  المسارات:
//   POST /api/internal/bulk/ban
//   POST /api/internal/bulk/kick
//   POST /api/internal/bulk/mute
//   POST /api/internal/bulk/role-add
//   POST /api/internal/bulk/role-remove
//   POST /api/internal/bulk/undo
// ══════════════════════════════════════════════════════════════════

const express = require("express")
const bulkActionsSystem = require("./bulkActionsSystem")
const logger = require("./loggerSystem")

const router = express.Router()

// ─── Middleware: x-bot-secret ───
router.use((req, res, next) => {
  const secret = req.headers["x-bot-secret"]
  if (!secret || secret !== process.env.BOT_SECRET) {
    return res.status(401).json({ error: "غير مصرح", code: "INVALID_SECRET" })
  }
  next()
})

// ─── Validation helper ───
function validateRequest(req, requiredFields) {
  for (const field of requiredFields) {
    if (req.body[field] === undefined || req.body[field] === null) {
      return `${field} is required`
    }
  }

  if (!Array.isArray(req.body.user_ids) || req.body.user_ids.length === 0) {
    return "user_ids must be non-empty array"
  }

  if (req.body.user_ids.length > 50) {
    return "Maximum 50 users per bulk operation"
  }

  for (const id of req.body.user_ids) {
    if (typeof id !== "string" || !/^\d+$/.test(id)) {
      return `Invalid user_id: ${id}`
    }
  }

  return null
}

// ══════════════════════════════════════════════════════════════════
//  POST /ban
// ══════════════════════════════════════════════════════════════════

router.post("/ban", async (req, res) => {
  try {
    const err = validateRequest(req, ["guild_id", "user_ids", "executor_id"])
    if (err) return res.status(400).json({ error: err })

    const result = await bulkActionsSystem.bulkBan({
      guildId: req.body.guild_id,
      userIds: req.body.user_ids,
      executorId: req.body.executor_id,
      reason: req.body.reason || "Bulk action via dashboard"
    })

    res.json({ success: true, ...result })
  } catch (err) {
    logger.error("API_BULK_BAN_FAILED", { error: err.message })
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════
//  POST /kick
// ══════════════════════════════════════════════════════════════════

router.post("/kick", async (req, res) => {
  try {
    const err = validateRequest(req, ["guild_id", "user_ids", "executor_id"])
    if (err) return res.status(400).json({ error: err })

    const result = await bulkActionsSystem.bulkKick({
      guildId: req.body.guild_id,
      userIds: req.body.user_ids,
      executorId: req.body.executor_id,
      reason: req.body.reason || "Bulk action via dashboard"
    })

    res.json({ success: true, ...result })
  } catch (err) {
    logger.error("API_BULK_KICK_FAILED", { error: err.message })
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════
//  POST /mute
// ══════════════════════════════════════════════════════════════════

router.post("/mute", async (req, res) => {
  try {
    const err = validateRequest(req, ["guild_id", "user_ids", "executor_id", "duration_ms"])
    if (err) return res.status(400).json({ error: err })

    const result = await bulkActionsSystem.bulkMute({
      guildId: req.body.guild_id,
      userIds: req.body.user_ids,
      executorId: req.body.executor_id,
      durationMs: parseInt(req.body.duration_ms),
      reason: req.body.reason || "Bulk action via dashboard"
    })

    res.json({ success: true, ...result })
  } catch (err) {
    logger.error("API_BULK_MUTE_FAILED", { error: err.message })
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════
//  POST /role-add
// ══════════════════════════════════════════════════════════════════

router.post("/role-add", async (req, res) => {
  try {
    const err = validateRequest(req, ["guild_id", "user_ids", "executor_id", "role_id"])
    if (err) return res.status(400).json({ error: err })

    if (!/^\d+$/.test(req.body.role_id)) {
      return res.status(400).json({ error: "Invalid role_id" })
    }

    const result = await bulkActionsSystem.bulkAddRole({
      guildId: req.body.guild_id,
      userIds: req.body.user_ids,
      roleId: req.body.role_id,
      executorId: req.body.executor_id,
      reason: req.body.reason || "Bulk action via dashboard"
    })

    res.json({ success: true, ...result })
  } catch (err) {
    logger.error("API_BULK_ROLE_ADD_FAILED", { error: err.message })
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════
//  POST /role-remove
// ══════════════════════════════════════════════════════════════════

router.post("/role-remove", async (req, res) => {
  try {
    const err = validateRequest(req, ["guild_id", "user_ids", "executor_id", "role_id"])
    if (err) return res.status(400).json({ error: err })

    if (!/^\d+$/.test(req.body.role_id)) {
      return res.status(400).json({ error: "Invalid role_id" })
    }

    const result = await bulkActionsSystem.bulkRemoveRole({
      guildId: req.body.guild_id,
      userIds: req.body.user_ids,
      roleId: req.body.role_id,
      executorId: req.body.executor_id,
      reason: req.body.reason || "Bulk action via dashboard"
    })

    res.json({ success: true, ...result })
  } catch (err) {
    logger.error("API_BULK_ROLE_REMOVE_FAILED", { error: err.message })
    res.status(500).json({ error: err.message })
  }
})

// ══════════════════════════════════════════════════════════════════
//  POST /undo
// ══════════════════════════════════════════════════════════════════

router.post("/undo", async (req, res) => {
  try {
    const { action_id, executor_id } = req.body
    if (!action_id) return res.status(400).json({ error: "action_id required" })
    if (!executor_id) return res.status(400).json({ error: "executor_id required" })

    const result = await bulkActionsSystem.undoAction(parseInt(action_id), executor_id)
    res.json({ success: true, ...result })
  } catch (err) {
    logger.error("API_BULK_UNDO_FAILED", { error: err.message })
    res.status(400).json({ error: err.message })
  }
})

module.exports = router