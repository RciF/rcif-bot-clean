/**
 * ═══════════════════════════════════════════════════════════
 *  Plans Configuration — Backend
 *  مشترك بين البوت والداشبورد
 *
 *  ⚠️ تحذير: هذا الملف يجب أن يطابق dashboard-frontend/src/lib/plans.js
 *  أي تعديل في الأسعار/الميزات يجب أن يكون في الملفين معاً
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
    icon: "🆓",
    color: "free",
    price: 0,
    priceLabel: "مجاناً",
    badge: null,
    description: "ابدأ مع الميزات الأساسية",
    aiMessagesPerDay: 0,
    features: [
      "إدارة الأوامر الأساسية",
      "الإشراف الأساسي (تحذيرات، حظر، كتم)",
      "منشئ الإيمبيد البسيط",
      "نظرة عامة على السيرفر",
    ],
  },
  silver: {
    id: "silver",
    name: "فضي",
    nameEn: "Silver",
    icon: "🥈",
    color: "silver",
    price: 29,
    priceLabel: "29 ريال/شهر",
    badge: "الأكثر شعبية",
    description: "للسيرفرات النشطة",
    aiMessagesPerDay: 0,
    features: [
      "كل ميزات المجاني",
      "نظام الترحيب مع Live Preview",
      "نظام السجلات (Logs)",
      "لوحات الرتب (Reaction Roles)",
      "نظام XP والمستويات",
      "إحصائيات متقدمة",
      "تغيير البريفكس",
      "القوالب الجاهزة",
      "Members Hub + Bulk actions",
    ],
  },
  gold: {
    id: "gold",
    name: "ذهبي",
    nameEn: "Gold",
    icon: "🥇",
    color: "gold",
    price: 79,
    priceLabel: "79 ريال/شهر",
    badge: "الأقوى",
    description: "للمحترفين والمجتمعات الكبيرة",
    aiMessagesPerDay: 300,
    features: [
      "كل ميزات الفضي",
      "نظام الحماية الكامل (Anti-Spam/Raid/Nuke)",
      "نظام التذاكر مع Designer",
      "نظام الاقتصاد + المتجر",
      "الفعاليات والجدولة",
      "الذكاء الاصطناعي + Persona",
      "سجل الأنشطة (Audit Log)",
      "النموذج الإبداعي للـ AI",
    ],
  },
  diamond: {
    id: "diamond",
    name: "ماسي",
    nameEn: "Diamond",
    icon: "💎",
    color: "diamond",
    price: 149,
    priceLabel: "149 ريال/شهر",
    badge: "الكل في واحد",
    description: "كل شيء بدون حدود",
    aiMessagesPerDay: 700,
    features: [
      "كل ميزات الذهبي",
      "المُجدوِل المتقدم (Cron)",
      "Real-time updates",
      "دعم أولوية",
      "حدود AI أعلى (700 رسالة/يوم)",
      "بدون حدود استخدام",
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

/**
 * احصل على بيانات الخطة
 */
function getPlanInfo(planId) {
  return PLANS[planId] || PLANS.free
}

/**
 * احصل على الخطة الأعلى من الحالية
 */
function getNextPlan(currentPlan) {
  const idx = PLAN_ORDER.indexOf(currentPlan || "free")
  if (idx === -1 || idx === PLAN_ORDER.length - 1) return null
  return PLAN_ORDER[idx + 1]
}

module.exports = {
  PLAN_TIERS,
  PLAN_ORDER,
  PLANS,
  hasAccess,
  canUsePlan,
  getPlanInfo,
  getNextPlan,
}