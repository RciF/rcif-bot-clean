/**
 * ═══════════════════════════════════════════════════════════
 *  Card Premium Plans — Frontend Config
 *  المسار: dashboard-frontend/src/lib/cardPlans.js
 *
 *  ⚠️ يجب أن يكون مطابقاً تماماً لـ:
 *     - dashboard-backend/config/cardPlans.js
 *     - systems/cardCustomizationSystem.js (في البوت)
 *
 *  أي تعديل هنا يجب أن ينعكس في الـ 3 ملفات
 * ═══════════════════════════════════════════════════════════
 */

// ════════════════════════════════════════════════════════════
//  CARD PREMIUM TIERS
// ════════════════════════════════════════════════════════════

export const CARD_TIERS = {
  free: {
    id: 'free',
    name: 'مجاني',
    nameEn: 'Free',
    icon: '🆓',
    color: '#64748b',
    gradient: 'from-slate-500 to-slate-600',
    order: 0,
    pricing: {
      monthly: 0,
      yearly: 0,
      currency: 'USD',
    },
    features: {
      presetBackgrounds: 0,
      presetThemes: 1,
      customBackground: false,
      customColorPicker: false,
      animatedBackgrounds: false,
      badges: 0,
      effects: 0,
      legendaryBadge: false,
      prioritySupport: false,
    },
    description: 'البطاقة الافتراضية بدون تخصيص',
  },

  basic: {
    id: 'basic',
    name: 'أساسية',
    nameEn: 'Basic',
    icon: '🥉',
    color: '#cd7f32',
    gradient: 'from-amber-700 to-orange-700',
    order: 1,
    pricing: {
      monthly: 1.99,
      yearly: 15.00,
      yearlyDiscount: 37,
      currency: 'USD',
    },
    features: {
      presetBackgrounds: 10,
      presetThemes: 5,
      customBackground: false,
      customColorPicker: false,
      animatedBackgrounds: false,
      badges: 1,
      effects: 0,
      legendaryBadge: false,
      prioritySupport: false,
    },
    perks: [
      '10 خلفيات جاهزة',
      '5 ثيمات ألوان',
      'شارة مشترك واحدة',
      'معاينة لحظية في الداشبورد',
    ],
    description: 'البداية المثالية لتخصيص بطاقتك',
  },

  advanced: {
    id: 'advanced',
    name: 'متقدمة',
    nameEn: 'Advanced',
    icon: '🥈',
    color: '#c0c0c0',
    gradient: 'from-slate-400 to-slate-500',
    order: 2,
    pricing: {
      monthly: 3.99,
      yearly: 29.00,
      yearlyDiscount: 39,
      currency: 'USD',
    },
    features: {
      presetBackgrounds: 15,
      presetThemes: 12,
      customBackground: true,
      customColorPicker: true,
      animatedBackgrounds: false,
      badges: 5,
      effects: 2,
      legendaryBadge: false,
      prioritySupport: false,
    },
    perks: [
      'كل ميزات الأساسية',
      '15 خلفية جاهزة',
      '12 ثيم ألوان',
      'رفع خلفية شخصية HD',
      'اختيار ألوان مخصصة (Color Picker)',
      '5 شارات للاختيار',
      'تأثير Glow على الاسم',
      'إطار مخصص',
    ],
    description: 'حرية إبداعية كاملة لبطاقتك',
    recommended: true,
  },

  legendary: {
    id: 'legendary',
    name: 'أسطورية',
    nameEn: 'Legendary',
    icon: '👑',
    color: '#ffd700',
    gradient: 'from-yellow-500 via-amber-500 to-yellow-600',
    order: 3,
    pricing: {
      monthly: 5.99,
      yearly: 45.00,
      yearlyDiscount: 37,
      currency: 'USD',
    },
    features: {
      presetBackgrounds: 15,
      presetThemes: 12,
      customBackground: true,
      customColorPicker: true,
      animatedBackgrounds: true,
      badges: 10,
      effects: 6,
      legendaryBadge: true,
      prioritySupport: true,
    },
    perks: [
      'كل ميزات المتقدمة',
      'خلفيات متحركة (GIF)',
      'جميع الشارات (10 شارات)',
      'كل التأثيرات (Glow, Gradient, Animations, Particles, Shine, Pulse)',
      'Gradient على شريط XP',
      'شارة LEGEND حصرية 👑',
      'أولوية في الدعم',
    ],
    description: 'تجربة أسطورية كاملة لا مثيل لها',
  },
};

// ════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════

export const TIER_ORDER = ['free', 'basic', 'advanced', 'legendary'];

/**
 * هل tier1 يحتوي على ميزات tier2 (أي tier1 >= tier2)
 */
export function hasAccess(currentTier, requiredTier) {
  const a = TIER_ORDER.indexOf(currentTier || 'free');
  const b = TIER_ORDER.indexOf(requiredTier || 'free');
  if (a < 0 || b < 0) return false;
  return a >= b;
}

/**
 * جلب بيانات فئة محددة
 */
export function getTier(tierId) {
  return CARD_TIERS[tierId] || CARD_TIERS.free;
}

/**
 * حساب السعر بناءً على المدة
 */
export function getPrice(tierId, duration = 'monthly') {
  const tier = getTier(tierId);
  if (duration === 'yearly') return tier.pricing.yearly;
  return tier.pricing.monthly;
}

/**
 * جلب كل الفئات مرتبة (للعرض في الداشبورد)
 */
export function getAllTiers() {
  return TIER_ORDER.map((id) => CARD_TIERS[id]);
}

/**
 * جلب الفئات المدفوعة فقط (بدون free)
 */
export function getPaidTiers() {
  return TIER_ORDER.filter((id) => id !== 'free').map((id) => CARD_TIERS[id]);
}

/**
 * هل الـ tier صالح؟
 */
export function isValidTier(tierId) {
  return TIER_ORDER.includes(tierId);
}

/**
 * هل الـ duration صالحة؟
 */
export function isValidDuration(duration) {
  return ['monthly', 'yearly'].includes(duration);
}

/**
 * صياغة السعر للعرض
 */
export function formatPrice(amount, currency = 'USD') {
  if (currency === 'USD') return `$${amount.toFixed(2)}`;
  return `${amount.toFixed(2)} ${currency}`;
}

/**
 * هل اشتراك المستخدم منتهي
 */
export function isExpired(expiresAt) {
  if (!expiresAt) return true;
  return new Date(expiresAt) < new Date();
}

/**
 * عدد الأيام المتبقية
 */
export function daysLeft(expiresAt) {
  if (!expiresAt) return 0;
  const diff = new Date(expiresAt) - new Date();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

/**
 * صياغة المدة للعرض
 */
export function formatDuration(duration) {
  if (duration === 'yearly') return 'سنوي';
  if (duration === 'monthly') return 'شهري';
  if (duration === 'weekly') return 'أسبوعي';
  if (duration === 'daily') return 'يومي';
  return duration;
}

/**
 * صياغة عدد الأيام
 */
export function formatDaysLeft(days) {
  if (days === 0) return 'منتهي';
  if (days === 1) return 'يوم واحد';
  if (days === 2) return 'يومان';
  if (days >= 3 && days <= 10) return `${days} أيام`;
  return `${days} يوم`;
}

/**
 * تنسيق التاريخ بالعربية
 */
export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

// ════════════════════════════════════════════════════════════
//  EVENT ACTION LABELS (للسجل)
// ════════════════════════════════════════════════════════════

export const ACTION_LABELS = {
  created: '✅ تفعيل',
  renewed: '🔄 تجديد',
  extended: '➕ تمديد',
  gifted: '🎁 هدية',
  upgraded: '📈 ترقية',
  downgraded: '📉 تخفيض',
  cancelled: '⛔ إلغاء',
  expired: '⏰ انتهاء',
  reactivated: '🔁 إعادة تفعيل',
};

export const ACTION_COLORS = {
  created: 'bg-green-500/10 text-green-600 dark:text-green-400',
  renewed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  extended: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  gifted: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  upgraded: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  downgraded: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400',
  expired: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  reactivated: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

// ════════════════════════════════════════════════════════════
//  REQUEST STATUS
// ════════════════════════════════════════════════════════════

export const REQUEST_STATUS_LABELS = {
  pending: '⏳ قيد المراجعة',
  approved: '✅ مقبول',
  rejected: '❌ مرفوض',
};

export const REQUEST_STATUS_COLORS = {
  pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  approved: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
  rejected: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
};