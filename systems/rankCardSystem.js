const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas")
const path = require("path")
const { getTheme } = require("./cardCustomizationSystem")

// ✅ ألوان الثيم الافتراضية
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

// ✅ حساب لون الرتبة
function getRankColor(rank, theme) {
  if (rank === 1) return theme.rankGold
  if (rank === 2) return theme.rankSilver
  if (rank === 3) return theme.rankBronze
  return theme.accent
}

// ✅ اختصار الأرقام الكبيرة
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
  if (num >= 1000) return (num / 1000).toFixed(1) + "K"
  return num.toString()
}

// ✅ رسم مستطيل بزوايا دائرية
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
    customization = null
  } = data

  // ══════════════════════════════════════
  //  بناء الثيم (افتراضي أو مخصص)
  // ══════════════════════════════════════
  let THEME = { ...DEFAULT_THEME }
  let isPremium = false

  if (customization?.theme_color && customization.theme_color !== "amber") {
    const customTheme = getTheme(customization.theme_color)
    THEME = {
      ...DEFAULT_THEME,
      bg: customTheme.bg,
      bgCard: customTheme.bgCard,
      accent: customTheme.accent,
      accentSecondary: customTheme.secondary,
      progressFill: customTheme.accent,
    }
    isPremium = true
  }

  if (customization?.background_url || customization?.avatar_url) {
    isPremium = true
  }

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
  if (customization?.background_url) {
    try {
      const bgImage = await loadImage(customization.background_url)

      // قص وتمدد الصورة لتملأ البطاقة مع الحفاظ على النسبة
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

      // طبقة شفافية فوق الخلفية عشان النص يقرأ
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)"
      ctx.fillRect(0, 0, W, H)

      ctx.restore()
    } catch {
      // fallback للخلفية الافتراضية
    }
  }

  // ══════════════════════════════════════
  //  البطاقة الداخلية
  // ══════════════════════════════════════
  if (!customization?.background_url) {
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

  // دائرة الخلفية للصورة
  ctx.beginPath()
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 4, 0, Math.PI * 2)
  ctx.fillStyle = THEME.border
  ctx.fill()

  // تحميل الصورة (مخصصة أو Discord)
  const finalAvatarURL = customization?.avatar_url || avatarURL

  try {
    const avatar = await loadImage(finalAvatarURL + (customization?.avatar_url ? "" : "?size=256"))
    ctx.save()
    ctx.beginPath()
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize)
    ctx.restore()
  } catch {
    // Fallback دائرة ملونة
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
  //  شارة Premium (لو مخصص)
  // ══════════════════════════════════════
  if (isPremium) {
    const badgeX = avatarX + avatarSize - 8
    const badgeY = avatarY + avatarSize - 8
    const badgeR = 14

    ctx.beginPath()
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2)
    ctx.fillStyle = THEME.accent
    ctx.fill()

    ctx.fillStyle = "#000000"
    ctx.font = "bold 14px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("✦", badgeX, badgeY)
  }

  // ══════════════════════════════════════
  //  اسم المستخدم
  // ══════════════════════════════════════
  const textStartX = avatarX + avatarSize + 30
  const textTopY = 60

  ctx.fillStyle = THEME.text
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

  ctx.fillText(displayName, textStartX, textTopY)

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

  const gradBar = ctx.createLinearGradient(barX, barY, barX + fillW, barY)
  gradBar.addColorStop(0, THEME.accent)
  gradBar.addColorStop(1, THEME.accentSecondary)

  roundRect(ctx, barX, barY, fillW, barH, barR)
  ctx.fillStyle = gradBar
  ctx.fill()

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
  ctx.fillText(`${formatNumber(currentXP)} / ${formatNumber(requiredXP)}`, barX + barW, barY - 6)

  // إجمالي XP
  ctx.fillStyle = THEME.textMuted
  ctx.font = "13px sans-serif"
  ctx.fillText(`إجمالي: ${formatNumber(totalXP)} XP`, barX + barW, barY + barH + 18)

  return canvas.toBuffer("image/png")
}

module.exports = { generateRankCard }
