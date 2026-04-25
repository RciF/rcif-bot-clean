// ══════════════════════════════════════════════════════════════════
//  STATS COMMAND — SHARED HELPERS
//  يُستخدم من قبل كل الـ handlers في هذا المجلد
//  ملاحظة: الملف يبدأ بـ _ ليتم تجاهله من قبل commandHandler
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════
//  STAT TYPE CHOICES (مشتركة بين add و remove)
// ══════════════════════════════════════
const STAT_TYPE_CHOICES = [
  { name: "👥 إجمالي الأعضاء",  value: "total_members"  },
  { name: "🟢 الأعضاء المتصلين", value: "online_members" },
  { name: "👤 البشر فقط",        value: "human_members"  },
  { name: "🤖 البوتات",          value: "bot_members"    },
  { name: "💬 القنوات النصية",   value: "text_channels"  },
  { name: "🔊 القنوات الصوتية",  value: "voice_channels" },
  { name: "📡 كل القنوات",       value: "total_channels" },
  { name: "🏷️ الرتب",            value: "roles_count"    },
  { name: "🚀 عدد البوستات",    value: "boost_count"    },
  { name: "💜 مستوى البوست",    value: "boost_level"    }
]

// ══════════════════════════════════════
//  BASIC & EXTRA STATS (لأمر تلقائي)
// ══════════════════════════════════════
const BASIC_STATS = [
  "total_members",
  "boost_count",
  "boost_level",
  "total_channels",
  "roles_count"
]

const EXTRA_STATS = [
  "online_members",
  "human_members",
  "bot_members",
  "text_channels",
  "voice_channels"
]

// ══════════════════════════════════════
//  COLORS
// ══════════════════════════════════════
const COLORS = {
  success: 0x22c55e,
  danger:  0xef4444,
  warning: 0xf59e0b,
  info:    0x3b82f6,
  neutral: 0x5865f2
}

// ══════════════════════════════════════
//  HELPER: شريط التقدم
// ══════════════════════════════════════
function buildBar(percent) {
  const filled = Math.round(percent / 10)
  const empty  = 10 - filled
  return "🟦".repeat(filled) + "⬜".repeat(empty)
}

module.exports = {
  STAT_TYPE_CHOICES,
  BASIC_STATS,
  EXTRA_STATS,
  COLORS,
  buildBar
}