// ══════════════════════════════════════════════════════════════════
//  TICKETS COMMAND — SHARED HELPERS
//  يُستخدم من قبل كل الـ handlers في هذا المجلد
//  ملاحظة: الملف يبدأ بـ _ ليتم تجاهله من قبل commandHandler
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════
//  COLORS
// ══════════════════════════════════════
const COLORS = {
  success:  0x22c55e,
  danger:   0xef4444,
  warning:  0xf59e0b,
  info:     0x3b82f6,
  neutral:  0x5865f2
}

// ══════════════════════════════════════
//  تحويل \n النصي إلى سطر جديد حقيقي
// ══════════════════════════════════════
function parseMessage(str) {
  if (!str) return null
  return str.replace(/\\n/g, "\n")
}

module.exports = {
  COLORS,
  parseMessage
}