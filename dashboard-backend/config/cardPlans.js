/**
 * ═══════════════════════════════════════════════════════════
 *  Card Premium Plans Config
 *  المسار: dashboard-backend/config/cardPlans.js
 *
 *  المرجع الموحّد لاشتراكات تخصيص البطاقة (منفصل عن خطط البوت)
 *  3 فئات: basic / advanced / legendary
 *
 *  ⚠️ هذا الملف يُستخدم في:
 *    - dashboard-backend/routes/cardSubscription.js
 *    - dashboard-frontend/src/lib/cardPlans.js (نسخة مطابقة)
 *    - systems/cardCustomizationSystem.js في البوت (نسخة مطابقة)
 *
 *  أي تعديل هنا يجب أن ينعكس في الـ 3 ملفات
 * ═══════════════════════════════════════════════════════════
 */

// ════════════════════════════════════════════════════════════
//  CARD PREMIUM TIERS
// ════════════════════════════════════════════════════════════

const CARD_TIERS = {
  free: {
    id: "free",
    name: "مجاني",
    nameEn: "Free",
    icon: "🆓",
    color: "#64748b",
    order: 0,
    pricing: {
      monthly: 0,
      yearly: 0,
      currency: "USD",
    },
    features: {
      presetBackgrounds: 0,       // لا خلفيات جاهزة (الافتراضية فقط)
      presetThemes: 1,            // الثيم الافتراضي (amber)
      customBackground: false,    // لا رفع خلفية
      customColorPicker: false,   // لا اختيار ألوان مخصصة
      animatedBackgrounds: false, // لا خلفيات متحركة
      badges: 0,                  // لا شارات
      effects: 0,                 // لا تأثيرات
      legendaryBadge: false,
      prioritySupport: false,
    },
    description: "البطاقة الافتراضية بدون تخصيص",
  },

  basic: {
    id: "basic",
    name: "أساسية",
    nameEn: "Basic",
    icon: "🥉",
    color: "#cd7f32",
    order: 1,
    pricing: {
      monthly: 1.99,
      yearly: 15.00,
      yearlyDiscount: 37, // %
      currency: "USD",
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
      "10 خلفيات جاهزة",
      "5 ثيمات ألوان",
      "شارة مشترك واحدة",
      "معاينة لحظية في الداشبورد",
    ],
    description: "البداية المثالية لتخصيص بطاقتك",
  },

  advanced: {
    id: "advanced",
    name: "متقدمة",
    nameEn: "Advanced",
    icon: "🥈",
    color: "#c0c0c0",
    order: 2,
    pricing: {
      monthly: 3.99,
      yearly: 29.00,
      yearlyDiscount: 39,
      currency: "USD",
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
      "كل ميزات الأساسية",
      "15 خلفية جاهزة",
      "12 ثيم ألوان",
      "رفع خلفية شخصية HD",
      "اختيار ألوان مخصصة (Color Picker)",
      "5 شارات للاختيار",
      "تأثير Glow على الاسم",
      "إطار مخصص",
    ],
    description: "حرية إبداعية كاملة لبطاقتك",
    recommended: true,
  },

  legendary: {
    id: "legendary",
    name: "أسطورية",
    nameEn: "Legendary",
    icon: "👑",
    color: "#ffd700",
    order: 3,
    pricing: {
      monthly: 5.99,
      yearly: 45.00,
      yearlyDiscount: 37,
      currency: "USD",
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
      "كل ميزات المتقدمة",
      "خلفيات متحركة (GIF)",
      "جميع الشارات (10 شارات)",
      "كل التأثيرات (Glow, Gradient, Animations, Particles, Shine, Pulse)",
      "Gradient على شريط XP",
      "شارة LEGEND حصرية 👑",
      "أولوية في الدعم",
    ],
    description: "تجربة أسطورية كاملة لا مثيل لها",
  },
}

// ════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════

const TIER_ORDER = ["free", "basic", "advanced", "legendary"]

/**
 * هل tier1 يحتوي على ميزات tier2 (أي tier1 >= tier2)
 */
function hasAccess(currentTier, requiredTier) {
  const a = TIER_ORDER.indexOf(currentTier || "free")
  const b = TIER_ORDER.indexOf(requiredTier || "free")
  if (a < 0 || b < 0) return false
  return a >= b
}

/**
 * جلب بيانات فئة محددة
 */
function getTier(tierId) {
  return CARD_TIERS[tierId] || CARD_TIERS.free
}

/**
 * حساب السعر بناءً على المدة
 */
function getPrice(tierId, duration = "monthly") {
  const tier = getTier(tierId)
  if (duration === "yearly") return tier.pricing.yearly
  return tier.pricing.monthly
}

/**
 * حساب تاريخ انتهاء الاشتراك
 */
function calculateExpiryDate(duration = "monthly", startDate = null) {
  const start = startDate ? new Date(startDate) : new Date()

  if (duration === "yearly") {
    start.setFullYear(start.getFullYear() + 1)
  } else if (duration === "monthly") {
    start.setMonth(start.getMonth() + 1)
  } else if (duration === "weekly") {
    start.setDate(start.getDate() + 7)
  } else if (duration === "daily") {
    start.setDate(start.getDate() + 1)
  }

  return start
}

/**
 * إضافة عدد أيام لتاريخ موجود (للتمديد اليدوي)
 */
function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/**
 * هل الاشتراك منتهي؟
 */
function isExpired(expiresAt) {
  if (!expiresAt) return true
  return new Date(expiresAt) < new Date()
}

/**
 * عدد الأيام المتبقية في الاشتراك
 */
function daysLeft(expiresAt) {
  if (!expiresAt) return 0
  const diff = new Date(expiresAt) - new Date()
  return Math.max(0, Math.ceil(diff / 86_400_000))
}

/**
 * جلب كل الفئات مرتبة (للعرض في الداشبورد)
 */
function getAllTiers() {
  return TIER_ORDER.map(id => CARD_TIERS[id])
}

/**
 * جلب الفئات المدفوعة فقط (بدون free)
 */
function getPaidTiers() {
  return TIER_ORDER.filter(id => id !== "free").map(id => CARD_TIERS[id])
}

/**
 * هل الـ tier صالح؟
 */
function isValidTier(tierId) {
  return TIER_ORDER.includes(tierId)
}

/**
 * هل الـ duration صالحة؟
 */
function isValidDuration(duration) {
  return ["monthly", "yearly"].includes(duration)
}

// ════════════════════════════════════════════════════════════
//  EXPORTS
// ════════════════════════════════════════════════════════════

module.exports = {
  CARD_TIERS,
  TIER_ORDER,
  getTier,
  getPrice,
  hasAccess,
  calculateExpiryDate,
  addDays,
  isExpired,
  daysLeft,
  getAllTiers,
  getPaidTiers,
  isValidTier,
  isValidDuration,
}