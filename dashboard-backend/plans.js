/**
 * ═══════════════════════════════════════════════════════════
 *  Plans Configuration
 *  مشترك بين البوت والداشبورد
 * ═══════════════════════════════════════════════════════════
 */

const PLAN_TIERS = {
  FREE: "free",
  SILVER: "silver",
  GOLD: "gold",
  DIAMOND: "diamond",
}

const PLAN_ORDER = ["free", "silver", "gold", "diamond"]

const PLANS = {
  free: {
    id: "free",
    name: "مجاني",
    nameEn: "Free",
    price: 0,
    priceLabel: "مجاناً",
    icon: "✨",
    color: "default",
    features: ["أوامر الإشراف الأساسية", "معلومات السيرفر", "أوامر مجانية"],
  },
  silver: {
    id: "silver",
    name: "فضي",
    nameEn: "Silver",
    price: 29,
    priceLabel: "29 ريال/شهر",
    icon: "🥈",
    color: "default",
    features: [
      "كل ميزات Free",
      "نظام الترحيب",
      "السجلات",
      "نظام XP والمستويات",
      "لوحات الرتب",
      "تغيير أسماء الأوامر",
      "بريفكس مخصص",
      "إحصائيات أساسية",
    ],
  },
  gold: {
    id: "gold",
    name: "ذهبي",
    nameEn: "Gold",
    price: 79,
    priceLabel: "79 ريال/شهر",
    icon: "💎",
    color: "warning",
    badge: "الأكثر شيوعاً",
    features: [
      "كل ميزات Silver",
      "نظام التذاكر",
      "نظام الاقتصاد",
      "نظام الفعاليات",
      "الحماية المتقدمة",
      "AI كامل",
      "حماية من السبام والريد",
    ],
  },
  diamond: {
    id: "diamond",
    name: "ماسي",
    nameEn: "Diamond",
    price: 149,
    priceLabel: "149 ريال/شهر",
    icon: "💠",
    color: "lyn",
    features: [
      "كل ميزات Gold",
      "AI متقدم (GPT-4o)",
      "المُجدوِل (Cron)",
      "Audit Log كامل",
      "إحصائيات متقدمة",
      "قوالب مخصصة",
      "أولوية في الدعم",
    ],
  },
}

/**
 * هل خطة معينة تشمل ميزة من خطة أدنى؟
 * مثال: hasAccess('gold', 'silver') → true
 */
function hasAccess(currentPlan, requiredPlan) {
  const currentIndex = PLAN_ORDER.indexOf(currentPlan)
  const requiredIndex = PLAN_ORDER.indexOf(requiredPlan)
  if (currentIndex === -1 || requiredIndex === -1) return false
  return currentIndex >= requiredIndex
}

/**
 * تنبيه — alias للتوافق مع الكود القديم
 */
const canUsePlan = hasAccess

module.exports = {
  PLAN_TIERS,
  PLAN_ORDER,
  PLANS,
  hasAccess,
  canUsePlan,
}
