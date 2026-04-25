// ══════════════════════════════════════════════════════════════════
//  PROTECTION COMMAND — SHARED HELPERS
//  يُستخدم من قبل كل الـ handlers في هذا المجلد
//  ملاحظة: الملف يبدأ بـ _ ليتم تجاهله من قبل commandHandler
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════
//  COLORS
// ══════════════════════════════════════
const COLORS = {
  success: 0x22c55e,
  danger:  0xef4444,
  warning: 0xf59e0b,
  info:    0x3b82f6,
  neutral: 0x64748b,
  purple:  0x8b5cf6
}

// ══════════════════════════════════════
//  ACTION LABEL — تحويل اسم العقوبة لنص عربي
// ══════════════════════════════════════
function actionLabel(action) {
  const map = {
    mute:        "🔇 كتم",
    kick:        "👢 طرد",
    ban:         "🚫 حظر",
    lockdown:    "🔒 قفل السيرفر",
    strip_roles: "🔑 سلب الصلاحيات"
  }
  return map[action] || action
}

module.exports = {
  COLORS,
  actionLabel
}