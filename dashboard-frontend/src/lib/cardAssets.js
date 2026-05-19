/**
 * ═══════════════════════════════════════════════════════════
 *  Card Assets — Frontend Library v3.0 (مكتبة موسّعة)
 *  المسار: dashboard-frontend/src/lib/cardAssets.js
 *
 *  ✨ 50+ خلفية من Unsplash، 5 فئات
 * ═══════════════════════════════════════════════════════════
 */

// ════════════════════════════════════════════════════════════
//  BACKGROUNDS (50+)
// ════════════════════════════════════════════════════════════

export const BACKGROUNDS = [
  // ─── 🆓 الافتراضي ───
  { id: 'default',           name: 'افتراضي',        emoji: '🆓', url: null, minTier: 'basic', category: 'simple' },

  // ─── 🎮 Gaming (10) ───
  { id: 'gaming_neon',       name: 'Gaming Neon',     emoji: '🎮', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'gaming' },
  { id: 'gaming_setup',      name: 'Gaming Setup',    emoji: '🖥️', url: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'gaming' },
  { id: 'gaming_keyboard',   name: 'RGB Keyboard',    emoji: '⌨️', url: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'gaming' },
  { id: 'gaming_controller', name: 'Controller',      emoji: '🕹️', url: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'gaming' },
  { id: 'gaming_arcade',     name: 'Arcade',          emoji: '👾', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'gaming' },
  { id: 'gaming_esports',    name: 'Esports',         emoji: '🏆', url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'gaming' },
  { id: 'gaming_purple_pc',  name: 'Purple PC',       emoji: '💜', url: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'gaming' },
  { id: 'gaming_room',       name: 'Gaming Room',     emoji: '🎯', url: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'gaming' },
  { id: 'gaming_anime',      name: 'Anime Gaming',    emoji: '⚔️', url: 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'gaming' },
  { id: 'gaming_streamer',   name: 'Streamer',        emoji: '📹', url: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'gaming' },

  // ─── 🌌 Space (10) ───
  { id: 'space_galaxy',      name: 'Galaxy',          emoji: '🌌', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'space' },
  { id: 'space_nebula',      name: 'Nebula',          emoji: '💫', url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'space' },
  { id: 'space_milky_way',   name: 'Milky Way',       emoji: '✨', url: 'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'space' },
  { id: 'space_stars',       name: 'Starfield',       emoji: '⭐', url: 'https://images.unsplash.com/photo-1543722530-d2c3201371e7?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'space' },
  { id: 'space_planet',      name: 'Planet',          emoji: '🪐', url: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'space' },
  { id: 'space_aurora',      name: 'Aurora',          emoji: '🌈', url: 'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'space' },
  { id: 'space_moon',        name: 'Moon',            emoji: '🌙', url: 'https://images.unsplash.com/photo-1532693322450-2cb5c511067d?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'space' },
  { id: 'space_sci_fi',      name: 'Sci-Fi',          emoji: '🚀', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'space' },
  { id: 'space_cosmic',      name: 'Cosmic',          emoji: '🌠', url: 'https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'space' },
  { id: 'space_void',        name: 'Deep Space',      emoji: '🌑', url: 'https://images.unsplash.com/photo-1539593395743-7da5ee10ff07?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'space' },

  // ─── 🌿 Nature (10) ───
  { id: 'nature_forest',     name: 'Forest',          emoji: '🌲', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'nature' },
  { id: 'nature_mountains',  name: 'Mountains',       emoji: '⛰️', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'nature' },
  { id: 'nature_ocean',      name: 'Ocean',           emoji: '🌊', url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'nature' },
  { id: 'nature_sunset',     name: 'Sunset',          emoji: '🌅', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'nature' },
  { id: 'nature_lake',       name: 'Lake',            emoji: '🏞️', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'nature' },
  { id: 'nature_desert',     name: 'Desert',          emoji: '🏜️', url: 'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'nature' },
  { id: 'nature_winter',     name: 'Winter',          emoji: '❄️', url: 'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'nature' },
  { id: 'nature_sakura',     name: 'Cherry Blossom',  emoji: '🌸', url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'nature' },
  { id: 'nature_clouds',     name: 'Clouds',          emoji: '☁️', url: 'https://images.unsplash.com/photo-1419833173245-f59e1b93f9ee?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'nature' },
  { id: 'nature_waterfall',  name: 'Waterfall',       emoji: '💦', url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'nature' },

  // ─── 🎨 Abstract (10) ───
  { id: 'abstract_purple',   name: 'Abstract Purple', emoji: '🟣', url: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'abstract' },
  { id: 'abstract_blue',     name: 'Abstract Blue',   emoji: '🔵', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'abstract' },
  { id: 'abstract_pink',     name: 'Abstract Pink',   emoji: '🩷', url: 'https://images.unsplash.com/photo-1620207418302-439b387441b0?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'abstract' },
  { id: 'abstract_dark',     name: 'Minimal Dark',    emoji: '⬛', url: 'https://images.unsplash.com/photo-1502691876148-a84978e59af8?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'abstract' },
  { id: 'abstract_cyber',    name: 'Cyberpunk',       emoji: '🟥', url: 'https://images.unsplash.com/photo-1601933973783-43cf8a7d4c5f?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'abstract' },
  { id: 'abstract_neon',     name: 'Neon Lights',     emoji: '💡', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'abstract' },
  { id: 'abstract_smoke',    name: 'Color Smoke',     emoji: '💨', url: 'https://images.unsplash.com/photo-1614851099175-e5b30eb6f696?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'abstract' },
  { id: 'abstract_paint',    name: 'Paint Strokes',   emoji: '🎨', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'abstract' },
  { id: 'abstract_geo',      name: 'Geometric',       emoji: '💠', url: 'https://images.unsplash.com/photo-1604079628040-94301bb21b91?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'abstract' },
  { id: 'abstract_city',     name: 'Neon City',       emoji: '🌃', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1600&h=400&fit=crop&q=80', minTier: 'basic', category: 'abstract' },

  // ─── 👑 Premium (10) ───
  { id: 'premium_marble',    name: 'Marble Gold',     emoji: '✨', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&h=400&fit=crop&q=80', minTier: 'advanced', category: 'premium' },
  { id: 'premium_dragon',    name: 'Dragon Smoke',    emoji: '🐉', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1600&h=400&fit=crop&q=80', minTier: 'advanced', category: 'premium' },
  { id: 'premium_crystal',   name: 'Crystal',         emoji: '💎', url: 'https://images.unsplash.com/photo-1610177498701-7fcfd7c3f9bf?w=1600&h=400&fit=crop&q=80', minTier: 'advanced', category: 'premium' },
  { id: 'premium_lava',      name: 'Lava',            emoji: '🌋', url: 'https://images.unsplash.com/photo-1554941426-94fde40e9d56?w=1600&h=400&fit=crop&q=80', minTier: 'advanced', category: 'premium' },
  { id: 'premium_ice',       name: 'Ice Crystal',     emoji: '❄️', url: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1600&h=400&fit=crop&q=80', minTier: 'advanced', category: 'premium' },
  { id: 'premium_fire',      name: 'Fire',            emoji: '🔥', url: 'https://images.unsplash.com/photo-1517959105821-eaf2591984ca?w=1600&h=400&fit=crop&q=80', minTier: 'advanced', category: 'premium' },
  { id: 'premium_storm',     name: 'Lightning Storm', emoji: '⚡', url: 'https://images.unsplash.com/photo-1500674425229-f692875b0ab7?w=1600&h=400&fit=crop&q=80', minTier: 'advanced', category: 'premium' },
  { id: 'premium_golden',    name: 'Golden Hour',     emoji: '🌇', url: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1600&h=400&fit=crop&q=80', minTier: 'advanced', category: 'premium' },
  { id: 'premium_diamond',   name: 'Diamond Shine',   emoji: '💍', url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1600&h=400&fit=crop&q=80', minTier: 'advanced', category: 'premium' },
  { id: 'premium_royal',     name: 'Royal Velvet',    emoji: '👑', url: 'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=1600&h=400&fit=crop&q=80', minTier: 'advanced', category: 'premium' },
];

// ════════════════════════════════════════════════════════════
//  CATEGORIES
// ════════════════════════════════════════════════════════════

export const CATEGORIES = [
  { id: 'all',      name: 'الكل',     emoji: '🌟' },
  { id: 'simple',   name: 'افتراضي',  emoji: '🆓' },
  { id: 'gaming',   name: 'الألعاب',  emoji: '🎮' },
  { id: 'space',    name: 'الفضاء',   emoji: '🌌' },
  { id: 'nature',   name: 'الطبيعة',  emoji: '🌿' },
  { id: 'abstract', name: 'تجريدي',   emoji: '🎨' },
  { id: 'premium',  name: 'Premium',  emoji: '👑' },
];

// ════════════════════════════════════════════════════════════
//  THEMES (12) — بدون تغيير
// ════════════════════════════════════════════════════════════

export const THEMES = [
  { id: 'amber',  name: 'ذهبي',         emoji: '🟡', minTier: 'basic',    colors: { accent: '#f59e0b', secondary: '#fbbf24', bg: '#0d1117', bgCard: '#161b22' } },
  { id: 'blue',   name: 'أزرق',         emoji: '🔵', minTier: 'basic',    colors: { accent: '#3b82f6', secondary: '#60a5fa', bg: '#0a0f1e', bgCard: '#0d1525' } },
  { id: 'purple', name: 'بنفسجي',       emoji: '🟣', minTier: 'basic',    colors: { accent: '#8b5cf6', secondary: '#a78bfa', bg: '#0d0a1e', bgCard: '#130d24' } },
  { id: 'green',  name: 'أخضر',         emoji: '🟢', minTier: 'basic',    colors: { accent: '#22c55e', secondary: '#4ade80', bg: '#0a1a0f', bgCard: '#0d1f12' } },
  { id: 'red',    name: 'أحمر',         emoji: '🔴', minTier: 'basic',    colors: { accent: '#ef4444', secondary: '#f87171', bg: '#1a0a0a', bgCard: '#1f0d0d' } },
  { id: 'pink',   name: 'وردي',         emoji: '🩷', minTier: 'advanced', colors: { accent: '#ec4899', secondary: '#f472b6', bg: '#1a0a12', bgCard: '#1f0d16' } },
  { id: 'cyan',   name: 'سماوي',        emoji: '🩵', minTier: 'advanced', colors: { accent: '#06b6d4', secondary: '#22d3ee', bg: '#0a1519', bgCard: '#0d1c21' } },
  { id: 'orange', name: 'برتقالي',      emoji: '🟠', minTier: 'advanced', colors: { accent: '#f97316', secondary: '#fb923c', bg: '#1a0f0a', bgCard: '#1f130d' } },
  { id: 'white',  name: 'أبيض',         emoji: '⚪', minTier: 'advanced', colors: { accent: '#e2e8f0', secondary: '#f8fafc', bg: '#0f0f0f', bgCard: '#1a1a1a' } },
  { id: 'sunset', name: 'غروب',         emoji: '🌅', minTier: 'advanced', colors: { accent: '#f59e0b', secondary: '#ec4899', bg: '#1a0a14', bgCard: '#1f0d1a' } },
  { id: 'ocean',  name: 'محيط',         emoji: '🌊', minTier: 'advanced', colors: { accent: '#06b6d4', secondary: '#3b82f6', bg: '#0a141a', bgCard: '#0d1820' } },
  { id: 'gold',   name: 'ذهبي ملكي',    emoji: '👑', minTier: 'advanced', colors: { accent: '#ffd700', secondary: '#fbbf24', bg: '#1a1410', bgCard: '#1f1813' } },
];

// ════════════════════════════════════════════════════════════
//  BADGES (10) — بدون تغيير
// ════════════════════════════════════════════════════════════

export const BADGES = [
  { id: 'subscriber', name: 'مشترك',    description: 'شارة مشترك Lyn',    emoji: '⭐', minTier: 'basic',     color: '#f59e0b' },
  { id: 'gamer',      name: 'Gamer',     description: 'شارة الألعاب',       emoji: '🎮', minTier: 'advanced',  color: '#8b5cf6' },
  { id: 'pro',        name: 'Pro',       description: 'شارة المحترف',       emoji: '🔥', minTier: 'advanced',  color: '#ef4444' },
  { id: 'vip',        name: 'VIP',       description: 'شارة VIP',          emoji: '💼', minTier: 'advanced',  color: '#06b6d4' },
  { id: 'diamond',    name: 'Diamond',   description: 'شارة الماس',        emoji: '💎', minTier: 'advanced',  color: '#3b82f6' },
  { id: 'star',       name: 'Star',      description: 'شارة النجم',         emoji: '🌟', minTier: 'advanced',  color: '#fbbf24' },
  { id: 'legend',     name: 'LEGEND',    description: 'شارة أسطورية حصرية', emoji: '👑', minTier: 'legendary', color: '#ffd700' },
  { id: 'mvp',        name: 'MVP',       description: 'شارة الأفضل',        emoji: '🏆', minTier: 'legendary', color: '#ffd700' },
  { id: 'phoenix',    name: 'Phoenix',   description: 'شارة العنقاء',       emoji: '🔥', minTier: 'legendary', color: '#f97316' },
  { id: 'thunder',    name: 'Thunder',   description: 'شارة الرعد',         emoji: '⚡', minTier: 'legendary', color: '#fbbf24' },
];

// ════════════════════════════════════════════════════════════
//  EFFECTS (6) — بدون تغيير
// ════════════════════════════════════════════════════════════

export const EFFECTS = [
  { id: 'glow',             name: 'Glow',             description: 'توهج حول الاسم',     emoji: '💫', minTier: 'advanced' },
  { id: 'gradient',         name: 'Gradient',         description: 'تدرج لوني للنص',     emoji: '🌈', minTier: 'advanced' },
  { id: 'animated_border',  name: 'Animated Border',  description: 'إطار متحرك',        emoji: '🎯', minTier: 'legendary' },
  { id: 'particles',        name: 'Particles',        description: 'جسيمات متناثرة',     emoji: '✨', minTier: 'legendary' },
  { id: 'shine',            name: 'Shine',            description: 'بريق متحرك',        emoji: '⚡', minTier: 'legendary' },
  { id: 'pulse',            name: 'Pulse',            description: 'نبض حول الصورة',     emoji: '💗', minTier: 'legendary' },
];

// ════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════

const TIER_ORDER = ['free', 'basic', 'advanced', 'legendary'];

export function tierMeetsRequirement(currentTier, requiredTier) {
  const a = TIER_ORDER.indexOf(currentTier || 'free');
  const b = TIER_ORDER.indexOf(requiredTier || 'basic');
  if (a < 0 || b < 0) return false;
  return a >= b;
}

export function getBackgroundsForTier(tier) {
  return BACKGROUNDS.filter((bg) => tierMeetsRequirement(tier, bg.minTier));
}

export function getBackgroundsByCategory(tier, category) {
  return BACKGROUNDS.filter((bg) =>
    tierMeetsRequirement(tier, bg.minTier) &&
    (category === 'all' || bg.category === category)
  );
}

export function getThemesForTier(tier) {
  return THEMES.filter((t) => tierMeetsRequirement(tier, t.minTier));
}

export function getBadgesForTier(tier) {
  return BADGES.filter((b) => tierMeetsRequirement(tier, b.minTier));
}

export function getEffectsForTier(tier) {
  return EFFECTS.filter((e) => tierMeetsRequirement(tier, e.minTier));
}

export function getBackgroundById(id) {
  return BACKGROUNDS.find((bg) => bg.id === id) || null;
}

export function getThemeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

export function getBadgeById(id) {
  return BADGES.find((b) => b.id === id) || null;
}

export function getEffectById(id) {
  return EFFECTS.find((e) => e.id === id) || null;
}