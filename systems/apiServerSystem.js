// ══════════════════════════════════════════════════════════════════
//  API SERVER — مع endpoint مزامنة رتب الاشتراك + معالج aliases
//  المسار: systems/apiServerSystem.js
//
//  endpoints:
//   POST /api/sync-subscription-role   — مزامنة رتبة اشتراك
//   POST /api/moderation/unban         — فك حظر
//   POST /api/moderation/unmute        — فك إسكات
//   POST /api/deploy-ticket-panel      — نشر لوحة تذاكر
//   POST /api/internal/invalidate-commands  ✅ NEW (Batch 2): مسح كاش aliases
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
const cardNotificationSystem = require("./cardNotificationSystem")
const { ALL_ITEMS } = require("../config/economyConfig")
const databaseSystem = require("./databaseSystem")
// ✅ NEW (Batch 2): معالج aliases
const commandAliases = require("./commandAliases")
const giveawayInternalRoutes = require("./giveawayRoutes")
const bulkActionsInternalRoutes = require("./bulkActionsRoutes")


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
  //  ✅ POST /api/card/notify
  //  يستدعيه dashboard-backend بعد أحداث اشتراك البطاقة
  //  لإرسال DM للمستخدم بحدث الاشتراك (موافقة/تمديد/هدية/...)
  // ════════════════════════════════════════════════════════

  app.post("/api/card/notify", requireBotSecret, async (req, res) => {
    try {
      const { userId, eventType, payload } = req.body || {}

      if (!userId || typeof userId !== "string") {
        return res.status(400).json({ error: "userId required" })
      }

      if (!eventType || typeof eventType !== "string") {
        return res.status(400).json({ error: "eventType required" })
      }

      const result = await cardNotificationSystem.sendNotification(
        client,
        userId,
        eventType,
        payload || {}
      )

      logger.info("CARD_NOTIFICATION_VIA_API", {
        userId,
        eventType,
        success: result.ok,
        error: result.error || null
      })

      return res.json({
        success: result.ok,
        error: result.error || null
      })
    } catch (err) {
      logger.error("CARD_NOTIFICATION_API_FAILED", {
        error: err.message,
        stack: err.stack
      })
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

  // ════════════════════════════════════════════════════════
  //  ✅ NEW (Batch 2): POST /api/internal/invalidate-commands
  //  يستدعيه dashboard-backend لما تتغيّر إعدادات أوامر سيرفر
  //  → نمسح كاش الـ aliases للسيرفر فوراً
  // ════════════════════════════════════════════════════════

  app.post("/api/internal/invalidate-commands", requireBotSecret, async (req, res) => {
    try {
      const { guildId } = req.body || {}
 
      if (!guildId || typeof guildId !== "string") {
        return res.status(400).json({ error: "guildId required" })
      }
 
      // ─── 1) مسح كاش aliases ───
      commandAliases.invalidate(guildId)
 
      // ─── 2) مسح كاش الـ settings الموحد (ai, welcome, protection, ...) ───
      try {
        const cacheSystem = require("../utils/cacheSystem")
 
        // AI settings
        cacheSystem.ns("ai-settings").del(guildId)
 
        // Settings caches موحّدة (يمكن إضافة المزيد لاحقاً)
        cacheSystem.ns("welcome-settings").del(guildId)
        cacheSystem.ns("protection-settings").del(guildId)
        cacheSystem.ns("log-settings").del(guildId)
        cacheSystem.ns("xp-settings").del(guildId)
        cacheSystem.ns("economy-settings").del(guildId)
        cacheSystem.ns("ticket-settings").del(guildId)
        cacheSystem.ns("automod-settings").del(guildId)
        cacheSystem.ns("auto-role-settings").del(guildId)
        cacheSystem.ns("event-settings").del(guildId)
      } catch (err) {
        logger.warn("CACHE_NAMESPACE_CLEAR_FAILED", { error: err.message })
      }
 
      logger.info("COMMANDS_CACHE_INVALIDATED_VIA_API", { guildId })
 
      return res.json({ success: true })
    } catch (err) {
      logger.error("INVALIDATE_COMMANDS_API_FAILED", { error: err.message })
      return res.status(500).json({ error: err.message })
    }
  })
// ─── Giveaway internal routes ───
  app.locals.discordClient = client
  app.use("/api/internal/giveaway", giveawayInternalRoutes)
  app.use("/api/internal/bulk", bulkActionsInternalRoutes)
  // ════════════════════════════════════════════════════════
  //  ✅ NEW: Leaderboard Internal Endpoints
  //  يستخدمهم الـ Backend لحساب net worth و items (يحتاج ALL_ITEMS)
  // ════════════════════════════════════════════════════════

  // ─── POST /api/internal/leaderboard/networth ───
  app.post("/api/internal/leaderboard/networth", requireBotSecret, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.body?.limit) || 100, 100)

      const result = await databaseSystem.query(`
        SELECT
          e.user_id,
          COALESCE(e.coins, 0)::bigint AS coins,
          COALESCE(e.bank, 0)::bigint AS bank,
          COALESCE(
            (
              SELECT json_agg(json_build_object('item_id', i.item_id, 'quantity', i.quantity))
              FROM inventory i
              WHERE i.user_id = e.user_id AND i.quantity > 0
            ),
            '[]'::json
          ) AS items
        FROM economy_users e
        WHERE COALESCE(e.coins, 0) + COALESCE(e.bank, 0) > 0
           OR EXISTS (SELECT 1 FROM inventory i WHERE i.user_id = e.user_id AND i.quantity > 0)
      `)

      const players = (result.rows || []).map(row => {
        const coins = Number(row.coins) || 0
        const bank = Number(row.bank) || 0
        const cashTotal = coins + bank
        const items = Array.isArray(row.items) ? row.items : []

        let itemsValue = 0
        let totalItems = 0
        for (const asset of items) {
          const def = ALL_ITEMS[asset.item_id]
          const qty = Number(asset.quantity) || 0
          totalItems += qty
          if (def?.price) {
            itemsValue += def.price * qty
          }
        }

        return {
          user_id: row.user_id,
          coins,
          bank,
          cash_total: cashTotal,
          items_value: itemsValue,
          total_items: totalItems,
          net_worth: cashTotal + itemsValue,
        }
      })

      players.sort((a, b) => b.net_worth - a.net_worth)

      return res.json({
        leaderboard: players.slice(0, limit),
        count: Math.min(players.length, limit),
        total_players: players.length,
      })
    } catch (err) {
      logger.error("NETWORTH_LEADERBOARD_FAILED", { error: err.message })
      return res.status(500).json({ error: "internal_error" })
    }
  })

  // ─── POST /api/internal/leaderboard/items ───
  app.post("/api/internal/leaderboard/items", requireBotSecret, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.body?.limit) || 100, 100)

      const result = await databaseSystem.query(`
        SELECT
          i.user_id,
          SUM(i.quantity)::int AS total_items,
          COUNT(DISTINCT i.item_id)::int AS unique_items,
          COALESCE(e.coins, 0)::bigint AS coins,
          COALESCE(e.bank, 0)::bigint AS bank
        FROM inventory i
        LEFT JOIN economy_users e ON e.user_id = i.user_id
        WHERE i.quantity > 0
        GROUP BY i.user_id, e.coins, e.bank
        ORDER BY total_items DESC
        LIMIT $1
      `, [limit])

      const players = await Promise.all((result.rows || []).map(async (row) => {
        const invResult = await databaseSystem.query(
          "SELECT item_id, quantity FROM inventory WHERE user_id = $1 AND quantity > 0",
          [row.user_id]
        )

        let itemsValue = 0
        for (const asset of invResult.rows || []) {
          const def = ALL_ITEMS[asset.item_id]
          const qty = Number(asset.quantity) || 0
          if (def?.price) itemsValue += def.price * qty
        }

        return {
          user_id: row.user_id,
          total_items: Number(row.total_items) || 0,
          unique_items: Number(row.unique_items) || 0,
          coins: Number(row.coins) || 0,
          bank: Number(row.bank) || 0,
          items_value: itemsValue,
        }
      }))

      return res.json({ leaderboard: players, count: players.length })
    } catch (err) {
      logger.error("ITEMS_LEADERBOARD_FAILED", { error: err.message })
      return res.status(500).json({ error: "internal_error" })
    }
  })

  // ─── POST /api/internal/networth-for-user ───
  app.post("/api/internal/networth-for-user", requireBotSecret, async (req, res) => {
    try {
      const { userId } = req.body || {}
      if (!userId || !/^\d{15,22}$/.test(userId)) {
        return res.status(400).json({ error: "invalid_user_id" })
      }

      const userResult = await databaseSystem.query(
        "SELECT coins, bank FROM economy_users WHERE user_id = $1",
        [userId]
      )
      const user = userResult.rows[0] || { coins: 0, bank: 0 }

      const invResult = await databaseSystem.query(
        "SELECT item_id, quantity FROM inventory WHERE user_id = $1 AND quantity > 0",
        [userId]
      )

      let itemsValue = 0
      let totalItems = 0
      for (const asset of invResult.rows || []) {
        const def = ALL_ITEMS[asset.item_id]
        const qty = Number(asset.quantity) || 0
        totalItems += qty
        if (def?.price) itemsValue += def.price * qty
      }

      const coins = Number(user.coins) || 0
      const bank = Number(user.bank) || 0

      return res.json({
        user_id: userId,
        coins,
        bank,
        cash_total: coins + bank,
        items_value: itemsValue,
        total_items: totalItems,
        net_worth: coins + bank + itemsValue,
      })
    } catch (err) {
      logger.error("NETWORTH_USER_FAILED", { error: err.message })
      return res.status(500).json({ error: "internal_error" })
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