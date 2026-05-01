/**
 * ═══════════════════════════════════════════════════════════
 *  CORS Middleware
 *  يدعم origins متعددة + يطبع التشخيص لو حدث blocking
 * ═══════════════════════════════════════════════════════════
 */

const cors = require("cors")
const env = require("../config/env")

const corsOptions = {
  origin: (origin, callback) => {
    // السماح بالطلبات بدون origin (Postman, curl, server-to-server)
    if (!origin) return callback(null, true)

    if (env.ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true)
    }

    // طباعة الـ origin المرفوض لمساعدة التشخيص
    console.warn(`[CORS] ❌ Blocked: ${origin}`)
    console.warn(`[CORS] ✅ Allowed: ${env.ALLOWED_ORIGINS.join(", ")}`)

    return callback(new Error(`CORS: Origin ${origin} not allowed`), false)
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["X-Total-Count", "X-Rate-Limit-Remaining"],
  maxAge: 86400, // 24 ساعة - تقليل preflight requests
}

module.exports = cors(corsOptions)
