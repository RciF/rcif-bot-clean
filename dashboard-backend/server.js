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
    app.listen(env.PORT, () => {
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

// ── Graceful shutdown ──
process.on("SIGTERM", async () => {
  console.log("📴 SIGTERM received, shutting down gracefully...")
  await db.pool.end()
  process.exit(0)
})

process.on("SIGINT", async () => {
  console.log("📴 SIGINT received, shutting down gracefully...")
  await db.pool.end()
  process.exit(0)
})

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason)
})

start()
