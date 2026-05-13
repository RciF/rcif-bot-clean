// ══════════════════════════════════════════════════════════════════
//  GIVEAWAY COMMAND — SHARED HELPERS
//  المسار: commands/giveaway/_shared.js
// ══════════════════════════════════════════════════════════════════

const COLORS = {
  success: 0x22c55e,
  danger:  0xef4444,
  warning: 0xf59e0b,
  info:    0x3b82f6
}

// ─── parser للمدة: 1d, 12h, 30m, 1h30m ───
function parseDuration(input) {
  if (!input || typeof input !== "string") return null
  const str = input.trim().toLowerCase()
  if (!str) return null

  // أنماط مدعومة: 1d, 12h, 30m, 1h30m, 2d4h
  const regex = /(\d+)\s*([dhms])/g
  let total = 0
  let matched = false
  let match

  while ((match = regex.exec(str)) !== null) {
    matched = true
    const value = parseInt(match[1])
    const unit = match[2]
    if (!isFinite(value) || value < 0) continue

    if (unit === "d") total += value * 24 * 60 * 60 * 1000
    else if (unit === "h") total += value * 60 * 60 * 1000
    else if (unit === "m") total += value * 60 * 1000
    else if (unit === "s") total += value * 1000
  }

  if (!matched) {
    // محاولة: رقم فقط = دقائق
    const n = parseInt(str)
    if (isFinite(n) && n > 0) total = n * 60 * 1000
  }

  if (total <= 0) return null
  return total
}

function formatDuration(ms) {
  const total = Math.floor(ms / 1000)
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)

  const parts = []
  if (days > 0) parts.push(`${days} يوم`)
  if (hours > 0) parts.push(`${hours} ساعة`)
  if (minutes > 0) parts.push(`${minutes} دقيقة`)
  return parts.join(" و ") || "أقل من دقيقة"
}

module.exports = {
  COLORS,
  parseDuration,
  formatDuration
}