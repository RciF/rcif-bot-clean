// ══════════════════════════════════════════════════════════════════
//  ANNOUNCE COMMAND — SHARED HELPERS
//  يُستخدم من قبل كل الـ handlers في هذا المجلد
//  ملاحظة: الملف يبدأ بـ _ ليتم تجاهله من قبل commandHandler
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════
//  COLOR PALETTE
// ══════════════════════════════════════
const COLORS = {
  blue:   0x3b82f6,
  green:  0x22c55e,
  red:    0xef4444,
  yellow: 0xeab308,
  purple: 0x8b5cf6,
  orange: 0xf97316,
  pink:   0xec4899,
  cyan:   0x06b6d4,
  gold:   0xfbbf24,
  dark:   0x2b2d31
}

const COLOR_CHOICES = [
  { name: "أزرق | Blue",      value: "blue"   },
  { name: "أخضر | Green",     value: "green"  },
  { name: "أحمر | Red",       value: "red"    },
  { name: "أصفر | Yellow",    value: "yellow" },
  { name: "بنفسجي | Purple",  value: "purple" },
  { name: "برتقالي | Orange", value: "orange" },
  { name: "وردي | Pink",      value: "pink"   },
  { name: "سماوي | Cyan",     value: "cyan"   },
  { name: "ذهبي | Gold",      value: "gold"   },
  { name: "داكن | Dark",      value: "dark"   }
]

// ══════════════════════════════════════
//  URL VALIDATION
// ══════════════════════════════════════
function isValidUrl(str) {
  try {
    const url = new URL(str)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

module.exports = {
  COLORS,
  COLOR_CHOICES,
  isValidUrl
}