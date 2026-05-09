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
 *    isSubcommand?: boolean,
 *  }
 * ═══════════════════════════════════════════════════════════
 */

const CATEGORIES_META = {
  moderation: { id: "moderation", label: "الإشراف",          icon: "🛡️", order: 1  },
  logs:       { id: "logs",       label: "السجلات",           icon: "📋", order: 2  },
  protection: { id: "protection", label: "الحماية",           icon: "🔒", order: 3  },
  welcome:    { id: "welcome",    label: "الترحيب",           icon: "🤝", order: 4  },
  tickets:    { id: "tickets",    label: "التذاكر",           icon: "🎫", order: 5  },
  roles:      { id: "roles",      label: "الرتب",             icon: "🎭", order: 6  },
  xp:         { id: "xp",         label: "XP والمستويات",    icon: "⭐", order: 7  },
  economy:    { id: "economy",    label: "الاقتصاد",          icon: "💰", order: 8  },
  events:     { id: "events",     label: "الفعاليات",         icon: "🎉", order: 9  },
  stats:      { id: "stats",      label: "الإحصائيات",        icon: "📊", order: 10 },
  ai:         { id: "ai",         label: "الذكاء الاصطناعي", icon: "🤖", order: 11 },
  info:       { id: "info",       label: "المعلومات",         icon: "ℹ️", order: 12 },
  admin:      { id: "admin",      label: "الإعدادات",         icon: "⚙️", order: 13 },
}

const COMMANDS_REGISTRY = [
  // ─── moderation ───
  { name: "حظر",       description: "حظر عضو من السيرفر",                category: "moderation", subscriptionTier: "free" },
  { name: "إلغاء-حظر", description: "إلغاء حظر عضو محظور",                category: "moderation", subscriptionTier: "free" },
  { name: "طرد",       description: "طرد عضو من السيرفر",                category: "moderation", subscriptionTier: "free" },
  { name: "اسكات",     description: "كتم عضو لمدة محددة",                  category: "moderation", subscriptionTier: "free" },
  { name: "فك-كتم",    description: "إلغاء كتم عضو",                       category: "moderation", subscriptionTier: "free" },
  { name: "تحذير",     description: "إعطاء تحذير لعضو",                    category: "moderation", subscriptionTier: "free" },
  { name: "تحذيرات",   description: "عرض تحذيرات عضو",                     category: "moderation", subscriptionTier: "free" },
  { name: "مسح",       description: "مسح عدد من الرسائل",                  category: "moderation", subscriptionTier: "free" },
  { name: "قفل",       description: "قفل قناة من الكتابة",                 category: "moderation", subscriptionTier: "free" },
  { name: "فتح",       description: "فتح قناة مقفلة",                      category: "moderation", subscriptionTier: "free" },
  { name: "بطء",       description: "تفعيل وضع البطء في القناة",           category: "moderation", subscriptionTier: "free" },
  { name: "معلومات",   description: "عرض معلومات عضو",                     category: "moderation", subscriptionTier: "free" },
  { name: "السيرفر",   description: "عرض معلومات السيرفر",                 category: "moderation", subscriptionTier: "free" },
  { name: "إعدادات",   description: "عرض إعدادات البوت",                   category: "moderation", subscriptionTier: "free" },

  // ─── logs ───
  { name: "لوق ضبط",    description: "ضبط قناة لوق لحدث معين",   category: "logs", subscriptionTier: "silver", isSubcommand: true },
  { name: "لوق إزالة",  description: "إزالة قناة لوق",            category: "logs", subscriptionTier: "silver", isSubcommand: true },
  { name: "لوق الكل",   description: "ضبط كل اللوقات على قناة واحدة", category: "logs", subscriptionTier: "silver", isSubcommand: true },
  { name: "لوق تفعيل",  description: "تفعيل حدث لوق",             category: "logs", subscriptionTier: "silver", isSubcommand: true },
  { name: "لوق إيقاف",  description: "إيقاف حدث لوق",             category: "logs", subscriptionTier: "silver", isSubcommand: true },
  { name: "لوق حالة",   description: "عرض حالة كل اللوقات",       category: "logs", subscriptionTier: "silver", isSubcommand: true },
  { name: "لوق مسح",    description: "مسح كل إعدادات اللوق",      category: "logs", subscriptionTier: "silver", isSubcommand: true },

  // ─── protection ───
  { name: "حماية",      description: "إعدادات نظام الحماية",                category: "protection", subscriptionTier: "gold" },
  { name: "anti-raid",  description: "تفعيل/إيقاف الحماية من الـ Raid",    category: "protection", subscriptionTier: "gold" },
  { name: "anti-spam",  description: "تفعيل/إيقاف الحماية من السبام",      category: "protection", subscriptionTier: "gold" },
  { name: "anti-nuke",  description: "تفعيل/إيقاف الحماية من Nuking",      category: "protection", subscriptionTier: "gold" },

  // ─── welcome ───
  { name: "ترحيب",          description: "إعدادات رسالة الترحيب",          category: "welcome", subscriptionTier: "silver" },
  { name: "وداع",           description: "إعدادات رسالة الوداع",           category: "welcome", subscriptionTier: "silver" },
  { name: "ترحيب-معاينة",  description: "معاينة صورة الترحيب",            category: "welcome", subscriptionTier: "silver" },

  // ─── tickets ───
  { name: "تذاكر إعداد",   description: "إعداد نظام التذاكر",  category: "tickets", subscriptionTier: "gold", isSubcommand: true },
  { name: "تذاكر إعدادات", description: "تعديل إعدادات التذاكر", category: "tickets", subscriptionTier: "gold", isSubcommand: true },
  { name: "تذاكر معلومات", description: "عرض معلومات تذكرة",   category: "tickets", subscriptionTier: "gold", isSubcommand: true },

  // ─── roles ───
  { name: "رتبة",         description: "إعطاء/سحب رتبة من عضو",                category: "roles", subscriptionTier: "free" },
  { name: "إنشاء-رتبة",   description: "إنشاء رتبة جديدة",                      category: "roles", subscriptionTier: "free" },
  { name: "حذف-رتبة",     description: "حذف رتبة",                              category: "roles", subscriptionTier: "free" },
  { name: "رتب-تفاعل",   description: "إنشاء لوحة رتب بأزرار",                category: "roles", subscriptionTier: "silver" },

  // ─── xp ───
  { name: "مستوى",      description: "عرض مستواك أو مستوى عضو",        category: "xp", subscriptionTier: "free" },
  { name: "متصدرين",   description: "قائمة أفضل الأعضاء في XP",         category: "xp", subscriptionTier: "free" },
  { name: "xp إضافة",   description: "إضافة XP لعضو",                      category: "xp", subscriptionTier: "silver", isSubcommand: true },
  { name: "xp تصفير",   description: "تصفير XP لعضو",                      category: "xp", subscriptionTier: "silver", isSubcommand: true },

  // ─── economy ───
  { name: "رصيد",        description: "عرض رصيدك أو رصيد عضو",        category: "economy", subscriptionTier: "gold" },
  { name: "يومي",        description: "استلام مكافأة يومية",          category: "economy", subscriptionTier: "gold" },
  { name: "أسبوعي",      description: "استلام مكافأة أسبوعية",        category: "economy", subscriptionTier: "gold" },
  { name: "شغل",         description: "اشتغل واكسب كوينات",            category: "economy", subscriptionTier: "gold" },
  { name: "متجر",        description: "عرض المتجر والشراء",            category: "economy", subscriptionTier: "gold" },
  { name: "ممتلكاتي",   description: "عرض ممتلكاتك من المتجر",       category: "economy", subscriptionTier: "gold" },
  { name: "تحويل",       description: "تحويل كوينات لعضو",             category: "economy", subscriptionTier: "gold" },
  { name: "أثرياء",     description: "أغنى الأعضاء",                  category: "economy", subscriptionTier: "gold" },

  // ─── events ───
  { name: "فعالية",        description: "إنشاء وإدارة الفعاليات",   category: "events", subscriptionTier: "gold" },
  { name: "فعاليات",       description: "عرض الفعاليات الحالية",    category: "events", subscriptionTier: "gold" },

  // ─── stats ───
  { name: "احصائيات",      description: "إحصائيات السيرفر",         category: "stats", subscriptionTier: "silver" },
  { name: "احصائياتي",    description: "إحصائياتك الشخصية",        category: "stats", subscriptionTier: "silver" },

  // ─── ai ───
  { name: "ai",          description: "محادثة مع Lyn AI",                  category: "ai", subscriptionTier: "gold" },
  { name: "ai-إعادة",   description: "إعادة تعيين ذاكرة AI",             category: "ai", subscriptionTier: "gold" },
  { name: "ai-شخصية",   description: "ضبط شخصية AI",                       category: "ai", subscriptionTier: "gold" },

  // ─── info ───
  { name: "help",        description: "دليل أوامر البوت",        category: "info", subscriptionTier: "free" },
  { name: "ping",        description: "فحص استجابة البوت",       category: "info", subscriptionTier: "free" },
  { name: "صورة",        description: "عرض صورة عضو",            category: "info", subscriptionTier: "free" },
  { name: "بانر",        description: "عرض بانر عضو",            category: "info", subscriptionTier: "free" },
  { name: "اشتراك",     description: "معلومات الاشتراك",        category: "info", subscriptionTier: "free" },

  // ─── admin ───
  { name: "بريفكس",      description: "تغيير بريفكس البوت",     category: "admin", subscriptionTier: "silver" },
  { name: "config",      description: "إدارة إعدادات البوت",     category: "admin", subscriptionTier: "free" },
  { name: "نسخ-احتياطي", description: "إنشاء/استعادة نسخة احتياطية", category: "admin", subscriptionTier: "diamond" },
]

module.exports = {
  CATEGORIES_META,
  COMMANDS_REGISTRY,
}