/**
 * ═══════════════════════════════════════════════════════════
 *  Authentication Middleware
 *  JWT + session validation + role guards
 * ═══════════════════════════════════════════════════════════
 */

const jwt = require("jsonwebtoken")
const env = require("../config/env")

/**
 * إنشاء JWT token جديد
 *
 * @param {Object} payload - { user, guilds }
 * @returns {string} JWT token
 */
function createToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: "lyn-dashboard",
  })
}

/**
 * التحقق من JWT وفك تشفيره
 *
 * @param {string} token
 * @returns {Object|null} payload أو null لو فشل
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET, {
      issuer: "lyn-dashboard",
    })
  } catch (err) {
    return null
  }
}

/**
 * استخراج الـ token من الـ request
 *
 * يدعم:
 *   - Authorization: Bearer <token>
 *   - Cookie (مستقبلاً)
 */
function extractToken(req) {
  const auth = req.headers.authorization
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice(7)
  }
  return null
}

/**
 * Middleware: يتطلب تسجيل دخول صحيح
 *
 * يضيف لـ req:
 *   - req.user: { id, username, avatar }
 *   - req.guilds: [{ id, name, icon, permissions }]
 */
function requireAuth(req, res, next) {
  const token = extractToken(req)

  if (!token) {
    return res.status(401).json({
      error: "مطلوب تسجيل دخول",
      code: "NO_TOKEN",
    })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return res.status(401).json({
      error: "الجلسة منتهية أو غير صالحة - سجل دخول مرة ثانية",
      code: "INVALID_TOKEN",
    })
  }

  req.user = payload.user
  req.guilds = payload.guilds || []
  req.token = token
  next()
}

/**
 * Middleware: يتطلب صاحب البوت (OWNER_ID)
 * يجب استخدامه بعد requireAuth
 */
function requireOwner(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "مطلوب تسجيل دخول" })
  }
  if (req.user.id !== env.OWNER_ID) {
    return res.status(403).json({
      error: "هذا الإجراء للمالك فقط",
      code: "OWNER_ONLY",
    })
  }
  next()
}

/**
 * Middleware: يتطلب صلاحية Admin على السيرفر
 * يجب استخدامه بعد requireAuth
 *
 * يتحقق إن guildId موجود في قائمة سيرفرات المستخدم
 */
function requireGuildAdmin(req, res, next) {
  const guildId = req.params.guildId || req.body.guildId

  if (!guildId) {
    return res.status(400).json({
      error: "معرّف السيرفر (guildId) مطلوب",
      code: "MISSING_GUILD_ID",
    })
  }

  // المالك دائماً يمر
  if (req.user.id === env.OWNER_ID) {
    return next()
  }

  const userGuild = req.guilds?.find((g) => g.id === guildId)
  if (!userGuild) {
    return res.status(403).json({
      error: "ليس لديك صلاحية على هذا السيرفر",
      code: "FORBIDDEN_GUILD",
    })
  }

  req.guild = userGuild // متاح في الـ handlers
  next()
}

/**
 * Middleware اختياري: لو فيه token صحيح، يضيف user للـ req
 * لو ما فيه أو غير صحيح، يكمل بدون error
 */
function optionalAuth(req, res, next) {
  const token = extractToken(req)
  if (!token) return next()

  const payload = verifyToken(token)
  if (payload) {
    req.user = payload.user
    req.guilds = payload.guilds || []
    req.token = token
  }
  next()
}

module.exports = {
  createToken,
  verifyToken,
  extractToken,
  requireAuth,
  requireOwner,
  requireGuildAdmin,
  optionalAuth,
}
