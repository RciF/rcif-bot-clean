// ══════════════════════════════════════════════════════════════════
//  /لوق — الأمر الرئيسي
//  المسار: commands/admin/logs/index.js
//
//  يحتوي على:
//   • بناء SlashCommandBuilder مع كل الساب-كوماندات
//   • دالة execute اللي تعمل routing للـ handler الصح
//
//  كل ساب-كوماند موجود في ملف مستقل بنفس المجلد:
//   - set.js     → ضبط
//   - remove.js  → إزالة
//   - all.js     → الكل
//   - enable.js  → تفعيل
//   - disable.js → إيقاف
//   - status.js  → حالة
//   - reset.js   → مسح
// ══════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js")
const commandGuardSystem = require("../../../systems/commandGuardSystem")
const logger = require("../../../systems/loggerSystem")
const { EVENT_TYPES } = require("../../../utils/logSender")

// استيراد الـ handlers
const handleSet     = require("./set")
const handleRemove  = require("./remove")
const handleAll     = require("./all")
const handleEnable  = require("./enable")
const handleDisable = require("./disable")
const handleStatus  = require("./status")
const handleReset   = require("./reset")

// ══════════════════════════════════════════════════════════════════
//  ROUTING TABLE — الربط بين اسم الساب-كوماند والـ handler
// ══════════════════════════════════════════════════════════════════

const ROUTES = {
  "ضبط":   handleSet,
  "إزالة": handleRemove,
  "الكل":  handleAll,
  "تفعيل": handleEnable,
  "إيقاف": handleDisable,
  "حالة":  handleStatus,
  "مسح":   handleReset
}

// ══════════════════════════════════════════════════════════════════
//  COMMAND DEFINITION
// ══════════════════════════════════════════════════════════════════

module.exports = {
  data: new SlashCommandBuilder()
    .setName("لوق")
    .setDescription("إعدادات نظام السجلات")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)

    // ── ضبط ──
    .addSubcommand(sub =>
      sub.setName("ضبط")
        .setDescription("تحديد قناة لحدث معين")
        .addStringOption(option => {
          option.setName("الحدث")
            .setDescription("الحدث المراد ضبطه")
            .setRequired(true)
          for (const event of EVENT_TYPES) {
            option.addChoices({
              name: event.emoji + " " + event.label,
              value: event.key
            })
          }
          return option
        })
        .addChannelOption(option =>
          option.setName("القناة")
            .setDescription("القناة المراد إرسال اللوق فيها")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )

    // ── إزالة ──
    .addSubcommand(sub =>
      sub.setName("إزالة")
        .setDescription("إيقاف تسجيل حدث معين")
        .addStringOption(option => {
          option.setName("الحدث")
            .setDescription("الحدث المراد إيقافه")
            .setRequired(true)
          for (const event of EVENT_TYPES) {
            option.addChoices({
              name: event.emoji + " " + event.label,
              value: event.key
            })
          }
          return option
        })
    )

    // ── الكل ──
    .addSubcommand(sub =>
      sub.setName("الكل")
        .setDescription("إرسال جميع الأحداث في قناة واحدة")
        .addChannelOption(option =>
          option.setName("القناة")
            .setDescription("القناة المراد إرسال كل اللوقات فيها")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )

    // ── تفعيل / إيقاف / حالة / مسح ──
    .addSubcommand(sub =>
      sub.setName("تفعيل").setDescription("تفعيل نظام السجلات")
    )
    .addSubcommand(sub =>
      sub.setName("إيقاف").setDescription("إيقاف نظام السجلات بالكامل")
    )
    .addSubcommand(sub =>
      sub.setName("حالة").setDescription("عرض حالة نظام السجلات")
    )
    .addSubcommand(sub =>
      sub.setName("مسح").setDescription("مسح جميع إعدادات السجلات")
    ),

  helpMeta: {
    category: "logs",
    description: "نظام السجلات المتقدم — سجل أحداث السيرفر في قنوات مخصصة",
    subcommands: {
      "ضبط": {
        description: "تحديد قناة لتسجيل حدث معين (15+ نوع حدث)",
        examples: [
          "/لوق ضبط الحدث:🚫 الحظر القناة:#mod-logs",
          "/لوق ضبط الحدث:📝 تعديل الرسائل القناة:#message-logs",
          "/لوق ضبط الحدث:🚪 دخول/خروج الأعضاء القناة:#member-logs"
        ],
        notes: [
          "كل حدث يقدر يكون في قناة مختلفة",
          "البوت يحتاج صلاحية إرسال الرسائل في القناة المختارة"
        ]
      },
      "تفعيل": {
        description: "تفعيل نظام السجلات بالكامل (لازم تضبط قناة واحدة على الأقل أولاً)",
        examples: ["/لوق تفعيل"]
      },
      "إيقاف": {
        description: "إيقاف نظام السجلات بالكامل (الإعدادات تُحفظ)",
        examples: ["/لوق إيقاف"]
      },
      "حالة": {
        description: "عرض حالة نظام السجلات وكل القنوات المربوطة",
        examples: ["/لوق حالة"]
      },
      "الكل": {
        description: "إرسال جميع الأحداث في قناة واحدة (مفيد للسيرفرات الصغيرة)",
        examples: ["/لوق الكل القناة:#all-logs"]
      },
      "إزالة": {
        description: "إيقاف تسجيل حدث معين (يبقى مفعّل لباقي الأحداث)",
        examples: ["/لوق إزالة الحدث:🚫 الحظر"]
      },
      "مسح": {
        description: "مسح جميع إعدادات السجلات والبدء من جديد",
        examples: ["/لوق مسح"],
        notes: ["العملية لا تُلغى — كل القنوات المربوطة تُلغى"]
      }
    },
    requirements: {
      botRoleHierarchy: false,
      userPermissions: ["Administrator"],
      subscriptionTier: "silver"
    },
    cooldown: 0,
    relatedCommands: ["ضبط_لوق"]
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

      const isAdmin = commandGuardSystem.requireAdmin(interaction)
      if (!isAdmin) {
        return interaction.reply({
          content: "❌ هذا الأمر للأدمن فقط",
          ephemeral: true
        })
      }

      const sub = interaction.options.getSubcommand()
      const guildId = interaction.guild.id
      const handler = ROUTES[sub]

      if (!handler) {
        logger.warn("LOG_COMMAND_UNKNOWN_SUB", { sub })
        return interaction.reply({
          content: "❌ أمر فرعي غير معروف",
          ephemeral: true
        })
      }

      return await handler(interaction, guildId)

    } catch (error) {
      logger.error("LOG_COMMAND_FAILED", { error: error.message })

      const errMsg = "❌ حدث خطأ في أمر السجلات"

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errMsg, ephemeral: true }).catch(() => {})
      } else {
        await interaction.reply({ content: errMsg, ephemeral: true }).catch(() => {})
      }
    }
  }
}