/**
 * ═══════════════════════════════════════════════════════════
 *  Commands Registry — Static Snapshot
 *
 *  Snapshot ثابت لقائمة الأوامر في البوت.
 *  يُحدَّث يدوياً عند إضافة أوامر جديدة في البوت.
 *
 *  Schema لكل أمر:
 *  {
 *    name: string,                 // اسم الأمر العربي (الـ slash name)
 *    description: string,          // وصف عربي
 *    category: string,             // مفتاح الفئة (موجود في CATEGORIES_META)
 *    subscriptionTier: string,     // free | silver | gold | diamond
 *    isSubcommand?: boolean,       // true لو ساب-كوماند داخل أمر رئيسي
 *    parent?: string,              // اسم الأمر الأب (للـ subcommands فقط)
 *  }
 *
 *  ═══════════════════════════════════════════════════════════
 *  آخر تحديث: مزامنة كاملة مع الأوامر الفعلية المنشورة (59 أمر)
 *  ═══════════════════════════════════════════════════════════
 */

const CATEGORIES_META = {
  moderation: { id: "moderation", label: "الإشراف",          icon: "🛡️", order: 1  },
  logs:       { id: "logs",       label: "السجلات",           icon: "📋", order: 2  },
  protection: { id: "protection", label: "الحماية",           icon: "🔒", order: 3  },
  automod:    { id: "automod",    label: "الإشراف التلقائي", icon: "🤖", order: 4  },
  welcome:    { id: "welcome",    label: "الترحيب",           icon: "🤝", order: 5  },
  tickets:    { id: "tickets",    label: "التذاكر",           icon: "🎫", order: 6  },
  roles:      { id: "roles",      label: "لوحات الرتب",      icon: "🎭", order: 7  },
  level:      { id: "level",      label: "المستوى",           icon: "⭐", order: 8  },
  economy:    { id: "economy",    label: "الاقتصاد",          icon: "💰", order: 9  },
  events:     { id: "events",     label: "الفعاليات",         icon: "🎉", order: 10 },
  giveaway:   { id: "giveaway",   label: "السحوبات",          icon: "🎁", order: 11 },
  stats:      { id: "stats",      label: "الإحصائيات",        icon: "📊", order: 12 },
  ai:         { id: "ai",         label: "الذكاء الاصطناعي", icon: "🤖", order: 13 },
  info:       { id: "info",       label: "المعلومات",         icon: "ℹ️", order: 14 },
  admin:      { id: "admin",      label: "الإدارة العامة",   icon: "⚙️", order: 15 },
}

const COMMANDS_REGISTRY = [
  // ═══════════════════════════════════════════════════════════
  //  🛡️ moderation — الإشراف
  // ═══════════════════════════════════════════════════════════
  { name: "حظر",            description: "حظر عضو من السيرفر",                         category: "moderation", subscriptionTier: "free" },
  { name: "فك_الحظر",       description: "إلغاء حظر عضو محظور",                         category: "moderation", subscriptionTier: "free" },
  { name: "طرد",            description: "طرد عضو من السيرفر",                          category: "moderation", subscriptionTier: "free" },
  { name: "اسكت",           description: "كتم عضو لمدة محددة (Timeout)",               category: "moderation", subscriptionTier: "free" },
  { name: "فك_الكتم",       description: "إلغاء كتم عضو (إزالة الـ Timeout)",          category: "moderation", subscriptionTier: "free" },
  { name: "مسح",            description: "مسح رسائل من القناة مع فلاتر متقدمة",       category: "moderation", subscriptionTier: "free" },
  { name: "تحذير",          description: "تحذير عضو وتسجيله في سجله",                  category: "moderation", subscriptionTier: "free" },
  { name: "التحذيرات",     description: "عرض تحذيرات عضو أو كل المحذرين",             category: "moderation", subscriptionTier: "free" },
  { name: "مسح_التحذيرات", description: "مسح كل تحذيرات عضو محدد",                    category: "moderation", subscriptionTier: "free" },
  { name: "قفل",            description: "قفل قناة ومنع الكتابة فيها",                 category: "moderation", subscriptionTier: "free" },
  { name: "فتح",            description: "فتح قناة مقفلة",                              category: "moderation", subscriptionTier: "free" },
  { name: "بطيء",           description: "تفعيل السلو مود في قناة",                    category: "moderation", subscriptionTier: "free" },
  { name: "لقب",            description: "تغيير لقب (Nickname) عضو",                   category: "moderation", subscriptionTier: "free" },
  { name: "رتبة",           description: "إعطاء أو سحب رتبة من عضو",                   category: "moderation", subscriptionTier: "free" },

  // ═══════════════════════════════════════════════════════════
  //  📋 logs — السجلات
  // ═══════════════════════════════════════════════════════════
  { name: "لوق",         description: "إعدادات نظام السجلات الشامل",  category: "logs", subscriptionTier: "silver" },
  { name: "لوق ضبط",     description: "ضبط قناة لوق لحدث محدد",        category: "logs", subscriptionTier: "silver", isSubcommand: true, parent: "لوق" },
  { name: "لوق إزالة",   description: "إزالة قناة لوق",                 category: "logs", subscriptionTier: "silver", isSubcommand: true, parent: "لوق" },
  { name: "لوق الكل",    description: "ضبط قناة لكل أنواع اللوق",      category: "logs", subscriptionTier: "silver", isSubcommand: true, parent: "لوق" },
  { name: "لوق تفعيل",   description: "تفعيل نظام اللوق",               category: "logs", subscriptionTier: "silver", isSubcommand: true, parent: "لوق" },
  { name: "لوق إيقاف",   description: "إيقاف نظام اللوق",               category: "logs", subscriptionTier: "silver", isSubcommand: true, parent: "لوق" },
  { name: "لوق حالة",    description: "عرض حالة كل اللوقات",            category: "logs", subscriptionTier: "silver", isSubcommand: true, parent: "لوق" },
  { name: "لوق مسح",     description: "مسح كل إعدادات اللوق",           category: "logs", subscriptionTier: "silver", isSubcommand: true, parent: "لوق" },
  { name: "ضبط_لوق",     description: "ضبط سريع لقناة اللوق الرئيسية", category: "logs", subscriptionTier: "silver" },
  { name: "تحقق_لوحة",  description: "اختبار لوحة اللوق",               category: "logs", subscriptionTier: "silver" },

  // ═══════════════════════════════════════════════════════════
  //  🔒 protection — الحماية
  // ═══════════════════════════════════════════════════════════
  { name: "حماية",          description: "نظام الحماية الشامل من Raid و Spam و Nuke", category: "protection", subscriptionTier: "gold" },
  { name: "حماية حالة",     description: "عرض حالة كل أنظمة الحماية",                  category: "protection", subscriptionTier: "gold", isSubcommand: true, parent: "حماية" },
  { name: "حماية سبام",     description: "تفعيل/إيقاف الحماية من السبام",              category: "protection", subscriptionTier: "gold", isSubcommand: true, parent: "حماية" },
  { name: "حماية رايد",     description: "تفعيل/إيقاف الحماية من الـ Raid",            category: "protection", subscriptionTier: "gold", isSubcommand: true, parent: "حماية" },
  { name: "حماية نيوك",     description: "تفعيل/إيقاف الحماية من Nuking",              category: "protection", subscriptionTier: "gold", isSubcommand: true, parent: "حماية" },
  { name: "حماية لوق",      description: "تحديد قناة لوق الحماية",                     category: "protection", subscriptionTier: "gold", isSubcommand: true, parent: "حماية" },
  { name: "حماية وايتلست", description: "إضافة/إزالة عضو من القائمة البيضاء",         category: "protection", subscriptionTier: "gold", isSubcommand: true, parent: "حماية" },
  { name: "حماية لوكداون", description: "قفل السيرفر الكامل في حالات الطوارئ",        category: "protection", subscriptionTier: "gold", isSubcommand: true, parent: "حماية" },

  // ═══════════════════════════════════════════════════════════
  //  🤖 automod — الإشراف التلقائي
  // ═══════════════════════════════════════════════════════════
  { name: "إشراف",          description: "نظام الإشراف التلقائي للسيرفر",       category: "automod", subscriptionTier: "silver" },
  { name: "إشراف حالة",     description: "عرض حالة الإشراف التلقائي",            category: "automod", subscriptionTier: "silver", isSubcommand: true, parent: "إشراف" },
  { name: "إشراف تفعيل",    description: "تفعيل أو إيقاف الإشراف",              category: "automod", subscriptionTier: "silver", isSubcommand: true, parent: "إشراف" },
  { name: "إشراف فلتر",     description: "إدارة الفلاتر (روابط، كابتل، إلخ)",  category: "automod", subscriptionTier: "silver", isSubcommand: true, parent: "إشراف" },
  { name: "إشراف كلمة",     description: "إدارة الكلمات الممنوعة",               category: "automod", subscriptionTier: "silver", isSubcommand: true, parent: "إشراف" },
  { name: "إشراف استثناء", description: "استثناء قناة أو رتبة من الإشراف",    category: "automod", subscriptionTier: "silver", isSubcommand: true, parent: "إشراف" },
  { name: "إشراف لوق",      description: "تحديد قناة لوق الإشراف",              category: "automod", subscriptionTier: "silver", isSubcommand: true, parent: "إشراف" },
  { name: "إشراف سجل",     description: "عرض سجل المخالفات الأخيرة",            category: "automod", subscriptionTier: "silver", isSubcommand: true, parent: "إشراف" },

  // ═══════════════════════════════════════════════════════════
  //  🤝 welcome — الترحيب
  // ═══════════════════════════════════════════════════════════
  { name: "ترحيب",         description: "نظام الترحيب بالأعضاء الجدد",   category: "welcome", subscriptionTier: "silver" },
  { name: "ترحيب ضبط",     description: "ضبط رسالة وصورة الترحيب",       category: "welcome", subscriptionTier: "silver", isSubcommand: true, parent: "ترحيب" },
  { name: "ترحيب تفعيل",   description: "تفعيل نظام الترحيب",              category: "welcome", subscriptionTier: "silver", isSubcommand: true, parent: "ترحيب" },
  { name: "ترحيب إيقاف",   description: "إيقاف نظام الترحيب",              category: "welcome", subscriptionTier: "silver", isSubcommand: true, parent: "ترحيب" },
  { name: "ترحيب اختبار",  description: "اختبار رسالة الترحيب",            category: "welcome", subscriptionTier: "silver", isSubcommand: true, parent: "ترحيب" },
  { name: "ترحيب حالة",    description: "عرض إعدادات الترحيب الحالية",   category: "welcome", subscriptionTier: "silver", isSubcommand: true, parent: "ترحيب" },

  // ═══════════════════════════════════════════════════════════
  //  🎫 tickets — التذاكر
  // ═══════════════════════════════════════════════════════════
  { name: "تذاكر",         description: "نظام التذاكر المتكامل للدعم الفني", category: "tickets", subscriptionTier: "gold" },
  { name: "تذاكر إعداد",   description: "إعداد نظام التذاكر",                category: "tickets", subscriptionTier: "gold", isSubcommand: true, parent: "تذاكر" },
  { name: "تذاكر إعدادات", description: "تعديل إعدادات نظام التذاكر",        category: "tickets", subscriptionTier: "gold", isSubcommand: true, parent: "تذاكر" },
  { name: "تذاكر معلومات", description: "عرض إعدادات وإحصائيات التذاكر",     category: "tickets", subscriptionTier: "gold", isSubcommand: true, parent: "تذاكر" },

  // ═══════════════════════════════════════════════════════════
  //  🎭 roles — لوحات الرتب
  // ═══════════════════════════════════════════════════════════
  { name: "لوحة-رتب-إنشاء",   description: "إنشاء لوحة رتب جديدة بأزرار",  category: "roles", subscriptionTier: "silver" },
  { name: "لوحة-رتب-إضافة",   description: "إضافة رتبة للوحة موجودة",       category: "roles", subscriptionTier: "silver" },
  { name: "لوحة-رتب-تعديل",   description: "تعديل لوحة رتب موجودة",         category: "roles", subscriptionTier: "silver" },
  { name: "لوحة-رتب-قائمة",   description: "عرض كل لوحات الرتب في السيرفر", category: "roles", subscriptionTier: "silver" },
  { name: "لوحة-رتب-حذف-زر", description: "حذف زر رتبة من لوحة",           category: "roles", subscriptionTier: "silver" },
  { name: "لوحة-رتب-مسح",     description: "حذف لوحة رتب بالكامل",          category: "roles", subscriptionTier: "silver" },

  // ═══════════════════════════════════════════════════════════
  //  ⭐ level — المستوى
  // ═══════════════════════════════════════════════════════════
  { name: "مستوى",     description: "عرض مستواك أو مستوى عضو مع بطاقة مخصصة", category: "level", subscriptionTier: "free" },
  { name: "متصدرين_xp", description: "قائمة أفضل الأعضاء في XP",                category: "level", subscriptionTier: "free" },
  { name: "بطاقتي",    description: "تخصيص بطاقة المستوى الشخصية",             category: "level", subscriptionTier: "free" },

  { name: "اعدادات_المستوى",                description: "إعدادات نظام المستوى والـ XP",      category: "level", subscriptionTier: "silver" },
  { name: "اعدادات_المستوى قناة_الصعود",    description: "تحديد قناة رسائل صعود المستوى",     category: "level", subscriptionTier: "silver", isSubcommand: true, parent: "اعدادات_المستوى" },
  { name: "اعدادات_المستوى تعطيل_قناة",    description: "إيقاف رسائل الصعود في قناة معينة",  category: "level", subscriptionTier: "silver", isSubcommand: true, parent: "اعدادات_المستوى" },
  { name: "اعدادات_المستوى مضاعف_xp",      description: "ضبط مضاعف XP لجميع الأعضاء",        category: "level", subscriptionTier: "silver", isSubcommand: true, parent: "اعدادات_المستوى" },
  { name: "اعدادات_المستوى تعطيل_قناة_xp", description: "تعطيل اكتساب XP في قناة معينة",    category: "level", subscriptionTier: "silver", isSubcommand: true, parent: "اعدادات_المستوى" },
  { name: "اعدادات_المستوى حالة",           description: "عرض الإعدادات الحالية لنظام XP",     category: "level", subscriptionTier: "silver", isSubcommand: true, parent: "اعدادات_المستوى" },

  // ═══════════════════════════════════════════════════════════
  //  💰 economy — الاقتصاد
  // ═══════════════════════════════════════════════════════════
  { name: "رصيد",      description: "عرض رصيدك وثروتك وممتلكاتك",        category: "economy", subscriptionTier: "gold" },
  { name: "يومي",      description: "استلام مكافأة يومية",                category: "economy", subscriptionTier: "gold" },
  { name: "عمل",       description: "اشتغل واكسب كوينز",                   category: "economy", subscriptionTier: "gold" },
  { name: "متجر",      description: "عرض المتجر والشراء",                  category: "economy", subscriptionTier: "gold" },
  { name: "شراء",      description: "شراء منتج من المتجر",                 category: "economy", subscriptionTier: "gold" },
  { name: "بيع",       description: "بيع منتج من ممتلكاتك",                category: "economy", subscriptionTier: "gold" },
  { name: "ممتلكاتي", description: "عرض ممتلكاتك من المتجر",             category: "economy", subscriptionTier: "gold" },
  { name: "تحويل",     description: "تحويل كوينات لعضو آخر",               category: "economy", subscriptionTier: "gold" },
  { name: "متصدرين",  description: "عرض المتصدرين (أغنى الأعضاء)",       category: "economy", subscriptionTier: "gold" },

  // ═══════════════════════════════════════════════════════════
  //  🎉 events — الفعاليات
  // ═══════════════════════════════════════════════════════════
  { name: "فعالية-إنشاء", description: "إنشاء فعالية جديدة (Event)",         category: "events", subscriptionTier: "gold" },
  { name: "فعالية-عرض",   description: "عرض تفاصيل فعالية محددة",            category: "events", subscriptionTier: "gold" },
  { name: "فعالية-قائمة", description: "عرض قائمة الفعاليات في السيرفر",    category: "events", subscriptionTier: "gold" },
  { name: "فعالية-حضور",  description: "عرض قائمة المسجلين في فعالية",      category: "events", subscriptionTier: "gold" },
  { name: "فعالية-بدء",   description: "بدء فعالية يدوياً",                   category: "events", subscriptionTier: "gold" },
  { name: "فعالية-إنهاء", description: "إنهاء فعالية جارية",                 category: "events", subscriptionTier: "gold" },
  { name: "فعالية-إلغاء", description: "إلغاء فعالية قبل بدئها",             category: "events", subscriptionTier: "gold" },
  { name: "فعالية-تذكير", description: "إرسال تذكير للمسجلين في فعالية",    category: "events", subscriptionTier: "gold" },

  // ═══════════════════════════════════════════════════════════
  //  🎁 giveaway — السحوبات
  // ═══════════════════════════════════════════════════════════
  { name: "سحب",        description: "نظام السحوبات والجوائز",   category: "giveaway", subscriptionTier: "silver" },
  { name: "سحب إنشاء", description: "إنشاء سحب جديد",            category: "giveaway", subscriptionTier: "silver", isSubcommand: true, parent: "سحب" },
  { name: "سحب إنهاء", description: "إنهاء سحب نشط الآن",        category: "giveaway", subscriptionTier: "silver", isSubcommand: true, parent: "سحب" },
  { name: "سحب إلغاء", description: "إلغاء سحب بدون اختيار فائز", category: "giveaway", subscriptionTier: "silver", isSubcommand: true, parent: "سحب" },
  { name: "سحب إعادة", description: "إعادة اختيار فائز لسحب منتهي", category: "giveaway", subscriptionTier: "silver", isSubcommand: true, parent: "سحب" },
  { name: "سحب قائمة", description: "عرض السحوبات النشطة",       category: "giveaway", subscriptionTier: "silver", isSubcommand: true, parent: "سحب" },

  // ═══════════════════════════════════════════════════════════
  //  📊 stats — الإحصائيات
  // ═══════════════════════════════════════════════════════════
  { name: "إحصائيات",         description: "لوحة إحصائيات السيرفر الذكية",  category: "stats", subscriptionTier: "silver" },
  { name: "إحصائيات إعداد",   description: "إنشاء لوحة الإحصائيات في قناة", category: "stats", subscriptionTier: "silver", isSubcommand: true, parent: "إحصائيات" },
  { name: "إحصائيات تحديث",   description: "تحديث لوحة الإحصائيات فوراً",   category: "stats", subscriptionTier: "silver", isSubcommand: true, parent: "إحصائيات" },
  { name: "إحصائيات تقرير",   description: "عرض تقرير أسبوعي مفصل",          category: "stats", subscriptionTier: "silver", isSubcommand: true, parent: "إحصائيات" },
  { name: "إحصائيات إيقاف",   description: "إيقاف نظام الإحصائيات",          category: "stats", subscriptionTier: "silver", isSubcommand: true, parent: "إحصائيات" },

  // ═══════════════════════════════════════════════════════════
  //  🤖 ai — الذكاء الاصطناعي
  // ═══════════════════════════════════════════════════════════
  { name: "ذكاء", description: "محادثة مع لين (الذكاء الاصطناعي)", category: "ai", subscriptionTier: "gold" },

  // ═══════════════════════════════════════════════════════════
  //  ℹ️ info — المعلومات
  // ═══════════════════════════════════════════════════════════
  { name: "مساعدة",  description: "دليل أوامر البوت الكامل",         category: "info", subscriptionTier: "free" },
  { name: "بوت",     description: "معلومات وإحصائيات البوت",          category: "info", subscriptionTier: "free" },
  { name: "السيرفر", description: "معلومات السيرفر",                   category: "info", subscriptionTier: "free" },
  { name: "معلومات", description: "معلومات عضو محدد",                  category: "info", subscriptionTier: "free" },
  { name: "صورة",    description: "عرض صورة أو بانر عضو بجودة عالية", category: "info", subscriptionTier: "free" },

  // ═══════════════════════════════════════════════════════════
  //  ⚙️ admin — الإدارة العامة
  // ═══════════════════════════════════════════════════════════
  { name: "الإعدادات",   description: "عرض إعدادات وحالة أنظمة السيرفر", category: "admin", subscriptionTier: "free" },
  { name: "ضبط",         description: "إعدادات سريعة للبوت",                category: "admin", subscriptionTier: "free" },
  { name: "إعلان",       description: "إرسال وإدارة الإعلانات الرسمية",    category: "admin", subscriptionTier: "free" },
  { name: "إعلان إرسال", description: "إرسال إعلان جديد بـ Embed احترافي", category: "admin", subscriptionTier: "free", isSubcommand: true, parent: "إعلان" },
  { name: "إعلان تعديل", description: "تعديل إعلان مرسل سابقاً",            category: "admin", subscriptionTier: "free", isSubcommand: true, parent: "إعلان" },
  { name: "إعلان حذف",   description: "حذف إعلان مرسل",                      category: "admin", subscriptionTier: "free", isSubcommand: true, parent: "إعلان" },
]

module.exports = {
  CATEGORIES_META,
  COMMANDS_REGISTRY,
}