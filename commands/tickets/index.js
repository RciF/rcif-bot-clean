// ══════════════════════════════════════════════════════════════════
//  /تذاكر — الأمر الرئيسي
//  المسار: commands/tickets/index.js
//
//  category-as-command: القسم كله = أمر واحد
//
//  كل ساب-كوماند موجود في ملف مستقل بنفس المجلد:
//   - setup.js     → إعداد
//   - settings.js  → إعدادات
//   - info.js      → معلومات
// ══════════════════════════════════════════════════════════════════

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js")

// استيراد الـ handlers
const handleSetup    = require("./setup")
const handleSettings = require("./settings")
const handleInfo     = require("./info")

// ══════════════════════════════════════════════════════════════════
//  ROUTING TABLE
// ══════════════════════════════════════════════════════════════════

const ROUTES = {
  "إعداد":   handleSetup,
  "إعدادات": handleSettings,
  "معلومات": handleInfo
}

// ══════════════════════════════════════════════════════════════════
//  COMMAND DEFINITION
// ══════════════════════════════════════════════════════════════════

module.exports = {
  data: new SlashCommandBuilder()
    .setName("تذاكر")
    .setDescription("إعداد وإدارة نظام التذاكر")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    // ─── إعداد ───
    .addSubcommand(sub =>
      sub
        .setName("إعداد")
        .setDescription("إعداد نظام التذاكر وإرسال رسالة فتح التذاكر")
        .addChannelOption(option =>
          option
            .setName("القناة")
            .setDescription("القناة التي سيتم إرسال رسالة فتح التذاكر فيها")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addChannelOption(option =>
          option
            .setName("الكاتيقوري")
            .setDescription("الكاتيقوري التي ستنشأ فيها قنوات التذاكر")
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildCategory)
        )
        .addChannelOption(option =>
          option
            .setName("قناة_اللوق")
            .setDescription("قناة سجل التذاكر (اللوق)")
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addRoleOption(option =>
          option
            .setName("رتبة_الدعم")
            .setDescription("رتبة فريق الدعم الذين يرون التذاكر")
            .setRequired(false)
        )
    )

    // ─── إعدادات ───
    .addSubcommand(sub =>
      sub
        .setName("إعدادات")
        .setDescription("تعديل إعدادات نظام التذاكر")
        .addIntegerOption(option =>
          option
            .setName("حد_التذاكر")
            .setDescription("الحد الأقصى للتذاكر المفتوحة لكل عضو")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(5)
        )
        .addIntegerOption(option =>
          option
            .setName("إغلاق_تلقائي")
            .setDescription("إغلاق التذكرة تلقائياً بعد عدم النشاط (بالساعات)")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(168)
        )
        .addStringOption(option =>
          option
            .setName("رسالة_الترحيب")
            .setDescription("رسالة الترحيب داخل التذكرة")
            .setRequired(false)
            .setMaxLength(500)
        )
        .addStringOption(option =>
          option
            .setName("حفظ_المحادثة")
            .setDescription("حفظ المحادثة عند الإغلاق")
            .setRequired(false)
            .addChoices(
              { name: "✅ مفعّل | Enabled",  value: "true"  },
              { name: "❌ معطّل | Disabled", value: "false" }
            )
        )
        .addStringOption(option =>
          option
            .setName("الحالة")
            .setDescription("تشغيل أو إيقاف نظام التذاكر")
            .setRequired(false)
            .addChoices(
              { name: "✅ تشغيل | Enable",  value: "on"  },
              { name: "❌ إيقاف | Disable", value: "off" }
            )
        )
    )

    // ─── معلومات ───
    .addSubcommand(sub =>
      sub
        .setName("معلومات")
        .setDescription("عرض إعدادات وإحصائيات نظام التذاكر")
    ),

  helpMeta: {
    category: "tickets",
    description: "نظام التذاكر المتكامل للدعم الفني وطلبات الأعضاء",
    subcommands: {
      "إعداد": {
        description: "إعداد نظام التذاكر وإرسال رسالة فتح التذاكر",
        examples: [
          "/تذاكر إعداد القناة:#support",
          "/تذاكر إعداد القناة:#support الكاتيقوري:📋 Tickets قناة_اللوق:#ticket-logs رتبة_الدعم:@Support"
        ],
        notes: [
          "الكاتيقوري: المكان اللي تُنشأ فيه قنوات التذاكر",
          "رتبة الدعم: اللي يقدرون يشوفون كل التذاكر",
          "يدعم 5 فئات تذاكر مختلفة + 4 أولويات"
        ]
      },
      "إعدادات": {
        description: "تعديل إعدادات نظام التذاكر (حد التذاكر، إغلاق تلقائي، رسالة الترحيب)",
        examples: [
          "/تذاكر إعدادات حد_التذاكر:3 إغلاق_تلقائي:48",
          "/تذاكر إعدادات رسالة_الترحيب:شكراً لفتح تذكرة! حفظ_المحادثة:✅ مفعّل"
        ],
        notes: [
          "الحد الأقصى للتذاكر المفتوحة لكل عضو: 1-5",
          "الإغلاق التلقائي بعد عدم النشاط: 1-168 ساعة",
          "حفظ المحادثة يحفظ كل الرسائل عند الإغلاق"
        ]
      },
      "معلومات": {
        description: "عرض إعدادات وإحصائيات نظام التذاكر",
        examples: ["/تذاكر معلومات"],
        notes: ["يعرض: عدد التذاكر المفتوحة، المغلقة، المستلمة"]
      }
    },
    requirements: {
      botRoleHierarchy: true,
      userPermissions: ["ManageGuild"],
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
          content: "❌ هذا الأمر داخل السيرفر فقط.",
          ephemeral: true
        })
      }

      const sub = interaction.options.getSubcommand()
      const handler = ROUTES[sub]

      if (!handler) {
        return interaction.reply({
          content: "❌ أمر فرعي غير معروف",
          ephemeral: true
        })
      }

      return await handler(interaction)

    } catch (error) {
      console.error("[TICKETS COMMAND ERROR]", error)

      const errMsg = "❌ حدث خطأ في نظام التذاكر."

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: errMsg, ephemeral: true }).catch(() => {})
      }
      return interaction.reply({ content: errMsg, ephemeral: true }).catch(() => {})
    }
  }
}