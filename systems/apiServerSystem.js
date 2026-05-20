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

// ════════════════════════════════════════════════════════════
//  Helpers: Period filter
// ════════════════════════════════════════════════════════════

function periodStartMs(period) {
  const now = Date.now()
  switch (period) {
    case "daily":   return now - 24 * 60 * 60 * 1000
    case "weekly":  return now - 7 * 24 * 60 * 60 * 1000
    case "monthly": return now - 30 * 24 * 60 * 60 * 1000
    default:        return 0
  }
}

function normalizePeriod(p) {
  return ["all", "daily", "weekly", "monthly"].includes(p) ? p : "all"
}
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
      const period = normalizePeriod(req.body?.period)

      let sql
      let params

      if (period === "all") {
        sql = `
          SELECT
            e.user_id,
            COALESCE(e.coins, 0)::bigint AS coins,
            COALESCE(e.inventory, '[]'::jsonb) AS items
          FROM economy_users e
          WHERE COALESCE(e.coins, 0) > 0
             OR jsonb_array_length(COALESCE(e.inventory, '[]'::jsonb)) > 0
        `
        params = []
      } else {
        const startMs = periodStartMs(period)
        sql = `
          SELECT
            e.user_id,
            COALESCE(e.coins, 0)::bigint AS coins,
            COALESCE(e.inventory, '[]'::jsonb) AS items
          FROM economy_users e
          WHERE (COALESCE(e.coins, 0) > 0
             OR jsonb_array_length(COALESCE(e.inventory, '[]'::jsonb)) > 0)
            AND (e.last_daily >= $1 OR e.last_work >= $1)
        `
        params = [startMs]
      }

      const result = await databaseSystem.query(sql, params)

      const players = (result.rows || []).map(row => {
        const coins = Number(row.coins) || 0
        const cashTotal = coins
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
          bank: 0,
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
        period,
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
      const period = normalizePeriod(req.body?.period)

      let sql
      let params

      if (period === "all") {
        sql = `
          SELECT
            e.user_id,
            COALESCE(e.coins, 0)::bigint AS coins,
            COALESCE(e.inventory, '[]'::jsonb) AS items,
            (
              SELECT COALESCE(SUM(COALESCE((item->>'quantity')::int, 0)), 0)
              FROM jsonb_array_elements(COALESCE(e.inventory, '[]'::jsonb)) AS item
            )::int AS total_items,
            jsonb_array_length(COALESCE(e.inventory, '[]'::jsonb))::int AS unique_items
          FROM economy_users e
          WHERE jsonb_array_length(COALESCE(e.inventory, '[]'::jsonb)) > 0
          ORDER BY total_items DESC
          LIMIT $1
        `
        params = [limit]
      } else {
        const startMs = periodStartMs(period)
        sql = `
          SELECT
            e.user_id,
            COALESCE(e.coins, 0)::bigint AS coins,
            COALESCE(e.inventory, '[]'::jsonb) AS items,
            (
              SELECT COALESCE(SUM(COALESCE((item->>'quantity')::int, 0)), 0)
              FROM jsonb_array_elements(COALESCE(e.inventory, '[]'::jsonb)) AS item
            )::int AS total_items,
            jsonb_array_length(COALESCE(e.inventory, '[]'::jsonb))::int AS unique_items
          FROM economy_users e
          WHERE jsonb_array_length(COALESCE(e.inventory, '[]'::jsonb)) > 0
            AND (e.last_daily >= $1 OR e.last_work >= $1)
          ORDER BY total_items DESC
          LIMIT $2
        `
        params = [startMs, limit]
      }

      const result = await databaseSystem.query(sql, params)

      const players = (result.rows || []).map((row) => {
        const items = Array.isArray(row.items) ? row.items : []

        let itemsValue = 0
        for (const asset of items) {
          const def = ALL_ITEMS[asset.item_id]
          const qty = Number(asset.quantity) || 0
          if (def?.price) itemsValue += def.price * qty
        }

        return {
          user_id: row.user_id,
          total_items: Number(row.total_items) || 0,
          unique_items: Number(row.unique_items) || 0,
          coins: Number(row.coins) || 0,
          bank: 0,
          items_value: itemsValue,
        }
      })

      return res.json({ leaderboard: players, count: players.length, period })
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
        "SELECT coins FROM economy_users WHERE user_id = $1",
        [userId]
      )
      const user = userResult.rows[0] || { coins: 0 }

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

      return res.json({
        user_id: userId,
        coins,
        bank: 0,
        cash_total: coins,
        items_value: itemsValue,
        total_items: totalItems,
        net_worth: coins + itemsValue,
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
// ════════════════════════════════════════════════════════
  //  POST /api/internal/bot-stats
  //  يُرجع إحصائيات live من client الـ Discord
  //  مفيد للداش عشان يعرف عدد السيرفرات الفعلي
  // ════════════════════════════════════════════════════════
  app.post("/api/internal/bot-stats", requireBotSecret, async (req, res) => {
    try {
      if (!client?.isReady?.()) {
        return res.json({
          ready: false,
          guild_count: 0,
          user_count: 0,
        })
      }

      const guildCount = client.guilds.cache.size
      let userCount = 0
      let channelCount = 0

      for (const guild of client.guilds.cache.values()) {
        userCount += guild.memberCount || 0
        channelCount += guild.channels?.cache?.size || 0
      }

      return res.json({
        ready: true,
        guild_count: guildCount,
        user_count: userCount,
        channel_count: channelCount,
        uptime_ms: client.uptime || 0,
      })
    } catch (err) {
      logger.error("BOT_STATS_FAILED", { error: err.message })
      return res.status(500).json({ error: "internal_error" })
    }
  })
  // ═══════════════════════════════════════════════════════
  //  POST /api/internal/rank-for-user
  //  يحسب ترتيب لاعب معين في items أو networth
  // ═══════════════════════════════════════════════════════
  app.post("/api/internal/rank-for-user", requireBotSecret, async (req, res) => {
    try {
      const { userId, type } = req.body || {}
      if (!userId || !/^\d{15,22}$/.test(userId)) {
        return res.status(400).json({ error: "invalid_user_id" })
      }
      if (!["items", "networth"].includes(type)) {
        return res.status(400).json({ error: "invalid_type" })
      }

      // جلب كل اللاعبين عشان نحسب الترتيب
      const result = await databaseSystem.query(`
        SELECT
          e.user_id,
          COALESCE(e.coins, 0)::bigint AS coins,
          COALESCE(e.inventory, '[]'::jsonb) AS items
        FROM economy_users e
        WHERE COALESCE(e.coins, 0) > 0
           OR jsonb_array_length(COALESCE(e.inventory, '[]'::jsonb)) > 0
      `)

      // حساب القيم لكل لاعب
      const players = (result.rows || []).map(row => {
        const coins = Number(row.coins) || 0
        const itemsArr = Array.isArray(row.items) ? row.items : []
        let itemsValue = 0
        let totalItems = 0
        for (const asset of itemsArr) {
          const def = ALL_ITEMS[asset.item_id]
          const qty = Number(asset.quantity) || 0
          totalItems += qty
          if (def?.price) itemsValue += def.price * qty
        }
        return {
          user_id: row.user_id,
          total_items: totalItems,
          net_worth: coins + itemsValue,
        }
      })

      // ترتيب حسب النوع
      if (type === "items") {
        players.sort((a, b) => b.total_items - a.total_items)
      } else {
        players.sort((a, b) => b.net_worth - a.net_worth)
      }

      // البحث عن المستخدم
      const idx = players.findIndex(p => p.user_id === userId)
      if (idx === -1) {
        return res.json({ rank: null, in_top_100: false })
      }

      const rank = idx + 1
      return res.json({
        rank,
        in_top_100: rank <= 100,
        total_players: players.length,
      })
    } catch (err) {
      logger.error("RANK_FOR_USER_FAILED", { error: err.message })
      return res.status(500).json({ error: "internal_error" })
    }
  })
}

module.exports = {
  startApiServer
}