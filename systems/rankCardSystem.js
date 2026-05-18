// ══════════════════════════════════════════════════════════════════
//  RANK CARD SYSTEM v2.0
//  المسار: systems/rankCardSystem.js
//
//  ✨ نظام رسم بطاقة المستوى مع دعم:
//   - النظام القديم (theme_color + background_url) — للتوافق
//   - النظام الجديد (theme_id + background_id + badges + effects + tier)
//
//  الإضافات الجديدة:
//   - Tier badges: شارة الفئة (basic/advanced/legendary)
//   - User badges: حتى 10 شارات للمستخدم
//   - Effects: Glow, Gradient, Pulse, Shine
//   - Border styles: 5 أنماط
// ══════════════════════════════════════════════════════════════════

const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas")
const path = require("path")
const {
  getTheme,
  getThemeById,
  getBackgroundById,
  getBadgeById,
  getEffectById,
} = require("./cardCustomizationSystem")

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

// ─── ألوان وأيقونات الفئات ───
const TIER_BADGE_DATA = {
  basic:     { icon: "🥉", color: "#cd7f32", label: "BASIC" },
  advanced:  { icon: "🥈", color: "#c0c0c0", label: "ADVANCED" },
  legendary: { icon: "👑", color: "#ffd700", label: "LEGEND" },
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

/**
 * استخراج رابط الخلفية النهائي
 * أولوية: custom_background_url → background_id (من المكتبة) → null
 */
function resolveBackgroundUrl(customization) {
  if (!customization) return null

  // أولاً: custom_background_url (للمتقدمة والأسطورية)
  if (customization.custom_background_url) {
    return customization.custom_background_url
  }

  // ثانياً: النظام القديم (background_url)
  if (customization.background_url) {
    return customization.background_url
  }

  // ثالثاً: background_id من مكتبة Assets
  if (customization.background_id && customization.background_id !== "default") {
    const bg = getBackgroundById(customization.background_id)
    if (bg?.url) return bg.url
  }

  return null
}

/**
 * استخراج الثيم النهائي
 * أولوية: custom_colors (إذا كانت موجودة وغير فارغة) → theme_id → theme_color → افتراضي
 */
function resolveTheme(customization) {
  if (!customization) return { ...DEFAULT_THEME }

  // 1. ألوان مخصصة كاملة (Advanced/Legendary)
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

  // 2. theme_id (النظام الجديد)
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

/**
 * تأثير Glow على النص
 */
function applyGlow(ctx, color, intensity = 12) {
  ctx.shadowColor = color
  ctx.shadowBlur = intensity
}

function clearGlow(ctx) {
  ctx.shadowColor = "transparent"
  ctx.shadowBlur = 0
}

/**
 * تأثير Gradient على النص — يرسم النص مرتين (واحدة للـ stroke والثانية للـ gradient fill)
 */
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
//  MAIN FUNCTION — generateRankCard
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
    tier = "free"   // ✨ NEW: فئة المستخدم
  } = data

  // ══════════════════════════════════════
  //  بناء الثيم
  // ══════════════════════════════════════
  const THEME = resolveTheme(customization)

  // ══════════════════════════════════════
  //  استخراج تأثيرات
  // ══════════════════════════════════════
  const effects = (customization?.effects && typeof customization.effects === "object")
    ? customization.effects
    : {}

  const hasGlow     = !!effects.glow
  const hasGradient = !!effects.gradient
  const hasPulse    = !!effects.pulse
  const hasShine    = !!effects.shine

  // ══════════════════════════════════════
  //  Premium indicator
  // ══════════════════════════════════════
  const isPremium = tier !== "free"
  const isLegendary = tier === "legendary"

  // ══════════════════════════════════════
  //  Canvas Setup
  // ══════════════════════════════════════
  const W = 900
  const H = 250
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext("2d")

  // ══════════════════════════════════════
  //  الخلفية الرئيسية
  // ══════════════════════════════════════
  roundRect(ctx, 0, 0, W, H, 20)
  ctx.fillStyle = THEME.bg
  ctx.fill()

  // ══════════════════════════════════════
  //  خلفية مخصصة (Premium)
  // ══════════════════════════════════════
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

      // طبقة شفافية
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)"
      ctx.fillRect(0, 0, W, H)

      ctx.restore()
    } catch {
      // fallback للخلفية الافتراضية
    }
  }

  // ══════════════════════════════════════
  //  البطاقة الداخلية (لو ما في خلفية مخصصة)
  // ══════════════════════════════════════
  if (!backgroundUrl) {
    roundRect(ctx, 10, 10, W - 20, H - 20, 16)
    ctx.fillStyle = THEME.bgCard
    ctx.fill()
  }

  // ══════════════════════════════════════
  //  شريط لوني علوي
  // ══════════════════════════════════════
  const gradTop = ctx.createLinearGradient(10, 10, W - 10, 10)
  gradTop.addColorStop(0, THEME.accent + "99")
  gradTop.addColorStop(1, THEME.accentSecondary + "11")

  roundRect(ctx, 10, 10, W - 20, 4, 2)
  ctx.fillStyle = gradTop
  ctx.fill()

  // ══════════════════════════════════════
  //  الصورة الشخصية
  // ══════════════════════════════════════
  const avatarSize = 130
  const avatarX = 50
  const avatarY = (H - avatarSize) / 2

  // دائرة خلفية
  ctx.beginPath()
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 4, 0, Math.PI * 2)
  ctx.fillStyle = THEME.border
  ctx.fill()

  // pulse effect (هالة حول الصورة)
  if (hasPulse && isPremium) {
    ctx.beginPath()
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 10, 0, Math.PI * 2)
    ctx.strokeStyle = THEME.accent + "55"
    ctx.lineWidth = 3
    ctx.stroke()
  }

  // تحميل الصورة
  const finalAvatarURL = customization?.avatar_url || avatarURL

  try {
    const avatar = await loadImage(
      finalAvatarURL + (customization?.avatar_url ? "" : "?size=256")
    )
    ctx.save()
    ctx.beginPath()
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize)
    ctx.restore()
  } catch {
    // fallback دائرة ملونة
    ctx.beginPath()
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
    ctx.fillStyle = THEME.accent + "44"
    ctx.fill()
    ctx.fillStyle = THEME.accent
    ctx.font = "bold 48px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(username[0].toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2)
  }

  // حلقة الـ rank حول الصورة
  const rankColor = getRankColor(rank, THEME)
  ctx.beginPath()
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 4, 0, Math.PI * 2)
  ctx.strokeStyle = rankColor
  ctx.lineWidth = 3
  ctx.stroke()

  // ══════════════════════════════════════
  //  شارة الفئة (Tier Badge) — على الصورة
  // ══════════════════════════════════════
  if (isPremium && TIER_BADGE_DATA[tier]) {
    const tierData = TIER_BADGE_DATA[tier]
    const badgeX = avatarX + avatarSize - 8
    const badgeY = avatarY + avatarSize - 8
    const badgeR = 16

    // glow حول الشارة للأسطورية
    if (isLegendary) {
      applyGlow(ctx, tierData.color, 15)
    }

    ctx.beginPath()
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2)
    ctx.fillStyle = tierData.color
    ctx.fill()

    clearGlow(ctx)

    // الإطار الخارجي للشارة
    ctx.beginPath()
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2)
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 2
    ctx.stroke()

    // الأيقونة داخل الشارة
    ctx.fillStyle = "#000000"
    ctx.font = "bold 18px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(tierData.icon, badgeX, badgeY)
  }

  // ══════════════════════════════════════
  //  اسم المستخدم
  // ══════════════════════════════════════
  const textStartX = avatarX + avatarSize + 30
  const textTopY = 60

  ctx.font = "bold 32px sans-serif"
  ctx.textAlign = "left"
  ctx.textBaseline = "top"

  // قص الاسم لو طويل
  const maxNameWidth = 320
  let displayName = username
  while (ctx.measureText(displayName).width > maxNameWidth && displayName.length > 3) {
    displayName = displayName.slice(0, -1)
  }
  if (displayName !== username) displayName += "..."

  // ─── تطبيق التأثيرات على الاسم ───
  if (hasGlow && isPremium) {
    applyGlow(ctx, THEME.accent, 14)
  }

  if (hasGradient && isPremium) {
    fillTextGradient(
      ctx,
      displayName,
      textStartX,
      textTopY,
      THEME.accent,
      THEME.accentSecondary
    )
  } else {
    ctx.fillStyle = THEME.text
    ctx.fillText(displayName, textStartX, textTopY)
  }

  clearGlow(ctx)

  // ══════════════════════════════════════
  //  شارات المستخدم (User Badges)
  // ══════════════════════════════════════
  const userBadges = Array.isArray(customization?.badges) ? customization.badges : []

  if (userBadges.length > 0) {
    const badgeStartX = textStartX
    const badgeY = textTopY + 42
    const badgeSize = 22
    const badgeGap = 4

    userBadges.slice(0, 8).forEach((badgeId, idx) => {
      const badgeData = getBadgeById(badgeId)
      if (!badgeData) return

      const x = badgeStartX + idx * (badgeSize + badgeGap)
      const y = badgeY

      // خلفية الشارة
      ctx.beginPath()
      ctx.arc(x + badgeSize / 2, y + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2)
      ctx.fillStyle = badgeData.color || THEME.accent
      ctx.fill()

      // الإطار
      ctx.beginPath()
      ctx.arc(x + badgeSize / 2, y + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(0, 0, 0, 0.4)"
      ctx.lineWidth = 1.5
      ctx.stroke()

      // الأيقونة
      ctx.fillStyle = "#000000"
      ctx.font = "14px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(badgeData.icon || badgeData.emoji || "•", x + badgeSize / 2, y + badgeSize / 2)
    })
  }

  // ══════════════════════════════════════
  //  الترتيب والمستوى (يمين)
  // ══════════════════════════════════════
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

  ctx.fillStyle = THEME.accent
  ctx.font = "bold 36px sans-serif"
  ctx.fillText(`${level}`, rightX - 110, textTopY + 24)

  // ══════════════════════════════════════
  //  شريط التقدم
  // ══════════════════════════════════════
  const barX = textStartX
  const barY = H - 75
  const barW = W - textStartX - 40
  const barH = 22
  const barR = 11

  // خلفية الشريط
  roundRect(ctx, barX, barY, barW, barH, barR)
  ctx.fillStyle = THEME.progressBg
  ctx.fill()

  // تعبئة الشريط
  const fillW = Math.max(barR * 2, Math.floor((progressPercent / 100) * barW))

  // ─── Gradient أو Solid حسب التأثيرات ───
  if (hasGradient && isPremium) {
    // gradient 3-color للأسطورية
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

  // ─── Shine effect (خط ضوئي على شريط التقدم) ───
  if (hasShine && isPremium && fillW > 30) {
    const shineX = barX + fillW * 0.7
    const shineGrad = ctx.createLinearGradient(shineX - 15, 0, shineX + 15, 0)
    shineGrad.addColorStop(0, "rgba(255, 255, 255, 0)")
    shineGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.4)")
    shineGrad.addColorStop(1, "rgba(255, 255, 255, 0)")

    ctx.save()
    roundRect(ctx, barX, barY, fillW, barH, barR)
    ctx.clip()
    ctx.fillStyle = shineGrad
    ctx.fillRect(shineX - 15, barY, 30, barH)
    ctx.restore()
  }

  // نسبة التقدم داخل الشريط
  if (progressPercent > 15) {
    ctx.fillStyle = "#000000aa"
    ctx.font = "bold 12px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(`${progressPercent}%`, barX + fillW / 2, barY + barH / 2)
  }

  // ══════════════════════════════════════
  //  XP النصوص
  // ══════════════════════════════════════
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

  // إجمالي XP
  ctx.fillStyle = THEME.textMuted
  ctx.font = "13px sans-serif"
  ctx.fillText(`إجمالي: ${formatNumber(totalXP)} XP`, barX + barW, barY + barH + 18)

  return canvas.toBuffer("image/png")
}

// ══════════════════════════════════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════════════════════════════════

module.exports = { generateRankCard }