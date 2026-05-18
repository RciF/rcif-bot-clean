// ══════════════════════════════════════════════════════════════════
//  CARD ASSETS LIBRARY
//  المسار: config/cardAssets.js
//
//  مكتبة كل الموارد المتاحة للبطاقة:
//   - الخلفيات الجاهزة (15)
//   - الثيمات الكاملة (12)
//   - الشارات (10)
//   - التأثيرات (6)
//
//  كل عنصر يحدد الفئة الدنيا المطلوبة (minTier)
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
//  BACKGROUNDS (15 خلفية)
// ══════════════════════════════════════════════════════════════════

const BACKGROUNDS = [
  // ─── Basic (10 خلفيات للأساسية وما فوقها) ───
  {
    id: "default",
    name: "افتراضي",
    description: "الخلفية الافتراضية بدون صورة",
    emoji: "🆓",
    url: null,
    minTier: "basic",
    category: "simple",
  },
  {
    id: "gaming_neon",
    name: "Gaming Neon",
    description: "خلفية ألعاب بألوان نيون",
    emoji: "🎮",
    url: "https://i.imgur.com/PLACEHOLDER1.png",
    minTier: "basic",
    category: "gaming",
  },
  {
    id: "abstract_purple",
    name: "Abstract Purple",
    description: "تجريدي بنفسجي",
    emoji: "🟣",
    url: "https://i.imgur.com/PLACEHOLDER2.png",
    minTier: "basic",
    category: "abstract",
  },
  {
    id: "minimal_dark",
    name: "Minimal Dark",
    description: "بسيط داكن",
    emoji: "⬛",
    url: "https://i.imgur.com/PLACEHOLDER3.png",
    minTier: "basic",
    category: "minimal",
  },
  {
    id: "nature_forest",
    name: "Forest",
    description: "غابة هادئة",
    emoji: "🌲",
    url: "https://i.imgur.com/PLACEHOLDER4.png",
    minTier: "basic",
    category: "nature",
  },
  {
    id: "space_galaxy",
    name: "Galaxy",
    description: "مجرة نجوم",
    emoji: "🌌",
    url: "https://i.imgur.com/PLACEHOLDER5.png",
    minTier: "basic",
    category: "space",
  },
  {
    id: "city_neon",
    name: "Neon City",
    description: "مدينة نيون",
    emoji: "🌃",
    url: "https://i.imgur.com/PLACEHOLDER6.png",
    minTier: "basic",
    category: "city",
  },
  {
    id: "sunset_beach",
    name: "Sunset Beach",
    description: "غروب الشاطئ",
    emoji: "🌅",
    url: "https://i.imgur.com/PLACEHOLDER7.png",
    minTier: "basic",
    category: "nature",
  },
  {
    id: "anime_sakura",
    name: "Anime Sakura",
    description: "أزهار الكرز",
    emoji: "🌸",
    url: "https://i.imgur.com/PLACEHOLDER8.png",
    minTier: "basic",
    category: "anime",
  },
  {
    id: "cyberpunk_red",
    name: "Cyberpunk Red",
    description: "سايبربانك أحمر",
    emoji: "🟥",
    url: "https://i.imgur.com/PLACEHOLDER9.png",
    minTier: "basic",
    category: "cyberpunk",
  },

  // ─── Advanced (5 خلفيات إضافية للمتقدمة وما فوق) ───
  {
    id: "premium_geometric",
    name: "Geometric Premium",
    description: "هندسي متقدم",
    emoji: "💠",
    url: "https://i.imgur.com/PLACEHOLDER10.png",
    minTier: "advanced",
    category: "premium",
  },
  {
    id: "premium_aurora",
    name: "Aurora",
    description: "شفق قطبي",
    emoji: "🌈",
    url: "https://i.imgur.com/PLACEHOLDER11.png",
    minTier: "advanced",
    category: "premium",
  },
  {
    id: "premium_marble",
    name: "Marble Gold",
    description: "رخام ذهبي",
    emoji: "✨",
    url: "https://i.imgur.com/PLACEHOLDER12.png",
    minTier: "advanced",
    category: "premium",
  },
  {
    id: "premium_dragon",
    name: "Dragon Scales",
    description: "حراشف التنين",
    emoji: "🐉",
    url: "https://i.imgur.com/PLACEHOLDER13.png",
    minTier: "advanced",
    category: "premium",
  },
  {
    id: "premium_crystal",
    name: "Crystal",
    description: "كريستال شفاف",
    emoji: "💎",
    url: "https://i.imgur.com/PLACEHOLDER14.png",
    minTier: "advanced",
    category: "premium",
  },
]

// ══════════════════════════════════════════════════════════════════
//  THEMES (12 ثيم لوني)
// ══════════════════════════════════════════════════════════════════

const THEMES = [
  // ─── Basic (5 ثيمات للأساسية) ───
  {
    id: "amber",
    name: "ذهبي",
    description: "ذهبي دافئ (افتراضي)",
    emoji: "🟡",
    minTier: "basic",
    colors: { accent: "#f59e0b", secondary: "#fbbf24", bg: "#0d1117", bgCard: "#161b22" },
  },
  {
    id: "blue",
    name: "أزرق",
    description: "أزرق محيط",
    emoji: "🔵",
    minTier: "basic",
    colors: { accent: "#3b82f6", secondary: "#60a5fa", bg: "#0a0f1e", bgCard: "#0d1525" },
  },
  {
    id: "purple",
    name: "بنفسجي",
    description: "بنفسجي ملكي",
    emoji: "🟣",
    minTier: "basic",
    colors: { accent: "#8b5cf6", secondary: "#a78bfa", bg: "#0d0a1e", bgCard: "#130d24" },
  },
  {
    id: "green",
    name: "أخضر",
    description: "أخضر زمردي",
    emoji: "🟢",
    minTier: "basic",
    colors: { accent: "#22c55e", secondary: "#4ade80", bg: "#0a1a0f", bgCard: "#0d1f12" },
  },
  {
    id: "red",
    name: "أحمر",
    description: "أحمر ناري",
    emoji: "🔴",
    minTier: "basic",
    colors: { accent: "#ef4444", secondary: "#f87171", bg: "#1a0a0a", bgCard: "#1f0d0d" },
  },

  // ─── Advanced (7 ثيمات إضافية للمتقدمة وما فوق) ───
  {
    id: "pink",
    name: "وردي",
    description: "وردي ناعم",
    emoji: "🩷",
    minTier: "advanced",
    colors: { accent: "#ec4899", secondary: "#f472b6", bg: "#1a0a12", bgCard: "#1f0d16" },
  },
  {
    id: "cyan",
    name: "سماوي",
    description: "سماوي مضيء",
    emoji: "🩵",
    minTier: "advanced",
    colors: { accent: "#06b6d4", secondary: "#22d3ee", bg: "#0a1519", bgCard: "#0d1c21" },
  },
  {
    id: "orange",
    name: "برتقالي",
    description: "برتقالي مشمس",
    emoji: "🟠",
    minTier: "advanced",
    colors: { accent: "#f97316", secondary: "#fb923c", bg: "#1a0f0a", bgCard: "#1f130d" },
  },
  {
    id: "white",
    name: "أبيض",
    description: "أبيض كلاسيكي",
    emoji: "⚪",
    minTier: "advanced",
    colors: { accent: "#e2e8f0", secondary: "#f8fafc", bg: "#0f0f0f", bgCard: "#1a1a1a" },
  },
  {
    id: "sunset",
    name: "غروب",
    description: "تدرج غروب",
    emoji: "🌅",
    minTier: "advanced",
    colors: { accent: "#f59e0b", secondary: "#ec4899", bg: "#1a0a14", bgCard: "#1f0d1a" },
  },
  {
    id: "ocean",
    name: "محيط",
    description: "تدرج محيطي",
    emoji: "🌊",
    minTier: "advanced",
    colors: { accent: "#06b6d4", secondary: "#3b82f6", bg: "#0a141a", bgCard: "#0d1820" },
  },
  {
    id: "gold",
    name: "ذهبي ملكي",
    description: "ذهبي فاخر",
    emoji: "👑",
    minTier: "advanced",
    colors: { accent: "#ffd700", secondary: "#fbbf24", bg: "#1a1410", bgCard: "#1f1813" },
  },
]

// ══════════════════════════════════════════════════════════════════
//  BADGES (10 شارات)
// ══════════════════════════════════════════════════════════════════

const BADGES = [
  // ─── Basic (1 شارة فقط) ───
  {
    id: "subscriber",
    name: "مشترك",
    description: "شارة مشترك Lyn Premium",
    emoji: "⭐",
    icon: "⭐",
    minTier: "basic",
    color: "#f59e0b",
  },

  // ─── Advanced (5 شارات للمتقدمة) ───
  {
    id: "gamer",
    name: "Gamer",
    description: "شارة الألعاب",
    emoji: "🎮",
    icon: "🎮",
    minTier: "advanced",
    color: "#8b5cf6",
  },
  {
    id: "pro",
    name: "Pro",
    description: "شارة المحترف",
    emoji: "🔥",
    icon: "🔥",
    minTier: "advanced",
    color: "#ef4444",
  },
  {
    id: "vip",
    name: "VIP",
    description: "شارة VIP",
    emoji: "💼",
    icon: "💼",
    minTier: "advanced",
    color: "#06b6d4",
  },
  {
    id: "diamond",
    name: "Diamond",
    description: "شارة الماس",
    emoji: "💎",
    icon: "💎",
    minTier: "advanced",
    color: "#3b82f6",
  },
  {
    id: "star",
    name: "Star",
    description: "شارة النجم",
    emoji: "🌟",
    icon: "🌟",
    minTier: "advanced",
    color: "#fbbf24",
  },

  // ─── Legendary (4 شارات حصرية) ───
  {
    id: "legend",
    name: "LEGEND",
    description: "شارة أسطورية حصرية",
    emoji: "👑",
    icon: "👑",
    minTier: "legendary",
    color: "#ffd700",
  },
  {
    id: "mvp",
    name: "MVP",
    description: "شارة الأفضل",
    emoji: "🏆",
    icon: "🏆",
    minTier: "legendary",
    color: "#ffd700",
  },
  {
    id: "phoenix",
    name: "Phoenix",
    description: "شارة العنقاء",
    emoji: "🔥",
    icon: "🔥",
    minTier: "legendary",
    color: "#f97316",
  },
  {
    id: "thunder",
    name: "Thunder",
    description: "شارة الرعد",
    emoji: "⚡",
    icon: "⚡",
    minTier: "legendary",
    color: "#fbbf24",
  },
]

// ══════════════════════════════════════════════════════════════════
//  EFFECTS (6 تأثيرات)
// ══════════════════════════════════════════════════════════════════

const EFFECTS = [
  // ─── Advanced (2 تأثيرات) ───
  {
    id: "glow",
    name: "Glow",
    description: "توهج حول الاسم",
    emoji: "💫",
    minTier: "advanced",
  },
  {
    id: "gradient",
    name: "Gradient",
    description: "تدرج لوني للنص",
    emoji: "🌈",
    minTier: "advanced",
  },

  // ─── Legendary (4 تأثيرات حصرية) ───
  {
    id: "animated_border",
    name: "Animated Border",
    description: "إطار متحرك",
    emoji: "🎯",
    minTier: "legendary",
  },
  {
    id: "particles",
    name: "Particles",
    description: "جسيمات متناثرة",
    emoji: "✨",
    minTier: "legendary",
  },
  {
    id: "shine",
    name: "Shine",
    description: "بريق متحرك",
    emoji: "⚡",
    minTier: "legendary",
  },
  {
    id: "pulse",
    name: "Pulse",
    description: "نبض حول الصورة",
    emoji: "💗",
    minTier: "legendary",
  },
]

// ══════════════════════════════════════════════════════════════════
//  BORDER STYLES (5 أنماط)
// ══════════════════════════════════════════════════════════════════

const BORDER_STYLES = [
  {
    id: "default",
    name: "افتراضي",
    description: "إطار بسيط",
    minTier: "basic",
  },
  {
    id: "rounded",
    name: "دائري",
    description: "إطار دائري ناعم",
    minTier: "advanced",
  },
  {
    id: "neon",
    name: "Neon",
    description: "إطار نيون متوهج",
    minTier: "advanced",
  },
  {
    id: "gold",
    name: "ذهبي",
    description: "إطار ذهبي فاخر",
    minTier: "legendary",
  },
  {
    id: "diamond",
    name: "ماسي",
    description: "إطار ماسي مزخرف",
    minTier: "legendary",
  },
]

// ══════════════════════════════════════════════════════════════════
//  TIER ORDER (للمقارنة)
// ══════════════════════════════════════════════════════════════════

const TIER_ORDER = ["free", "basic", "advanced", "legendary"]

function tierMeetsRequirement(currentTier, requiredTier) {
  const a = TIER_ORDER.indexOf(currentTier || "free")
  const b = TIER_ORDER.indexOf(requiredTier || "basic")
  if (a < 0 || b < 0) return false
  return a >= b
}

// ══════════════════════════════════════════════════════════════════
//  FILTERS — جلب الموارد المتاحة لفئة محددة
// ══════════════════════════════════════════════════════════════════

function getBackgroundsForTier(tier) {
  return BACKGROUNDS.filter(bg => tierMeetsRequirement(tier, bg.minTier))
}

function getThemesForTier(tier) {
  return THEMES.filter(t => tierMeetsRequirement(tier, t.minTier))
}

function getBadgesForTier(tier) {
  return BADGES.filter(b => tierMeetsRequirement(tier, b.minTier))
}

function getEffectsForTier(tier) {
  return EFFECTS.filter(e => tierMeetsRequirement(tier, e.minTier))
}

function getBorderStylesForTier(tier) {
  return BORDER_STYLES.filter(b => tierMeetsRequirement(tier, b.minTier))
}

// ══════════════════════════════════════════════════════════════════
//  LOOKUPS — جلب عنصر واحد بـ ID
// ══════════════════════════════════════════════════════════════════

function getBackground(id) {
  return BACKGROUNDS.find(bg => bg.id === id) || null
}

function getTheme(id) {
  return THEMES.find(t => t.id === id) || THEMES[0]
}

function getBadge(id) {
  return BADGES.find(b => b.id === id) || null
}

function getEffect(id) {
  return EFFECTS.find(e => e.id === id) || null
}

function getBorderStyle(id) {
  return BORDER_STYLES.find(b => b.id === id) || BORDER_STYLES[0]
}

// ══════════════════════════════════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════════════════════════════════

module.exports = {
  // البيانات الخام
  BACKGROUNDS,
  THEMES,
  BADGES,
  EFFECTS,
  BORDER_STYLES,
  TIER_ORDER,

  // فلترة حسب الفئة
  getBackgroundsForTier,
  getThemesForTier,
  getBadgesForTier,
  getEffectsForTier,
  getBorderStylesForTier,

  // جلب عنصر واحد
  getBackground,
  getTheme,
  getBadge,
  getEffect,
  getBorderStyle,

  // helpers
  tierMeetsRequirement,
}