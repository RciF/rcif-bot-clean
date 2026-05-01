/**
 * ═══════════════════════════════════════════════════════════
 *  Environment Configuration
 *  كل المتغيرات في مكان واحد + validation عند الإقلاع
 * ═══════════════════════════════════════════════════════════
 */

require("dotenv").config()

const isProd = process.env.NODE_ENV === "production"

const env = {
  // ── البيئة ──
  NODE_ENV: process.env.NODE_ENV || "development",
  IS_PROD: isProd,
  PORT: parseInt(process.env.PORT) || 4000,

  // ── Discord OAuth ──
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  BOT_TOKEN: process.env.BOT_TOKEN,
  DEFAULT_REDIRECT_URI: process.env.REDIRECT_URI || "http://localhost:5173/callback",

  // ── Owner ──
  OWNER_ID: process.env.OWNER_ID || "529320108032786433",

  // ── JWT ──
  // لو ما حُدد، نستخدم BOT_TOKEN كـ fallback (فيه entropy كافي)
  JWT_SECRET: process.env.JWT_SECRET || process.env.BOT_TOKEN || "lyn-dev-secret-change-me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  // ── Database ──
  DATABASE_URL: process.env.DATABASE_URL,

  // ── Frontend URLs المسموحة (CORS) ──
  ALLOWED_ORIGINS: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://rcif-dashboard.onrender.com",
    process.env.FRONTEND_URL,
  ].filter(Boolean),

  // ── Discord Redirect URIs المسموحة ──
  ALLOWED_REDIRECT_URIS: [
    "http://localhost:3000/callback",
    "http://localhost:5173/callback",
    "https://rcif-dashboard.onrender.com/callback",
    process.env.REDIRECT_URI,
  ].filter(Boolean),

  // ── Rate Limiting ──
  RATE_LIMIT_WINDOW_MS: 60 * 1000,         // دقيقة
  RATE_LIMIT_MAX_REQUESTS: isProd ? 100 : 1000, // 100 طلب/دقيقة في prod
  AUTH_RATE_LIMIT_MAX: 10,                  // 10 محاولات auth/دقيقة

  // ── Cache TTLs (بالـ ms) ──
  CACHE_DISCORD_USER: 5 * 60 * 1000,       // 5 دقائق
  CACHE_DISCORD_GUILD: 10 * 60 * 1000,     // 10 دقائق
  CACHE_GUILD_PLAN: 60 * 1000,             // دقيقة
}

/**
 * Validation — تأكد إن المتغيرات الحرجة موجودة
 */
const REQUIRED_VARS = ["CLIENT_ID", "CLIENT_SECRET", "BOT_TOKEN", "DATABASE_URL"]

function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !env[key])
  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:")
    missing.forEach((key) => console.error(`   - ${key}`))
    if (isProd) {
      throw new Error(`Missing env vars: ${missing.join(", ")}`)
    } else {
      console.warn("⚠️  Running in dev mode with missing vars — some features won't work")
    }
  } else {
    console.log("✅ Environment variables loaded successfully")
  }
}

validateEnv()

module.exports = env
