// ══════════════════════════════════════════════════════════════════
//  /حماية — الأمر الرئيسي
//  المسار: commands/protection/index.js
//
//  category-as-command: القسم كله = أمر واحد
//
//  كل ساب-كوماند موجود في ملف مستقل بنفس المجلد:
//   - status.js    → حالة
//   - spam.js      → سبام
//   - raid.js      → رايد
//   - nuke.js      → نيوك
//   - log.js       → لوق
//   - whitelist.js → وايتلست
//   - lockdown.js  → لوكداون
// ══════════════════════════════════════════════════════════════════

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js")

// استيراد الـ handlers
const handleStatus    = require("./status")
const handleSpam      = require("./spam")
const handleRaid      = require("./raid")
const handleNuke      = require("./nuke")
const handleLog       = require("./log")
const handleWhitelist = require("./whitelist")
const handleLockdown  = require("./lockdown")

// ══════════════════════════════════════════════════════════════════
//  ROUTING TABLE
// ══════════════════════════════════════════════════════════════════

const ROUTES = {
  "حالة":     handleStatus,
  "سبام":     handleSpam,
  "رايد":     handleRaid,
  "نيوك":     handleNuke,
  "لوق":      handleLog,
  "وايتلست":  handleWhitelist,
  "لوكداون":  handleLockdown
}

// ══════════════════════════════════════════════════════════════════
//  COMMAND DEFINITION
// ══════════════════════════════════════════════════════════════════

module.exports = {
  data: new SlashCommandBuilder()
    .setName("حماية")
    .setDescription("إعداد نظام الحماية (Anti-Spam, Anti-Raid, Anti-Nuke)")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // ─── حالة ───
    .addSubcommand(sub =>
      sub.setName("حالة")
        .setDescription("عرض إعدادات الحماية الحالية")
    )

    // ─── سبام ───
    .addSubcommand(sub =>
      sub.setName("سبام")
        .setDescription("إعداد نظام Anti-Spam")
        .addStringOption(o =>
          o.setName("الحالة").setDescription("تفعيل أو إيقاف").setRequired(true)
            .addChoices(
              { name: "✅ تفعيل", value: "on" },
              { name: "❌ إيقاف", value: "off" }
            )
        )
        .addIntegerOption(o =>
          o.setName("الحد").setDescription("عدد الرسائل قبل العقوبة (افتراضي: 5)")
            .setMinValue(2).setMaxValue(20)
        )
        .addIntegerOption(o =>
          o.setName("الفترة").setDescription("الفترة الزمنية بالثواني (افتراضي: 3)")
            .setMinValue(1).setMaxValue(30)
        )
        .addStringOption(o =>
          o.setName("العقوبة").setDescription("الإجراء عند الكشف")
            .addChoices(
              { name: "🔇 كتم | Mute", value: "mute" },
              { name: "👢 طرد | Kick", value: "kick" },
              { name: "🚫 حظر | Ban",  value: "ban"  }
            )
        )
        .addIntegerOption(o =>
          o.setName("مدة_الكتم").setDescription("مدة الكتم بالدقائق (افتراضي: 5)")
            .setMinValue(1).setMaxValue(1440)
        )
    )

    // ─── رايد ───
    .addSubcommand(sub =>
      sub.setName("رايد")
        .setDescription("إعداد نظام Anti-Raid")
        .addStringOption(o =>
          o.setName("الحالة").setDescription("تفعيل أو إيقاف").setRequired(true)
            .addChoices(
              { name: "✅ تفعيل", value: "on" },
              { name: "❌ إيقاف", value: "off" }
            )
        )
        .addIntegerOption(o =>
          o.setName("الحد").setDescription("عدد الأعضاء المنضمين قبل التفعيل (افتراضي: 10)")
            .setMinValue(3).setMaxValue(50)
        )
        .addIntegerOption(o =>
          o.setName("الفترة").setDescription("الفترة الزمنية بالثواني (افتراضي: 10)")
            .setMinValue(3).setMaxValue(60)
        )
        .addStringOption(o =>
          o.setName("العقوبة").setDescription("الإجراء عند الكشف")
            .addChoices(
              { name: "🔒 قفل السيرفر | Lockdown", value: "lockdown" },
              { name: "👢 طرد الجدد | Kick",       value: "kick"     }
            )
        )
    )

    // ─── نيوك ───
    .addSubcommand(sub =>
      sub.setName("نيوك")
        .setDescription("إعداد نظام Anti-Nuke")
        .addStringOption(o =>
          o.setName("الحالة").setDescription("تفعيل أو إيقاف").setRequired(true)
            .addChoices(
              { name: "✅ تفعيل", value: "on" },
              { name: "❌ إيقاف", value: "off" }
            )
        )
        .addIntegerOption(o =>
          o.setName("حد_القنوات").setDescription("حذف كم قناة قبل التفعيل (افتراضي: 3)")
            .setMinValue(1).setMaxValue(10)
        )
        .addIntegerOption(o =>
          o.setName("حد_الرتب").setDescription("حذف كم رتبة قبل التفعيل (افتراضي: 3)")
            .setMinValue(1).setMaxValue(10)
        )
        .addIntegerOption(o =>
          o.setName("حد_الحظر").setDescription("حظر كم عضو قبل التفعيل (افتراضي: 3)")
            .setMinValue(1).setMaxValue(10)
        )
        .addStringOption(o =>
          o.setName("العقوبة").setDescription("الإجراء على المنفذ")
            .addChoices(
              { name: "🚫 حظر | Ban",                value: "ban"          },
              { name: "👢 طرد | Kick",               value: "kick"         },
              { name: "🔑 سلب الصلاحيات | Strip",   value: "strip_roles"  }
            )
        )
    )

    // ─── لوق ───
    .addSubcommand(sub =>
      sub.setName("لوق")
        .setDescription("تحديد قناة سجل الحماية")
        .addChannelOption(o =>
          o.setName("القناة").setDescription("القناة المخصصة للوق").setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )

    // ─── وايتلست ───
    .addSubcommand(sub =>
      sub.setName("وايتلست")
        .setDescription("إضافة أو إزالة مستخدم/رتبة من القائمة البيضاء")
        .addStringOption(o =>
          o.setName("النوع").setDescription("نوع العنصر").setRequired(true)
            .addChoices(
              { name: "👤 مستخدم", value: "user" },
              { name: "🏷️ رتبة",    value: "role" }
            )
        )
        .addStringOption(o =>
          o.setName("الإجراء").setDescription("إضافة أو إزالة").setRequired(true)
            .addChoices(
              { name: "➕ إضافة", value: "add"    },
              { name: "➖ إزالة", value: "remove" }
            )
        )
        .addUserOption(o => o.setName("المستخدم").setDescription("المستخدم المراد إضافته/إزالته"))
        .addRoleOption(o => o.setName("الرتبة").setDescription("الرتبة المراد إضافتها/إزالتها"))
    )

    // ─── لوكداون ───
    .addSubcommand(sub =>
      sub.setName("لوكداون")
        .setDescription("تفعيل أو إيقاف Lockdown يدوياً")
        .addStringOption(o =>
          o.setName("الإجراء").setDescription("تفعيل أو إيقاف").setRequired(true)
            .addChoices(
              { name: "🔒 تفعيل", value: "on"  },
              { name: "🔓 إيقاف", value: "off" }
            )
        )
        .addStringOption(o =>
          o.setName("السبب").setDescription("سبب تفعيل/إيقاف اللوكداون")
        )
    ),

  helpMeta: {
    category: "protection",
    description: "أنظمة الحماية المتقدمة (Anti-Spam / Anti-Raid / Anti-Nuke)",
    subcommands: {
      "سبام": {
        description: "إعداد نظام Anti-Spam لكشف ومنع السبام التلقائي",
        examples: [
          "/حماية سبام الحالة:✅ تفعيل",
          "/حماية سبام الحالة:✅ تفعيل الحد:5 الفترة:3 العقوبة:🔇 كتم مدة_الكتم:5"
        ],
        notes: [
          "الحد الافتراضي: 5 رسائل في 3 ثواني",
          "العقوبات: كتم / طرد / حظر",
          "يكتشف تكرار الرسائل المتشابهة أيضاً"
        ]
      },
      "رايد": {
        description: "إعداد Anti-Raid لكشف هجمات الانضمام الجماعي",
        examples: [
          "/حماية رايد الحالة:✅ تفعيل الحد:10 الفترة:10 العقوبة:🔒 قفل السيرفر"
        ],
        notes: [
          "الافتراضي: 10 أعضاء جدد في 10 ثواني",
          "العقوبات: Lockdown (قفل السيرفر) أو Kick (طرد المنضمين)"
        ]
      },
      "نيوك": {
        description: "إعداد Anti-Nuke لكشف هجمات تدمير السيرفر",
        examples: [
          "/حماية نيوك الحالة:✅ تفعيل حد_القنوات:3 حد_الرتب:3 حد_الحظر:3"
        ],
        notes: [
          "يكشف: حذف القنوات، حذف الرتب، حظر جماعي للأعضاء",
          "العقوبات: حظر، طرد، أو سلب الصلاحيات",
          "حماية حقيقية ضد الـ insider attacks"
        ]
      },
      "لوكداون": {
        description: "تفعيل أو إيقاف Lockdown يدوياً (قفل كل القنوات فوراً)",
        examples: [
          "/حماية لوكداون الحالة:✅ تفعيل",
          "/حماية لوكداون الحالة:❌ إيقاف"
        ],
        notes: [
          "يقفل كل القنوات النصية في السيرفر",
          "استخدمه في حالات الطوارئ"
        ]
      },
      "وايتلست": {
        description: "إضافة أو إزالة مستخدم/رتبة من القائمة البيضاء (مستثنى من الحماية)",
        examples: [
          "/حماية وايتلست النوع:👤 مستخدم الإجراء:➕ إضافة المستخدم:@أحمد",
          "/حماية وايتلست النوع:🏷️ رتبة الإجراء:➖ إزالة الرتبة:@Trusted"
        ],
        notes: [
          "اختر النوع أولاً (مستخدم/رتبة) ثم حدد الـ المستخدم أو الرتبة المناسب",
          "لو اخترت 'مستخدم' لازم تحدد المستخدم (الرتبة تُتجاهل)",
          "لو اخترت 'رتبة' لازم تحدد الرتبة (المستخدم يُتجاهل)"
        ]
      },
      
      "لوق": {
        description: "تحديد قناة سجل الحماية (لتسجيل الاكتشافات والعقوبات)",
        examples: ["/حماية لوق القناة:#security-logs"]
      },
      "حالة": {
        description: "عرض إعدادات الحماية الحالية لكل الأنظمة",
        examples: ["/حماية حالة"]
      }
    },
    requirements: {
      botRoleHierarchy: true,
      userPermissions: ["Administrator"],
      subscriptionTier: "gold"
    },
    cooldown: 0,
    relatedCommands: []
  },

  // ══════════════════════════════════════════════════════════════════
  //  EXECUTE — routing للـ handler المناسب
  // ══════════════════════════════════════════════════════════════════
  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({
          content: "❌ هذا الأمر داخل السيرفر فقط",
          ephemeral: true
        })
      }

      const sub = interaction.options.getSubcommand()
      const guildId = interaction.guild.id
      const handler = ROUTES[sub]

      if (!handler) {
        return interaction.reply({
          content: "❌ أمر فرعي غير معروف",
          ephemeral: true
        })
      }

      return await handler(interaction, guildId)

    } catch (err) {
      console.error("[PROTECTION COMMAND ERROR]", err)

      const errMsg = "❌ حدث خطأ في نظام الحماية."

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: errMsg, ephemeral: true }).catch(() => {})
      }
      return interaction.reply({ content: errMsg, ephemeral: true }).catch(() => {})
    }
  }
}