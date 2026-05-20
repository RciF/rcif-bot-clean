// ══════════════════════════════════════════════════════════════════
//  RANK CARD SYSTEM v3.0
//  المسار: systems/rankCardSystem.js
//
//  ✨ التحسينات في هذه النسخة:
//   - شارات بتصميم gradient + shine + drop shadow + border
//   - Particles effect ثابت (نقاط متناثرة مرسومة)
//   - Glow أقوى وأكثر واقعية
//   - Shine effect ثابت على شريط XP
//   - Pulse effect حقيقي (دوائر متعددة بحجم متدرج)
// ══════════════════════════════════════════════════════════════════

const { createCanvas, loadImage } = require("@napi-rs/canvas")
const GIFEncoder = require("gif-encoder-2")
const {
  getTheme,
  getThemeById,
  getBackgroundById,
  getBadgeById,
  getEffectById,
} = require("./cardCustomizationSystem")

// ─── GIF Settings ───
const GIF_FRAMES = 16
const GIF_DELAY = 80
const GIF_QUALITY = 10
const gifCache = new Map()
const GIF_CACHE_TTL = 5 * 60_000

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of gifCache.entries()) {
    if (now - entry.createdAt > GIF_CACHE_TTL) gifCache.delete(key)
  }
}, 60_000)

// ══════════════════════════════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════════════════════════════

const DEFAULT_THEME = {
  bg: "#0d1117",
  bgCard: "#161b22",
  accent: "#f59e0b",
  accentSecondary: "#fbbf24",
  text: "#e6edf3",
  textMuted: "#8b949e",
  progressBg: "#21262d",
  progressFill: "#f59e0b",
  border: "#30363d",
  rankGold: "#fbbf24",
  rankSilver: "#94a3b8",
  rankBronze: "#c47c2b"
}

const TIER_BADGE_DATA = {
  basic:     { icon: "🥉", color: "#cd7f32", glowColor: "rgba(205, 127, 50, 0.5)" },
  advanced:  { icon: "🥈", color: "#c0c0c0", glowColor: "rgba(192, 192, 192, 0.6)" },
  legendary: { icon: "👑", color: "#ffd700", glowColor: "rgba(255, 215, 0, 0.8)" }
}

// ══════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════

function getRankColor(rank, theme) {
  if (rank === 1) return theme.rankGold
  if (rank === 2) return theme.rankSilver
  if (rank === 3) return theme.rankBronze
  return theme.accent
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
  if (num >= 1000) return (num / 1000).toFixed(1) + "K"
  return num.toString()
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function resolveBackgroundUrl(customization) {
  if (!customization) return null
  if (customization.custom_background_url) return customization.custom_background_url
  if (customization.background_url) return customization.background_url
  if (customization.background_id && customization.background_id !== "default") {
    const bg = getBackgroundById(customization.background_id)
    if (bg?.url) return bg.url
  }
  return null
}

function resolveTheme(customization) {
  if (!customization) return { ...DEFAULT_THEME }

  if (customization.custom_colors && typeof customization.custom_colors === "object") {
    const cc = customization.custom_colors
    if (cc.accent || cc.bg || cc.bgCard) {
      return {
        ...DEFAULT_THEME,
        accent: cc.accent || DEFAULT_THEME.accent,
        accentSecondary: cc.secondary || cc.accent || DEFAULT_THEME.accentSecondary,
        bg: cc.bg || DEFAULT_THEME.bg,
        bgCard: cc.bgCard || DEFAULT_THEME.bgCard,
        progressFill: cc.accent || DEFAULT_THEME.progressFill,
        text: cc.text || DEFAULT_THEME.text,
      }
    }
  }

  const themeKey = customization.theme_id || customization.theme_color

  if (themeKey && themeKey !== "amber") {
    const themeColors = getTheme(themeKey)
    if (themeColors) {
      return {
        ...DEFAULT_THEME,
        bg: themeColors.bg,
        bgCard: themeColors.bgCard,
        accent: themeColors.accent,
        accentSecondary: themeColors.secondary,
        progressFill: themeColors.accent,
      }
    }
  }

  return { ...DEFAULT_THEME }
}

// ══════════════════════════════════════════════════════════════════
//  EFFECT RENDERERS
// ══════════════════════════════════════════════════════════════════

function applyGlow(ctx, color, intensity = 12) {
  ctx.shadowColor = color
  ctx.shadowBlur = intensity
}

function clearGlow(ctx) {
  ctx.shadowColor = "transparent"
  ctx.shadowBlur = 0
}

function fillTextGradient(ctx, text, x, y, color1, color2) {
  const metrics = ctx.measureText(text)
  const w = metrics.width
  const gradient = ctx.createLinearGradient(x, y, x + w, y)
  gradient.addColorStop(0, color1)
  gradient.addColorStop(1, color2)
  ctx.fillStyle = gradient
  ctx.fillText(text, x, y)
}

// ══════════════════════════════════════════════════════════════════
//  ✨ PARTICLES EFFECT (ثابت - مرسوم على الـ canvas)
// ══════════════════════════════════════════════════════════════════

function drawParticles(ctx, theme, width, height) {
  ctx.save()

  const particles = [
    { x: 220, y: 25,  size: 2.5, opacity: 0.7 },
    { x: 350, y: 18,  size: 1.8, opacity: 0.5 },
    { x: 480, y: 35,  size: 3,   opacity: 0.8 },
    { x: 580, y: 22,  size: 2,   opacity: 0.6 },
    { x: 700, y: 30,  size: 2.5, opacity: 0.7 },
    { x: 820, y: 20,  size: 1.5, opacity: 0.4 },
    { x: 270, y: 215, size: 2,   opacity: 0.5 },
    { x: 420, y: 225, size: 2.5, opacity: 0.6 },
    { x: 560, y: 218, size: 1.8, opacity: 0.5 },
    { x: 680, y: 228, size: 2.2, opacity: 0.7 },
    { x: 810, y: 220, size: 2,   opacity: 0.5 },
    { x: 380, y: 145, size: 1.5, opacity: 0.4 },
    { x: 620, y: 155, size: 2,   opacity: 0.5 },
    { x: 750, y: 140, size: 1.8, opacity: 0.5 }
  ]

  for (const p of particles) {
    // ضوء حول النقطة
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
    gradient.addColorStop(0, theme.accent + "ff")
    gradient.addColorStop(1, theme.accent + "00")
    ctx.fillStyle = gradient
    ctx.globalAlpha = p.opacity
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
    ctx.fill()

    // النقطة نفسها
    ctx.globalAlpha = p.opacity * 1.5
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

// ══════════════════════════════════════════════════════════════════
//  ✨ PULSE EFFECT (هالات متعددة حول الصورة)
// ══════════════════════════════════════════════════════════════════

function drawPulse(ctx, cx, cy, baseRadius, color) {
  ctx.save()

  // 3 هالات متدرجة
  const layers = [
    { offset: 6,  opacity: 0.5, width: 2 },
    { offset: 12, opacity: 0.3, width: 1.5 },
    { offset: 18, opacity: 0.15, width: 1 }
  ]

  for (const layer of layers) {
    ctx.beginPath()
    ctx.arc(cx, cy, baseRadius + layer.offset, 0, Math.PI * 2)
    ctx.strokeStyle = color
    ctx.lineWidth = layer.width
    ctx.globalAlpha = layer.opacity
    ctx.stroke()
  }

  ctx.restore()
}

// ══════════════════════════════════════════════════════════════════
//  ✨ ENHANCED BADGE DRAWING (تصميم أسطوري)
// ══════════════════════════════════════════════════════════════════

function drawEnhancedBadge(ctx, x, y, size, badgeData) {
  ctx.save()

  const cx = x + size / 2
  const cy = y + size / 2

  // ─── 1. Outer Glow Halo ───
  const haloGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 1.2)
  haloGrad.addColorStop(0, badgeData.color + "40")
  haloGrad.addColorStop(0.5, badgeData.color + "20")
  haloGrad.addColorStop(1, badgeData.color + "00")
  ctx.fillStyle = haloGrad
  ctx.beginPath()
  ctx.arc(cx, cy, size * 1.2, 0, Math.PI * 2)
  ctx.fill()

  // ─── 2. Drop Shadow ───
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)"
  ctx.shadowBlur = 4
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 2

  // ─── 3. Main Badge Circle مع Gradient ───
  const badgeGrad = ctx.createRadialGradient(cx - size * 0.2, cy - size * 0.2, 0, cx, cy, size / 2)
  badgeGrad.addColorStop(0, lightenColor(badgeData.color, 20))
  badgeGrad.addColorStop(0.6, badgeData.color)
  badgeGrad.addColorStop(1, darkenColor(badgeData.color, 15))

  ctx.fillStyle = badgeGrad
  ctx.beginPath()
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
  ctx.fill()

  // ─── إيقاف shadow ───
  ctx.shadowColor = "transparent"
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0

  // ─── 4. Inner Shine (highlight) ───
  const shineGrad = ctx.createRadialGradient(
    cx - size * 0.25,
    cy - size * 0.25,
    0,
    cx - size * 0.25,
    cy - size * 0.25,
    size * 0.6
  )
  shineGrad.addColorStop(0, "rgba(255, 255, 255, 0.5)")
  shineGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.1)")
  shineGrad.addColorStop(1, "rgba(255, 255, 255, 0)")
  ctx.fillStyle = shineGrad
  ctx.beginPath()
  ctx.arc(cx, cy, size / 2 - 1, 0, Math.PI * 2)
  ctx.fill()

  // ─── 5. Border ───
  ctx.strokeStyle = "rgba(0, 0, 0, 0.45)"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
  ctx.stroke()

  // ─── 6. Emoji/Icon ───
  ctx.fillStyle = "#000000"
  ctx.font = `bold ${size * 0.55}px sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(badgeData.icon || badgeData.emoji || "•", cx, cy + 1)

  ctx.restore()
}

// ─── Helper: تفتيح/تغميق اللون ───
function lightenColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16)
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(255 * (percent / 100)))
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * (percent / 100)))
  const b = Math.min(255, (num & 0xff) + Math.round(255 * (percent / 100)))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
}

function darkenColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16)
  const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(255 * (percent / 100)))
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(255 * (percent / 100)))
  const b = Math.max(0, (num & 0xff) - Math.round(255 * (percent / 100)))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
}

// ══════════════════════════════════════════════════════════════════
//  ✨ TIER BADGE (الشارة الكبيرة على الصورة)
// ══════════════════════════════════════════════════════════════════

function drawTierBadge(ctx, x, y, tier) {
  const tierData = TIER_BADGE_DATA[tier]
  if (!tierData) return

  const isLegendary = tier === "legendary"
  const size = 18
  const cx = x
  const cy = y

  ctx.save()

  // ─── Outer glow (أقوى للأسطورية) ───
  if (isLegendary) {
    for (let i = 3; i > 0; i--) {
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size + i * 4)
      grad.addColorStop(0, tierData.color + "00")
      grad.addColorStop(0.5, tierData.color + Math.floor(80 / i).toString(16).padStart(2, "0"))
      grad.addColorStop(1, tierData.color + "00")
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(cx, cy, size + i * 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ─── Drop shadow ───
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)"
  ctx.shadowBlur = 6
  ctx.shadowOffsetY = 2

  // ─── الدائرة الأساسية مع gradient ───
  const grad = ctx.createRadialGradient(cx - 5, cy - 5, 0, cx, cy, size)
  grad.addColorStop(0, lightenColor(tierData.color, 25))
  grad.addColorStop(0.7, tierData.color)
  grad.addColorStop(1, darkenColor(tierData.color, 20))
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(cx, cy, size, 0, Math.PI * 2)
  ctx.fill()

  // ─── Reset shadow ───
  ctx.shadowColor = "transparent"
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  // ─── Inner shine ───
  const shine = ctx.createRadialGradient(cx - 6, cy - 6, 0, cx - 6, cy - 6, size * 0.9)
  shine.addColorStop(0, "rgba(255, 255, 255, 0.6)")
  shine.addColorStop(1, "rgba(255, 255, 255, 0)")
  ctx.fillStyle = shine
  ctx.beginPath()
  ctx.arc(cx, cy, size - 1, 0, Math.PI * 2)
  ctx.fill()

  // ─── Border ───
  ctx.strokeStyle = "rgba(0, 0, 0, 0.55)"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, size, 0, Math.PI * 2)
  ctx.stroke()

  // ─── Icon ───
  ctx.fillStyle = "#000"
  ctx.font = "bold 22px sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(tierData.icon, cx, cy + 1)

  ctx.restore()
}

// ══════════════════════════════════════════════════════════════════
//  MAIN FUNCTION
// ══════════════════════════════════════════════════════════════════

async function generateRankCard(data) {
  const {
    username,
    discriminator,
    avatarURL,
    level,
    rank,
    currentXP,
    requiredXP,
    totalXP,
    progressPercent,
    customization = null,
    tier = "free"
  } = data

  const THEME = resolveTheme(customization)

  const effects = (customization?.effects && typeof customization.effects === "object")
    ? customization.effects
    : {}

  const hasGlow      = !!effects.glow
  const hasGradient  = !!effects.gradient
  const hasPulse     = !!effects.pulse
  const hasShine     = !!effects.shine
  const hasParticles = !!effects.particles

  const isPremium = tier !== "free"
  const isLegendary = tier === "legendary"

  // Canvas
  const W = 900
  const H = 250
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext("2d")

  // ─── الخلفية ───
  roundRect(ctx, 0, 0, W, H, 20)
  ctx.fillStyle = THEME.bg
  ctx.fill()

  // ─── خلفية مخصصة ───
  const backgroundUrl = resolveBackgroundUrl(customization)
  if (backgroundUrl) {
    try {
      const bgImage = await loadImage(backgroundUrl)
      ctx.save()
      roundRect(ctx, 0, 0, W, H, 20)
      ctx.clip()

      const imgRatio = bgImage.width / bgImage.height
      const canvasRatio = W / H

      let drawW, drawH, drawX, drawY
      if (imgRatio > canvasRatio) {
        drawH = H
        drawW = H * imgRatio
        drawX = (W - drawW) / 2
        drawY = 0
      } else {
        drawW = W
        drawH = W / imgRatio
        drawX = 0
        drawY = (H - drawH) / 2
      }

      ctx.drawImage(bgImage, drawX, drawY, drawW, drawH)
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)"
      ctx.fillRect(0, 0, W, H)
      ctx.restore()
    } catch {}
  }

  if (!backgroundUrl) {
    roundRect(ctx, 10, 10, W - 20, H - 20, 16)
    ctx.fillStyle = THEME.bgCard
    ctx.fill()
  }

  // ─── شريط لوني علوي ───
  const gradTop = ctx.createLinearGradient(10, 10, W - 10, 10)
  gradTop.addColorStop(0, THEME.accent + "99")
  gradTop.addColorStop(1, THEME.accentSecondary + "11")
  roundRect(ctx, 10, 10, W - 20, 4, 2)
  ctx.fillStyle = gradTop
  ctx.fill()

  // ═══════════════════════════════════════════
  //  ✨ Particles Effect (ثابت)
  // ═══════════════════════════════════════════
  if (hasParticles && isPremium) {
    drawParticles(ctx, THEME, W, H)
  }

  // ─── الصورة الشخصية ───
  const avatarSize = 130
  const avatarX = 50
  const avatarY = (H - avatarSize) / 2
  const avatarCx = avatarX + avatarSize / 2
  const avatarCy = avatarY + avatarSize / 2

  // دائرة خلفية
  ctx.beginPath()
  ctx.arc(avatarCx, avatarCy, avatarSize / 2 + 4, 0, Math.PI * 2)
  ctx.fillStyle = THEME.border
  ctx.fill()

  // ═══════════════════════════════════════════
  //  ✨ Pulse Effect (هالات متعددة)
  // ═══════════════════════════════════════════
  if (hasPulse && isPremium) {
    drawPulse(ctx, avatarCx, avatarCy, avatarSize / 2 + 4, THEME.accent)
  }

  // تحميل الصورة
  const finalAvatarURL = customization?.avatar_url || avatarURL
  try {
    const avatar = await loadImage(
      finalAvatarURL + (customization?.avatar_url ? "" : "?size=256")
    )
    ctx.save()
    ctx.beginPath()
    ctx.arc(avatarCx, avatarCy, avatarSize / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize)
    ctx.restore()
  } catch {
    ctx.beginPath()
    ctx.arc(avatarCx, avatarCy, avatarSize / 2, 0, Math.PI * 2)
    ctx.fillStyle = THEME.accent + "44"
    ctx.fill()
    ctx.fillStyle = THEME.accent
    ctx.font = "bold 48px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(username[0].toUpperCase(), avatarCx, avatarCy)
  }

  // حلقة الـ rank
  const rankColor = getRankColor(rank, THEME)
  ctx.beginPath()
  ctx.arc(avatarCx, avatarCy, avatarSize / 2 + 4, 0, Math.PI * 2)
  ctx.strokeStyle = rankColor
  ctx.lineWidth = 3
  ctx.stroke()

  // ═══════════════════════════════════════════
  //  ✨ شارة الفئة (محسّنة)
  // ═══════════════════════════════════════════
  if (isPremium && TIER_BADGE_DATA[tier]) {
    drawTierBadge(ctx, avatarX + avatarSize - 8, avatarY + avatarSize - 8, tier)
  }

  // ─── اسم المستخدم ───
  const textStartX = avatarX + avatarSize + 30
  const textTopY = 60

  ctx.font = "bold 32px sans-serif"
  ctx.textAlign = "left"
  ctx.textBaseline = "top"

  const maxNameWidth = 320
  let displayName = username
  while (ctx.measureText(displayName).width > maxNameWidth && displayName.length > 3) {
    displayName = displayName.slice(0, -1)
  }
  if (displayName !== username) displayName += "..."

  if (hasGlow && isPremium) {
    applyGlow(ctx, THEME.accent, 18)
  }

  if (hasGradient && isPremium) {
    fillTextGradient(ctx, displayName, textStartX, textTopY, THEME.accent, THEME.accentSecondary)
  } else {
    ctx.fillStyle = THEME.text
    ctx.fillText(displayName, textStartX, textTopY)
  }

  clearGlow(ctx)

  // ═══════════════════════════════════════════
  //  ✨ شارات المستخدم (محسّنة)
  // ═══════════════════════════════════════════
  const userBadges = Array.isArray(customization?.badges) ? customization.badges : []

  if (userBadges.length > 0) {
    const badgeStartX = textStartX
    const badgeY = textTopY + 50
    const badgeSize = 26
    const badgeGap = 8

    userBadges.slice(0, 8).forEach((badgeId, idx) => {
      const badgeData = getBadgeById(badgeId)
      if (!badgeData) return

      const x = badgeStartX + idx * (badgeSize + badgeGap)
      drawEnhancedBadge(ctx, x, badgeY, badgeSize, badgeData)
    })
  }

  // ─── الترتيب والمستوى (يمين) ───
  const rightX = W - 40

  ctx.textAlign = "right"
  ctx.fillStyle = THEME.textMuted
  ctx.font = "18px sans-serif"
  ctx.fillText("الترتيب", rightX, textTopY)

  ctx.fillStyle = rankColor
  ctx.font = "bold 36px sans-serif"
  ctx.fillText(`#${rank}`, rightX, textTopY + 24)

  ctx.fillStyle = THEME.textMuted
  ctx.font = "18px sans-serif"
  ctx.fillText("المستوى", rightX - 110, textTopY)

  if (hasGlow && isPremium) {
    applyGlow(ctx, THEME.accent, 14)
  }
  ctx.fillStyle = THEME.accent
  ctx.font = "bold 36px sans-serif"
  ctx.fillText(`${level}`, rightX - 110, textTopY + 24)
  clearGlow(ctx)

  // ─── شريط التقدم ───
  const barX = textStartX
  const barY = H - 75
  const barW = W - textStartX - 40
  const barH = 22
  const barR = 11

  roundRect(ctx, barX, barY, barW, barH, barR)
  ctx.fillStyle = THEME.progressBg
  ctx.fill()

  const fillW = Math.max(barR * 2, Math.floor((progressPercent / 100) * barW))

  if (hasGradient && isPremium) {
    const gradBar = ctx.createLinearGradient(barX, barY, barX + fillW, barY)
    gradBar.addColorStop(0, THEME.accent)
    gradBar.addColorStop(0.5, THEME.accentSecondary)
    gradBar.addColorStop(1, THEME.accent)
    ctx.fillStyle = gradBar
  } else {
    const gradBar = ctx.createLinearGradient(barX, barY, barX + fillW, barY)
    gradBar.addColorStop(0, THEME.accent)
    gradBar.addColorStop(1, THEME.accentSecondary)
    ctx.fillStyle = gradBar
  }

  roundRect(ctx, barX, barY, fillW, barH, barR)
  ctx.fill()

  // ═══════════════════════════════════════════
  //  ✨ Shine effect (ثابت - مع gradient ناعم)
  // ═══════════════════════════════════════════
  if (hasShine && isPremium && fillW > 30) {
    const shineX = barX + fillW * 0.7
    const shineGrad = ctx.createLinearGradient(shineX - 25, 0, shineX + 25, 0)
    shineGrad.addColorStop(0, "rgba(255, 255, 255, 0)")
    shineGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.5)")
    shineGrad.addColorStop(1, "rgba(255, 255, 255, 0)")

    ctx.save()
    roundRect(ctx, barX, barY, fillW, barH, barR)
    ctx.clip()
    ctx.fillStyle = shineGrad
    ctx.fillRect(shineX - 25, barY, 50, barH)
    ctx.restore()
  }

  // ─── نسبة التقدم ───
  if (progressPercent > 15) {
    ctx.fillStyle = "#000000aa"
    ctx.font = "bold 12px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(`${progressPercent}%`, barX + fillW / 2, barY + barH / 2)
  }

  // ─── XP labels ───
  ctx.textAlign = "left"
  ctx.textBaseline = "bottom"
  ctx.fillStyle = THEME.textMuted
  ctx.font = "15px sans-serif"
  ctx.fillText("XP", barX, barY - 6)

  ctx.textAlign = "right"
  ctx.fillStyle = THEME.text
  ctx.font = "bold 15px sans-serif"
  ctx.fillText(
    `${formatNumber(currentXP)} / ${formatNumber(requiredXP)}`,
    barX + barW,
    barY - 6
  )

  ctx.fillStyle = THEME.textMuted
  ctx.font = "13px sans-serif"
  ctx.fillText(`إجمالي: ${formatNumber(totalXP)} XP`, barX + barW, barY + barH + 18)

  return canvas.toBuffer("image/png")
}

// ══════════════════════════════════════════════════════════════════
//  ✨ GENERATE GIF (للأسطورية فقط)
// ══════════════════════════════════════════════════════════════════

async function generateRankCardGIF(data) {
  // ─── فحص الـ cache ───
  const cacheKey = JSON.stringify({
    u: data.username,
    l: data.level,
    r: data.rank,
    p: data.progressPercent,
    c: data.customization,
    t: data.tier,
  })

  const cached = gifCache.get(cacheKey)
  if (cached && Date.now() - cached.createdAt < GIF_CACHE_TTL) {
    return cached.buffer
  }

  const W = 900
  const H = 250

  // ─── إعداد GIF Encoder (gif-encoder-2) ───
  const encoder = new GIFEncoder(W, H, "neuquant", true)
  encoder.setDelay(GIF_DELAY)
  encoder.setQuality(GIF_QUALITY)
  encoder.setRepeat(0)
  encoder.start()

  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext("2d")

  // ─── توليد frames ───
  for (let frame = 0; frame < GIF_FRAMES; frame++) {
    ctx.clearRect(0, 0, W, H)

    // animation phase
    const animProgress = frame / GIF_FRAMES
    const halfSine = Math.sin(animProgress * Math.PI)

    // عدّل البيانات قليلاً لكل frame (للحركة)
    const frameData = {
      ...data,
      _animFrame: frame,
      _animTotal: GIF_FRAMES,
      _animProgress: animProgress,
      _halfSine: halfSine,
    }

    // ارسم الـ frame باستخدام generateRankCard internal logic
    const frameBuffer = await generateRankCard(frameData)
    const frameImg = await loadImage(frameBuffer)
    ctx.drawImage(frameImg, 0, 0)

    encoder.addFrame(ctx)
  }

  encoder.finish()
  const buffer = encoder.out.getData()

  // ─── حفظ في الـ cache ───
  gifCache.set(cacheKey, {
    buffer,
    createdAt: Date.now(),
  })

  // تنظيف الـ cache لو كبر
  if (gifCache.size > 100) {
    const oldestKey = gifCache.keys().next().value
    gifCache.delete(oldestKey)
  }

  return buffer
}

module.exports = {
  generateRankCard,
  generateRankCardGIF,
}