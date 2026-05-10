// ══════════════════════════════════════════════════════════════════
//  API SERVER — مع endpoint مزامنة رتب الاشتراك
//  المسار: systems/apiServerSystem.js
//
//  endpoint جديد: POST /api/sync-subscription-role
 // ════════════════════════════════════════════════════════
  //  ✅ NEW (Batch 2): POST /api/internal/invalidate-commands
  //  يُستدعى من الداشبورد لما تتغيّر إعدادات أوامر سيرفر
  //  → نمسح كاش الـ aliases للسيرفر فوراً
  // ════════════════════════════════════════════════════════
 
  app.post("/api/internal/invalidate-commands", requireBotSecret, async (req, res) => {
    try {
      const { guildId } = req.body || {}
 
      if (!guildId || typeof guildId !== "string") {
        return res.status(400).json({ error: "guildId required" })
      }
 
      commandAliases.invalidate(guildId)
 
      logger.info("COMMANDS_CACHE_INVALIDATED_VIA_API", { guildId })
 
      return res.json({ success: true })
    } catch (err) {
      logger.error("INVALIDATE_COMMANDS_API_FAILED", { error: err.message })
      return res.status(500).json({ error: err.message })
    }
  })
//   body: { userId, planId, status }
//   header: x-bot-secret
//   - status='active' → grant role
//   - status != 'active' → revoke role
// ══════════════════════════════════════════════════════════════════

const express = require("express")
const logger = require("./loggerSystem")

const { getHealth } = require("./healthSystem")
const { getStatus } = require("./statusSystem")
const { getMetrics } = require("./metricsSystem")
const { checkDatabaseHealth } = require("./databaseHealthSystem")
const { getDatabaseStats } = require("./databaseStatsSystem")
const { checkRepositories } = require("./repositoryHealthSystem")
const subscriptionRoleSystem = require("./subscriptionRoleSystem")
const commandAliases = require("./commandAliases")


function startApiServer(client) {

  const app = express()
  app.use(express.json({ limit: "100kb" }))

  const PORT = process.env.PORT || 3000
  const BOT_SECRET = process.env.BOT_SECRET || ""

  // ✅ Middleware للـ secret
  function requireBotSecret(req, res, next) {
    if (!BOT_SECRET) {
      return res.status(500).json({ error: "BOT_SECRET not configured" })
    }
    const provided = req.headers["x-bot-secret"]
    if (provided !== BOT_SECRET) {
      return res.status(401).json({ error: "Unauthorized" })
    }
    next()
  }

  app.get("/", (req, res) => {
    res.json({
      service: "Discord Production Platform",
      component: "Bot Core",
      status: "running"
    })
  })

  app.get("/health", async (req, res) => {
    const system = getHealth()
    const database = await checkDatabaseHealth()
    const repositories = checkRepositories()
    res.json({ system, database, repositories })
  })

  app.get("/status", (req, res) => {
    const status = getStatus(client)
    res.json(status)
  })

  app.get("/metrics", (req, res) => {
    const metrics = getMetrics()
    res.json(metrics)
  })

  app.get("/dbstats", async (req, res) => {
    const stats = await getDatabaseStats()
    res.json(stats)
  })

  app.get("/diagnostics", async (req, res) => {
    const database = await checkDatabaseHealth()
    const repositories = checkRepositories()
    const guilds = client?.guilds?.cache?.size || 0
    const users = client?.users?.cache?.size || 0
    res.json({
      bot: client?.user ? client.user.tag : "not ready",
      status: client?.isReady?.() ? "ready" : "not ready",
      guilds,
      users,
      database,
      repositories
    })
  })

  // ════════════════════════════════════════════════════════
  //  ✅ POST /api/sync-subscription-role
  //  يستدعيه dashboard-backend بعد approve/reject/expire
  // ════════════════════════════════════════════════════════

  app.post("/api/sync-subscription-role", requireBotSecret, async (req, res) => {
    try {
      const { userId, planId, status } = req.body || {}

      if (!userId || typeof userId !== "string") {
        return res.status(400).json({ error: "userId required" })
      }

      const result = await subscriptionRoleSystem.syncUserRole(userId, planId, status)

      logger.info("SUBSCRIPTION_ROLE_SYNCED_VIA_API", {
        userId,
        planId,
        status,
        result
      })

      return res.json({ success: true, synced: result })
    } catch (err) {
      logger.error("SUBSCRIPTION_ROLE_SYNC_API_FAILED", { error: err.message })
      return res.status(500).json({ error: err.message })
    }
  })

  // ════════════════════════════════════════════════════════
  //  ✅ POST /api/moderation/unban
  //  يستدعيه dashboard-backend عند DELETE /moderation/bans/:userId
  // ════════════════════════════════════════════════════════

  app.post("/api/moderation/unban", requireBotSecret, async (req, res) => {
    try {
      const { guildId, userId, reason } = req.body || {}
      if (!guildId || !userId) {
        return res.status(400).json({ error: "guildId and userId required" })
      }

      const guild = client?.guilds?.cache?.get(guildId)
      if (!guild) {
        return res.status(404).json({ error: "guild_not_found" })
      }

      try {
        await guild.bans.remove(userId, reason || "Unbanned via dashboard")
      } catch (err) {
        // لو ما هو محظور أصلاً
        if (err.code === 10026) {
          return res.json({ success: true, was_banned: false })
        }
        throw err
      }

      return res.json({ success: true, was_banned: true })
    } catch (err) {
      logger.error("UNBAN_API_FAILED", { error: err.message })
      return res.status(500).json({ error: err.message })
    }
  })

  // ════════════════════════════════════════════════════════
  //  ✅ POST /api/moderation/unmute
  // ════════════════════════════════════════════════════════

  app.post("/api/moderation/unmute", requireBotSecret, async (req, res) => {
    try {
      const { guildId, userId, reason } = req.body || {}
      if (!guildId || !userId) {
        return res.status(400).json({ error: "guildId and userId required" })
      }

      const guild = client?.guilds?.cache?.get(guildId)
      if (!guild) {
        return res.status(404).json({ error: "guild_not_found" })
      }

      const member = await guild.members.fetch(userId).catch(() => null)
      if (!member) {
        return res.status(404).json({ error: "member_not_found" })
      }

      if (!member.isCommunicationDisabled?.()) {
        return res.json({ success: true, was_muted: false })
      }

      await member.timeout(null, reason || "Unmuted via dashboard")
      return res.json({ success: true, was_muted: true })
    } catch (err) {
      logger.error("UNMUTE_API_FAILED", { error: err.message })
      return res.status(500).json({ error: err.message })
    }
  })

  // ════════════════════════════════════════════════════════
  //  ✅ POST /api/deploy-ticket-panel
  //  يستدعيه dashboard-backend بعد POST /tickets/panel/deploy
  // ════════════════════════════════════════════════════════

  app.post("/api/deploy-ticket-panel", requireBotSecret, async (req, res) => {
    try {
      const { guildId } = req.body || {}
      if (!guildId) {
        return res.status(400).json({ error: "guildId required" })
      }

      const guild = client?.guilds?.cache?.get(guildId)
      if (!guild) {
        return res.status(404).json({ error: "guild_not_found" })
      }

      const ticketSystem = require("./ticketSystem")
      const result = await ticketSystem.deployPanel(guild)

      if (!result.ok) {
        return res.status(400).json({ error: result.error || "deploy_failed" })
      }

      return res.json({ success: true })
    } catch (err) {
      logger.error("DEPLOY_TICKET_PANEL_API_FAILED", { error: err.message })
      return res.status(500).json({ error: err.message })
    }
  })

  app.listen(PORT, "0.0.0.0", () => {
    logger.success(`API_SERVER_RUNNING ${PORT}`)
    console.log(`🚀 Server listening on 0.0.0.0:${PORT}`)
  })

}

module.exports = {
  startApiServer
}