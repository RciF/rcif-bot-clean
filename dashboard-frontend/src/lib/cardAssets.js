/**
 * ═══════════════════════════════════════════════════════════
 *  Card Assets — Frontend Library v2.0
 *  المسار: dashboard-frontend/src/lib/cardAssets.js
 *
 *  ✨ خلفيات حقيقية من Unsplash CDN
 *  ⚠️ يطابق: config/cardAssets.js (في البوت)
 * ═══════════════════════════════════════════════════════════
 */

// ════════════════════════════════════════════════════════════
//  BACKGROUNDS (15 خلفية حقيقية من Unsplash)
// ════════════════════════════════════════════════════════════

export const BACKGROUNDS = [
  { id: 'default',           name: 'افتراضي',       emoji: '🆓', url: null,                                                                                  minTier: 'basic',    category: 'simple' },
  { id: 'gaming_neon',       name: 'Gaming Neon',   emoji: '🎮', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1600&h=400&fit=crop&q=80', minTier: 'basic',    category: 'gaming' },
  { id: 'abstract_purple',   name: 'Abstract',      emoji: '🟣', url: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1600&h=400&fit=crop&q=80', minTier: 'basic',    category: 'abstract' },
  { id: 'minimal_dark',      name: 'Minimal Dark',  emoji: '⬛', url: 'https://images.unsplash.com/photo-1502691876148-a84978e59af8?w=1600&h=400&fit=crop&q=80', minTier: 'basic',    category: 'minimal' },
  { id: 'nature_forest',     name: 'Forest',        emoji: '🌲', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&h=400&fit=crop&q=80', minTier: 'basic',    category: 'nature' },
  { id: 'space_galaxy',      name: 'Galaxy',        emoji: '🌌', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1600&h=400&fit=crop&q=80', minTier: 'basic',    category: 'space' },
  { id: 'city_neon',         name: 'Neon City',     emoji: '🌃', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1600&h=400&fit=crop&q=80', minTier: 'basic',    category: 'city' },
  { id: 'sunset_beach',      name: 'Sunset Beach',  emoji: '🌅', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&h=400&fit=crop&q=80', minTier: 'basic',    category: 'nature' },
  { id: 'anime_sakura',      name: 'Anime Sakura',  emoji: '🌸', url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1600&h=400&fit=crop&q=80', minTier: 'basic',    category: 'anime' },
  { id: 'cyberpunk_red',     name: 'Cyberpunk',     emoji: '🟥', url: 'https://images.unsplash.com/photo-1601933973783-43cf8a7d4c5f?w=1600&h=400&fit=crop&q=80', minTier: 'basic',    category: 'cyberpunk' },
  { id: 'premium_geometric', name: 'Geometric',     emoji: '💠', url: 'https://images.unsplash.com/photo-1604079628040-94301bb21b91?w=1600&h=400&fit=crop&q=80', minTier: 'advanced', category: 'premium' },
  { id: 'premium_aurora',    name: 'Aurora',        emoji: '🌈', url: 'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=1600&h=400&fit=crop&q=80', minTier: 'advanced', category: 'premium' },
  { id: 'premium_marble',    name: 'Marble Gold',   emoji: '✨', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&h=400&fit=crop&q=80', minTier: 'advanced', category: 'premium' },
  { id: 'premium_dragon',    name: 'Dragon Smoke',  emoji: '🐉', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1600&h=400&fit=crop&q=80', minTier: 'advanced', category: 'premium' },
  { id: 'premium_crystal',   name: 'Crystal',       emoji: '💎', url: 'https://images.unsplash.com/photo-1610177498701-7fcfd7c3f9bf?w=1600&h=400&fit=crop&q=80', minTier: 'advanced', category: 'premium' },
];

// ════════════════════════════════════════════════════════════
//  THEMES (12)
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
//  BADGES (10)
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
//  EFFECTS (6)
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