// ══════════════════════════════════════════════════════════════════
//  WELCOME COMMAND — SHARED HELPERS
//  يُستخدم من قبل كل الـ handlers في هذا المجلد
//  ملاحظة: الملف يبدأ بـ _ ليتم تجاهله من قبل commandHandler
// ══════════════════════════════════════════════════════════════════

// ── ألوان الـ Embeds (موحّدة) ──
const COLORS = {
  success: 0x22c55e,
  danger:  0xef4444,
  neutral: 0x95a5a6,
  info:    0x3498db,
  warning: 0xf39c12
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