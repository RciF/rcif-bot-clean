/**
 * Lyn Bot Plans — تعريف الخطط والميزات
 * المصدر الوحيد للحقيقة بخصوص ما تقدمه كل خطة
 */

// ════════════════════════════════════════════════════════════
//  PLAN TIERS
// ════════════════════════════════════════════════════════════

export const PLAN_TIERS = {
  FREE: 'free',
  SILVER: 'silver',
  GOLD: 'gold',
  DIAMOND: 'diamond',
};

export const PLAN_ORDER = [
  PLAN_TIERS.FREE,
  PLAN_TIERS.SILVER,
  PLAN_TIERS.GOLD,
  PLAN_TIERS.DIAMOND,
];

// ════════════════════════════════════════════════════════════
//  PLAN METADATA
// ════════════════════════════════════════════════════════════

export const PLANS = {
  [PLAN_TIERS.FREE]: {
    id: 'free',
    name: 'مجاني',
    nameEn: 'Free',
    icon: '🆓',
    color: 'free',
    price: 0,
    priceLabel: 'مجاناً',
    badge: null,
    description: 'ابدأ مع الميزات الأساسية',
    features: [
      'إدارة الأوامر الأساسية',
      'الإشراف الأساسي (تحذيرات، حظر، كتم)',
      'منشئ الإيمبيد البسيط',
      'نظرة عامة على السيرفر',
    ],
  },

  [PLAN_TIERS.SILVER]: {
    id: 'silver',
    name: 'فضي',
    nameEn: 'Silver',
    icon: '🥈',
    color: 'silver',
    price: 15,
    priceLabel: '15 ريال/شهر',
    badge: 'الأكثر شعبية',
    description: 'للسيرفرات النشطة',
    aiMessagesPerDay: 0,
    features: [
      'كل ميزات المجاني',
      'نظام الترحيب مع Live Preview',
      'نظام السجلات (Logs)',
      'لوحات الرتب (Reaction Roles)',
      'نظام XP والمستويات',
      'إحصائيات متقدمة',
      'تغيير البريفكس',
      'القوالب الجاهزة',
      'Members Hub + Bulk actions',
    ],
  },

  [PLAN_TIERS.GOLD]: {
    id: 'gold',
    name: 'ذهبي',
    nameEn: 'Gold',
    icon: '🥇',
    color: 'gold',
    price: 30,
    priceLabel: '30 ريال/شهر',
    badge: 'الأقوى',
    description: 'للمحترفين والمجتمعات الكبيرة',
    aiMessagesPerDay: 10,
    features: [
      'كل ميزات الفضي',
      'نظام الحماية الكامل (Anti-Spam/Raid/Nuke)',
      'نظام التذاكر مع Designer',
      'نظام الاقتصاد + المتجر',
      'الفعاليات والجدولة',
      'الذكاء الاصطناعي + Persona',
      'سجل الأنشطة (Audit Log)',
      'النموذج الإبداعي للـ AI',
    ],
  },

  [PLAN_TIERS.DIAMOND]: {
    id: 'diamond',
    name: 'ماسي',
    nameEn: 'Diamond',
    icon: '💎',
    color: 'diamond',
    price: 60,
    priceLabel: '60 ريال/شهر',
    badge: 'الكل في واحد',
    description: 'كل شيء بدون حدود',
    aiMessagesPerDay: 30,
    features: [
      'كل ميزات الذهبي',
      'المُجدوِل المتقدم (Cron)',
      'Real-time updates',
      'دعم أولوية',
      'حدود AI أعلى (30 رسالة/يوم)',
      'بدون حدود استخدام',
    ],
  },
};

// ════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════

/**
 * تحقق إذا كانت الخطة الحالية تكفي للوصول للميزة
 */
export function hasAccess(currentPlan, requiredPlan) {
  const current = PLAN_ORDER.indexOf(currentPlan || PLAN_TIERS.FREE);
  const required = PLAN_ORDER.indexOf(requiredPlan);
  return current >= required;
}

/**
 * احصل على الخطة الأعلى من الحالية
 */
export function getNextPlan(currentPlan) {
  const idx = PLAN_ORDER.indexOf(currentPlan || PLAN_TIERS.FREE);
  if (idx === -1 || idx === PLAN_ORDER.length - 1) return null;
  return PLAN_ORDER[idx + 1];
}

/**
 * احصل على بيانات الخطة
 */
export function getPlanInfo(planId) {
  return PLANS[planId] || PLANS[PLAN_TIERS.FREE];
}

/**
 * تحقق إذا كانت الميزة مقفولة (يحتاج ترقية)
 */
export function isFeatureLocked(currentPlan, requiredPlan) {
  return !hasAccess(currentPlan, requiredPlan);
}

// ════════════════════════════════════════════════════════════
//  FEATURE → PLAN MAP
//  خريطة الميزات → الخطة المطلوبة
// ════════════════════════════════════════════════════════════

export const FEATURE_PLANS = {
  // الإدارة
  overview: PLAN_TIERS.FREE,
  stats: PLAN_TIERS.SILVER,
  auditLog: PLAN_TIERS.GOLD,

  // السيرفر
  welcome: PLAN_TIERS.SILVER,
  protection: PLAN_TIERS.GOLD,
  logs: PLAN_TIERS.SILVER,
  moderation: PLAN_TIERS.FREE,
  membersHub: PLAN_TIERS.SILVER,

  // التفاعل
  tickets: PLAN_TIERS.GOLD,
  reactionRoles: PLAN_TIERS.SILVER,
  xp: PLAN_TIERS.SILVER,
  economy: PLAN_TIERS.GOLD,
  events: PLAN_TIERS.GOLD,

  // المتقدم
  ai: PLAN_TIERS.GOLD,
  embedBuilder: PLAN_TIERS.FREE,
  scheduler: PLAN_TIERS.DIAMOND,
  templates: PLAN_TIERS.SILVER,

  // الإعدادات
  commandsList: PLAN_TIERS.FREE,
  commandsRename: PLAN_TIERS.SILVER,
  prefix: PLAN_TIERS.SILVER,
};

/**
 * احصل على الخطة المطلوبة لميزة معينة
 */
export function getRequiredPlan(featureKey) {
  return FEATURE_PLANS[featureKey] || PLAN_TIERS.FREE;
}
