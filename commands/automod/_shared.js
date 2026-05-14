// ══════════════════════════════════════════════════════════════════
//  AutoMod Command — Shared
//  المسار: commands/automod/_shared.js
// ══════════════════════════════════════════════════════════════════

const COLORS = {
  success: 0x22c55e,
  danger:  0xef4444,
  warning: 0xf59e0b,
  info:    0x3b82f6,
  neutral: 0x6b7280
}

const FILTER_LABELS = {
  bad_words:     "🗣️ الكلمات السيئة",
  links:         "🔗 الروابط",
  invites:       "🎫 دعوات Discord",
  caps:          "🔠 الكابيتال",
  mass_mentions: "@ منشن جماعي",
  emojis:        "😀 الإيموجي الزيادة",
  duplicate:     "🔁 الرسائل المكررة",
  zalgo:         "👹 النصوص المشوهة"
}

const FILTER_KEYS = Object.keys(FILTER_LABELS)

module.exports = {
  COLORS,
  FILTER_LABELS,
  FILTER_KEYS
}