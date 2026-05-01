/**
 * ═══════════════════════════════════════════════════════════
 *  Auth Routes
 *  /api/auth/*
 * ═══════════════════════════════════════════════════════════
 */

const express = require("express")
const rateLimit = require("express-rate-limit")
const { asyncHandler, ApiError } = require("../middleware/error")
const { requireAuth, createToken } = require("../middleware/auth")
const env = require("../config/env")
const discord = require("../utils/discord")

const router = express.Router()

// ── Rate limit لـ auth خاصة ──
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX,
  message: { error: "تجاوزت الحد المسموح من محاولات الدخول", code: "AUTH_RATE_LIMIT" },
})

// ════════════════════════════════════════════════════════════
//  GET /api/auth/callback
//  تبادل code من Discord OAuth بـ JWT token
// ════════════════════════════════════════════════════════════

router.get(
  "/callback",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { code } = req.query
    const redirectUri = req.query.redirect_uri || env.DEFAULT_REDIRECT_URI

    if (!code) {
      throw new ApiError("لم يتم توفير code", 400, "MISSING_CODE")
    }

    // فحص إن الـ redirect_uri مسموح به
    if (!env.ALLOWED_REDIRECT_URIS.includes(redirectUri)) {
      console.warn(`[AUTH] Rejected redirect_uri: ${redirectUri}`)
      throw new ApiError("Redirect URI غير مسموح", 400, "INVALID_REDIRECT")
    }

    // 1. تبادل code → access_token
    let tokenData
    try {
      tokenData = await discord.exchangeCodeForToken(code, redirectUri)
    } catch (err) {
      console.error("[AUTH] Token exchange failed:", err.payload || err.message)
      throw new ApiError(
        "فشل تبادل الـ token مع Discord",
        400,
        "TOKEN_EXCHANGE_FAILED",
      )
    }

    // 2. جلب بيانات المستخدم وسيرفراته
    const [user, allGuilds] = await Promise.all([
      discord.fetchUserMe(tokenData.access_token),
      discord.fetchUserGuilds(tokenData.access_token),
    ])

    // 3. فلترة السيرفرات اللي عنده فيها صلاحية Admin (permission = 8)
    const adminGuilds = allGuilds.filter(
      (g) => (BigInt(g.permissions) & 8n) === 8n,
    )

    // 4. تحضير بيانات الـ response
    const userData = {
      id: user.id,
      username: user.global_name || user.username,
      avatar: discord.getUserAvatarUrl(user),
      isOwner: user.id === env.OWNER_ID,
    }

    const guildsData = adminGuilds.map((g) => ({
      id: g.id,
      name: g.name,
      icon: discord.getGuildIconUrl(g),
      permissions: g.permissions.toString(),
    }))

    // 5. إنشاء JWT token
    const token = createToken({
      user: userData,
      guilds: guildsData,
    })

    res.json({
      success: true,
      token,
      user: userData,
      guilds: guildsData,
    })
  }),
)

// ════════════════════════════════════════════════════════════
//  GET /api/auth/me
//  جلب معلومات المستخدم الحالي (من الـ JWT)
// ════════════════════════════════════════════════════════════

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({
      user: req.user,
      guilds: req.guilds,
    })
  }),
)

// ════════════════════════════════════════════════════════════
//  POST /api/auth/logout
//  تسجيل خروج (الـ frontend يمسح الـ token)
// ════════════════════════════════════════════════════════════

router.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    // مع JWT ما نحتاج نسوي شي في الباك اند
    // (مستقبلاً: نضيف blacklist لو احتجنا)
    res.json({ success: true })
  }),
)

// ════════════════════════════════════════════════════════════
//  GET /api/auth/refresh
//  تجديد الـ token (يستخدم session أو refresh_token)
// ════════════════════════════════════════════════════════════

router.post(
  "/refresh",
  requireAuth,
  asyncHandler(async (req, res) => {
    // ننشئ token جديد بنفس البيانات
    const newToken = createToken({
      user: req.user,
      guilds: req.guilds,
    })
    res.json({ token: newToken })
  }),
)

module.exports = router
