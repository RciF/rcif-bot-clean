/**
 * ═══════════════════════════════════════════════════════════
 *  Lyn Dashboard API — Server Entry Point
 *  v2.0 — معمارية modular احترافية + كل الـ routes
 * ═══════════════════════════════════════════════════════════
 */

console.log("🚀 Starting Lyn Dashboard API v2.0...")

const express = require("express")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")

// ── Configuration ──
const env = require("./config/env")
const db = require("./config/database")

// ── Middleware ──
const corsMiddleware = require("./middleware/cors")
const { notFoundHandler, errorHandler } = require("./middleware/error")

// ── Routes ──
const authRoutes = require("./routes/auth")
const guildRoutes = require("./routes/guild")
const settingsRoutes = require("./routes/settings")
const subscriptionRoutes = require("./routes/subscription")
const commandsRoutes = require("./routes/commands")

// ── Services / Utils (with stoppable intervals) ──
const guildPlanService = require("./services/guildPlan")
const discordUtil = require("./utils/discord")

// ── Migrations ──
const { runMigrations } = require("./scripts/migrate")

// ── App ──
const app = express()

// ── Trust proxy (Render) ──
app.set("trust proxy", 1)

// ── Security headers ──
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
)

// ── CORS ──
app.use(corsMiddleware)

// ── Body parsing ──
app.use(express.json({ limit: "100kb" }))
app.use(express.urlencoded({ extended: true, limit: "100kb" }))

// ── Request logging (dev) ──
if (!env.IS_PROD) {
  app.use((req, res, next) => {
    const start = Date.now()
    res.on("finish", () => {
      const duration = Date.now() - start
      const symbol = res.statusCode >= 400 ? "❌" : "✅"
      console.log(`${symbol} ${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`)
    })
    next()
  })
}

// ── Global rate limit ──
app.use(
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "تجاوزت الحد المسموح من الطلبات", code: "RATE_LIMIT" },
  }),
)

// ════════════════════════════════════════════════════════════
//  ROUTES
// ════════════════════════════════════════════════════════════

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "Lyn Dashboard API",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  })
})

app.get("/api/health", async (req, res) => {
  const dbStatus = await db.checkConnection()
  res.json({
    status: dbStatus.connected ? "ok" : "degraded",
    db: dbStatus.connected ? "connected" : "disconnected",
    uptime: process.uptime(),
    memory: Math.round(process.memoryUsage().rss / 1024 / 1024) + " MB",
    timestamp: new Date().toISOString(),
  })
})

// ════════════════════════════════════════════════════════════
//  GET /api/bot/guilds
//  قائمة IDs السيرفرات اللي البوت موجود فيها
//  (بدون auth — عامة — مع caching)
// ════════════════════════════════════════════════════════════

let botGuildsCache = { data: null, fetchedAt: 0 }
const BOT_GUILDS_TTL = 60 * 1000 // دقيقة

app.get("/api/bot/guilds", async (req, res) => {
  try {
    // استخدم الكاش لو ما انتهى
    if (botGuildsCache.data && Date.now() - botGuildsCache.fetchedAt < BOT_GUILDS_TTL) {
      return res.json(botGuildsCache.data)
    }

    const response = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: {
        Authorization: `Bot ${env.BOT_TOKEN}`,
        "User-Agent": "DiscordBot/1.0",
      },
    })

    if (!response.ok) {
      throw new Error(`Discord API ${response.status}`)
    }

    const guilds = await response.json()
    const ids = Array.isArray(guilds) ? guilds.map((g) => g.id) : []

    botGuildsCache = { data: ids, fetchedAt: Date.now() }
    res.json(ids)
  } catch (err) {
    console.error("[BOT_GUILDS]", err.message)
    // لو فشل → رجّع الكاش القديم أو مصفوفة فارغة
    res.json(botGuildsCache.data || [])
  }
})

// ── Auth ──
app.use("/api/auth", authRoutes)

// ── Subscription / Payment / Linking ──
app.use("/api", subscriptionRoutes)

// ── Guild routes (resources + settings + commands) ──
app.use("/api/guild/:guildId", guildRoutes)
app.use("/api/guild/:guildId", settingsRoutes)
app.use("/api/guild/:guildId", commandsRoutes)

// ════════════════════════════════════════════════════════════
//  ERROR HANDLERS (must be last)
// ════════════════════════════════════════════════════════════

app.use(notFoundHandler)
app.use(errorHandler)

// ════════════════════════════════════════════════════════════
//  STARTUP
// ════════════════════════════════════════════════════════════

// ✅ FIX: حفظ مرجع لـ HTTP server عشان نقدر نقفله عند shutdown
let httpServer = null

async function start() {
  try {
    // 1. تأكد من اتصال DB
    const dbStatus = await db.checkConnection()
    if (!dbStatus.connected) {
      throw new Error(`Database connection failed: ${dbStatus.error}`)
    }
    console.log("✅ Database connected")

    // 2. أنشئ الـ schema الأساسي
    await db.initSchema()

    // 3. تشغيل migrations الإضافية
    await runMigrations()

    // 4. ابدأ السيرفر
    httpServer = app.listen(env.PORT, () => {
      console.log("═══════════════════════════════════════════")
      console.log(`🚀 Server running on port ${env.PORT}`)
      console.log(`🌍 Environment: ${env.NODE_ENV}`)
      console.log(`📡 CORS: ${env.ALLOWED_ORIGINS.length} origins allowed`)
      console.log(`🔐 OAuth: ${env.ALLOWED_REDIRECT_URIS.length} redirect URIs`)
      console.log("═══════════════════════════════════════════")
    })
  } catch (err) {
    console.error("❌ Startup failed:", err.message)
    if (!env.IS_PROD) console.error(err.stack)
    process.exit(1)
  }
}

// ════════════════════════════════════════════════════════════
//  ✅ FIX: Graceful Shutdown متكامل
//  ─────────────────────────────────────────────────────────
//  يضمن:
//   1. إيقاف cache cleanup intervals
//   2. إيقاف HTTP server (ينتظر الطلبات الحالية تخلص)
//   3. إغلاق DB pool
//   4. hard timeout 10 ثوان لو شي علق
//   5. حماية من double-shutdown
// ════════════════════════════════════════════════════════════

let isShuttingDown = false

async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    console.log(`📴 [${signal}] Shutdown already in progress`)
    return
  }
  isShuttingDown = true

  console.log(`📴 [${signal}] received, shutting down gracefully...`)

  // hard timeout: لو الإغلاق طول أكثر من 10 ثوان، اخرج بالقوة
  const forceExitTimer = setTimeout(() => {
    console.error("❌ Shutdown timeout — forcing exit")
    process.exit(1)
  }, 10000)
  forceExitTimer.unref?.()

  // 1) إيقاف cache cleanup intervals
  try {
    guildPlanService.stopCacheCleanup()
    discordUtil.stopCacheCleanup()
    console.log("✅ Cache cleanup intervals stopped")
  } catch (err) {
    console.error("⚠️  Failed to stop cache intervals:", err.message)
  }

  // 2) إيقاف HTTP server (ينتظر الطلبات الحالية تخلص)
  if (httpServer) {
    try {
      await new Promise((resolve) => {
        httpServer.close(() => {
          console.log("✅ HTTP server closed")
          resolve()
        })
      })
    } catch (err) {
      console.error("⚠️  Failed to close HTTP server:", err.message)
    }
  }

  // 3) إغلاق DB pool
  try {
    await db.pool.end()
    console.log("✅ Database pool closed")
  } catch (err) {
    console.error("⚠️  Failed to close DB pool:", err.message)
  }

  console.log("✅ Shutdown completed")
  clearTimeout(forceExitTimer)
  process.exit(0)
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason)
})

// ✅ FIX: إضافة uncaughtException handler
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message)
  if (!env.IS_PROD) console.error(err.stack)
  // ما نخرج فوراً — نسجل ونكمل (إلا لو fatal جداً)
})

start()