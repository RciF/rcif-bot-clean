// ══════════════════════════════════════════════════════════════════
//  CARD ASSETS LIBRARY v2.0
//  المسار: config/cardAssets.js (Backend - في البوت)
//
//  ✨ التحسينات:
//   - خلفيات حقيقية من Unsplash CDN
//   - دقة 1600×400 مناسبة لنسبة البطاقة
//   - تنوع كبير: Gaming, Nature, Space, Anime, Cyberpunk
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
//  BACKGROUNDS (15 خلفية حقيقية)
//  Source: Unsplash (مجاني، رخصة Unsplash)
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
    description: "ألعاب نيون أزرق",
    emoji: "🎮",
    url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1600&h=400&fit=crop&q=80",
    minTier: "basic",
    category: "gaming",
  },
  {
    id: "abstract_purple",
    name: "Abstract Purple",
    description: "تجريدي بنفسجي عميق",
    emoji: "🟣",
    url: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1600&h=400&fit=crop&q=80",
    minTier: "basic",
    category: "abstract",
  },
  {
    id: "minimal_dark",
    name: "Minimal Dark",
    description: "بسيط داكن أنيق",
    emoji: "⬛",
    url: "https://images.unsplash.com/photo-1502691876148-a84978e59af8?w=1600&h=400&fit=crop&q=80",
    minTier: "basic",
    category: "minimal",
  },
  {
    id: "nature_forest",
    name: "Forest",
    description: "غابة الصنوبر",
    emoji: "🌲",
    url: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&h=400&fit=crop&q=80",
    minTier: "basic",
    category: "nature",
  },
  {
    id: "space_galaxy",
    name: "Galaxy",
    description: "مجرة درب التبانة",
    emoji: "🌌",
    url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1600&h=400&fit=crop&q=80",
    minTier: "basic",
    category: "space",
  },
  {
    id: "city_neon",
    name: "Neon City",
    description: "مدينة الليل النيون",
    emoji: "🌃",
    url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1600&h=400&fit=crop&q=80",
    minTier: "basic",
    category: "city",
  },
  {
    id: "sunset_beach",
    name: "Sunset Beach",
    description: "غروب الشاطئ الذهبي",
    emoji: "🌅",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&h=400&fit=crop&q=80",
    minTier: "basic",
    category: "nature",
  },
  {
    id: "anime_sakura",
    name: "Anime Sakura",
    description: "أزهار الكرز اليابانية",
    emoji: "🌸",
    url: "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1600&h=400&fit=crop&q=80",
    minTier: "basic",
    category: "anime",
  },
  {
    id: "cyberpunk_red",
    name: "Cyberpunk",
    description: "سايبربانك أحمر",
    emoji: "🟥",
    url: "https://images.unsplash.com/photo-1601933973783-43cf8a7d4c5f?w=1600&h=400&fit=crop&q=80",
    minTier: "basic",
    category: "cyberpunk",
  },

  // ─── Advanced (5 خلفيات إضافية للمتقدمة وما فوق) ───
  {
    id: "premium_geometric",
    name: "Geometric",
    description: "هندسي متقدم 3D",
    emoji: "💠",
    url: "https://images.unsplash.com/photo-1604079628040-94301bb21b91?w=1600&h=400&fit=crop&q=80",
    minTier: "advanced",
    category: "premium",
  },
  {
    id: "premium_aurora",
    name: "Aurora",
    description: "شفق قطبي ساحر",
    emoji: "🌈",
    url: "https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=1600&h=400&fit=crop&q=80",
    minTier: "advanced",
    category: "premium",
  },
  {
    id: "premium_marble",
    name: "Marble Gold",
    description: "رخام ذهبي فاخر",
    emoji: "✨",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&h=400&fit=crop&q=80",
    minTier: "advanced",
    category: "premium",
  },
  {
    id: "premium_dragon",
    name: "Dragon Smoke",
    description: "دخان التنين الناري",
    emoji: "🐉",
    url: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1600&h=400&fit=crop&q=80",
    minTier: "advanced",
    category: "premium",
  },
  {
    id: "premium_crystal",
    name: "Crystal",
    description: "كريستال شفاف",
    emoji: "💎",
    url: "https://images.unsplash.com/photo-1610177498701-7fcfd7c3f9bf?w=1600&h=400&fit=crop&q=80",
    minTier: "advanced",
    category: "premium",
  },
]

// ══════════════════════════════════════════════════════════════════
//  THEMES (12 ثيم لوني)
// ══════════════════════════════════════════════════════════════════

const THEMES = [
  { id: "amber",  name: "ذهبي",      description: "ذهبي دافئ (افتراضي)", emoji: "🟡", minTier: "basic",    colors: { accent: "#f59e0b", secondary: "#fbbf24", bg: "#0d1117", bgCard: "#161b22" } },
  { id: "blue",   name: "أزرق",      description: "أزرق محيط",          emoji: "🔵", minTier: "basic",    colors: { accent: "#3b82f6", secondary: "#60a5fa", bg: "#0a0f1e", bgCard: "#0d1525" } },
  { id: "purple", name: "بنفسجي",   description: "بنفسجي ملكي",         emoji: "🟣", minTier: "basic",    colors: { accent: "#8b5cf6", secondary: "#a78bfa", bg: "#0d0a1e", bgCard: "#130d24" } },
  { id: "green",  name: "أخضر",     description: "أخضر زمردي",          emoji: "🟢", minTier: "basic",    colors: { accent: "#22c55e", secondary: "#4ade80", bg: "#0a1a0f", bgCard: "#0d1f12" } },
  { id: "red",    name: "أحمر",     description: "أحمر ناري",            emoji: "🔴", minTier: "basic",    colors: { accent: "#ef4444", secondary: "#f87171", bg: "#1a0a0a", bgCard: "#1f0d0d" } },
  { id: "pink",   name: "وردي",     description: "وردي ناعم",            emoji: "🩷", minTier: "advanced", colors: { accent: "#ec4899", secondary: "#f472b6", bg: "#1a0a12", bgCard: "#1f0d16" } },
  { id: "cyan",   name: "سماوي",    description: "سماوي مضيء",          emoji: "🩵", minTier: "advanced", colors: { accent: "#06b6d4", secondary: "#22d3ee", bg: "#0a1519", bgCard: "#0d1c21" } },
  { id: "orange", name: "برتقالي",  description: "برتقالي مشمس",        emoji: "🟠", minTier: "advanced", colors: { accent: "#f97316", secondary: "#fb923c", bg: "#1a0f0a", bgCard: "#1f130d" } },
  { id: "white",  name: "أبيض",     description: "أبيض كلاسيكي",        emoji: "⚪", minTier: "advanced", colors: { accent: "#e2e8f0", secondary: "#f8fafc", bg: "#0f0f0f", bgCard: "#1a1a1a" } },
  { id: "sunset", name: "غروب",     description: "تدرج غروب",           emoji: "🌅", minTier: "advanced", colors: { accent: "#f59e0b", secondary: "#ec4899", bg: "#1a0a14", bgCard: "#1f0d1a" } },
  { id: "ocean",  name: "محيط",     description: "تدرج محيطي",          emoji: "🌊", minTier: "advanced", colors: { accent: "#06b6d4", secondary: "#3b82f6", bg: "#0a141a", bgCard: "#0d1820" } },
  { id: "gold",   name: "ذهبي ملكي", description: "ذهبي فاخر",          emoji: "👑", minTier: "advanced", colors: { accent: "#ffd700", secondary: "#fbbf24", bg: "#1a1410", bgCard: "#1f1813" } },
]

// ══════════════════════════════════════════════════════════════════
//  BADGES (10 شارات)
// ══════════════════════════════════════════════════════════════════

const BADGES = [
  { id: "subscriber", name: "مشترك",  description: "شارة مشترك Lyn Premium",  emoji: "⭐", icon: "⭐", minTier: "basic",     color: "#f59e0b" },
  { id: "gamer",      name: "Gamer",  description: "شارة الألعاب",            emoji: "🎮", icon: "🎮", minTier: "advanced",  color: "#8b5cf6" },
  { id: "pro",        name: "Pro",    description: "شارة المحترف",            emoji: "🔥", icon: "🔥", minTier: "advanced",  color: "#ef4444" },
  { id: "vip",        name: "VIP",    description: "شارة VIP",                emoji: "💼", icon: "💼", minTier: "advanced",  color: "#06b6d4" },
  { id: "diamond",    name: "Diamond", description: "شارة الماس",             emoji: "💎", icon: "💎", minTier: "advanced",  color: "#3b82f6" },
  { id: "star",       name: "Star",   description: "شارة النجم",              emoji: "🌟", icon: "🌟", minTier: "advanced",  color: "#fbbf24" },
  { id: "legend",     name: "LEGEND", description: "شارة أسطورية حصرية",      emoji: "👑", icon: "👑", minTier: "legendary", color: "#ffd700" },
  { id: "mvp",        name: "MVP",    description: "شارة الأفضل",             emoji: "🏆", icon: "🏆", minTier: "legendary", color: "#ffd700" },
  { id: "phoenix",    name: "Phoenix", description: "شارة العنقاء",           emoji: "🔥", icon: "🔥", minTier: "legendary", color: "#f97316" },
  { id: "thunder",    name: "Thunder", description: "شارة الرعد",             emoji: "⚡", icon: "⚡", minTier: "legendary", color: "#fbbf24" },
]

// ══════════════════════════════════════════════════════════════════
//  EFFECTS (6 تأثيرات)
// ══════════════════════════════════════════════════════════════════

const EFFECTS = [
  { id: "glow",            name: "Glow",            description: "توهج حول الاسم",  emoji: "💫", minTier: "advanced" },
  { id: "gradient",        name: "Gradient",        description: "تدرج لوني للنص",  emoji: "🌈", minTier: "advanced" },
  { id: "animated_border", name: "Animated Border", description: "إطار متحرك",     emoji: "🎯", minTier: "legendary" },
  { id: "particles",       name: "Particles",       description: "جسيمات متناثرة",  emoji: "✨", minTier: "legendary" },
  { id: "shine",           name: "Shine",           description: "بريق متحرك",      emoji: "⚡", minTier: "legendary" },
  { id: "pulse",           name: "Pulse",           description: "نبض حول الصورة",  emoji: "💗", minTier: "legendary" },
]

// ══════════════════════════════════════════════════════════════════
//  BORDER STYLES (5 أنماط)
// ══════════════════════════════════════════════════════════════════

const BORDER_STYLES = [
  { id: "default",  name: "افتراضي", description: "إطار بسيط",         minTier: "basic" },
  { id: "rounded",  name: "دائري",   description: "إطار دائري ناعم",   minTier: "advanced" },
  { id: "neon",     name: "Neon",    description: "إطار نيون متوهج",   minTier: "advanced" },
  { id: "gold",     name: "ذهبي",    description: "إطار ذهبي فاخر",    minTier: "legendary" },
  { id: "diamond",  name: "ماسي",    description: "إطار ماسي مزخرف",   minTier: "legendary" },
]

// ══════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════

const TIER_ORDER = ["free", "basic", "advanced", "legendary"]

function tierMeetsRequirement(currentTier, requiredTier) {
  const a = TIER_ORDER.indexOf(currentTier || "free")
  const b = TIER_ORDER.indexOf(requiredTier || "basic")
  if (a < 0 || b < 0) return false
  return a >= b
}

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

module.exports = {
  BACKGROUNDS,
  THEMES,
  BADGES,
  EFFECTS,
  BORDER_STYLES,
  TIER_ORDER,
  getBackgroundsForTier,
  getThemesForTier,
  getBadgesForTier,
  getEffectsForTier,
  getBorderStylesForTier,
  getBackground,
  getTheme,
  getBadge,
  getEffect,
  getBorderStyle,
  tierMeetsRequirement,
}