// ══════════════════════════════════════════════════════════════════
//  /ترحيب — الأمر الرئيسي
//  المسار: commands/admin/welcome/index.js
//
//  يحتوي على:
//   • بناء SlashCommandBuilder مع كل الساب-كوماندات
//   • دالة execute اللي تعمل routing للـ handler الصح
//
//  كل ساب-كوماند موجود في ملف مستقل بنفس المجلد:
//   - set.js     → ضبط
//   - enable.js  → تفعيل
//   - disable.js → إيقاف
//   - test.js    → اختبار
//   - status.js  → حالة
// ══════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js")
const commandGuardSystem = require("../../../systems/commandGuardSystem")

// استيراد الـ handlers
const handleSet     = require("./set")
const handleEnable  = require("./enable")
const handleDisable = require("./disable")
const handleTest    = require("./test")
const handleStatus  = require("./status")

// ══════════════════════════════════════════════════════════════════
//  ROUTING TABLE — الربط بين اسم الساب-كوماند والـ handler
// ══════════════════════════════════════════════════════════════════

const ROUTES = {
  "ضبط":     handleSet,
  "تفعيل":   handleEnable,
  "إيقاف":   handleDisable,
  "اختبار":  handleTest,
  "حالة":    handleStatus
}

// ══════════════════════════════════════════════════════════════════
//  COMMAND DEFINITION
// ══════════════════════════════════════════════════════════════════

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ترحيب")
    .setDescription("إعداد نظام الترحيب والوداع")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)

    // ── ضبط ──
    .addSubcommand(sub =>
      sub.setName("ضبط")
        .setDescription("ضبط إعدادات الترحيب")
        .addChannelOption(o =>
          o.setName("قناة_الترحيب")
            .setDescription("القناة التي ترسل فيها رسائل الترحيب")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addChannelOption(o =>
          o.setName("قناة_الوداع")
            .setDescription("القناة التي ترسل فيها رسائل الوداع")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addStringOption(o =>
          o.setName("رسالة_الترحيب")
            .setDescription("رسالة الترحيب — استخدم {user} {username} {server} {count} و \\n للسطر الجديد")
            .setRequired(false)
        )
        .addStringOption(o =>
          o.setName("رسالة_الوداع")
            .setDescription("رسالة الوداع — استخدم {username} {server} و \\n للسطر الجديد")
            .setRequired(false)
        )
    )

    // ── تفعيل ──
    .addSubcommand(sub =>
      sub.setName("تفعيل")
        .setDescription("تفعيل نظام الترحيب")
    )

    // ── إيقاف ──
    .addSubcommand(sub =>
      sub.setName("إيقاف")
        .setDescription("إيقاف نظام الترحيب")
    )

    // ── اختبار ──
    .addSubcommand(sub =>
      sub.setName("اختبار")
        .setDescription("اختبار رسالة الترحيب")
    )

    // ── حالة ──
    .addSubcommand(sub =>
      sub.setName("حالة")
        .setDescription("عرض الإعدادات الحالية")
    ),

  // ══════════════════════════════════════════════════════════════════
  //  EXECUTE — routing للـ handler المناسب
  // ══════════════════════════════════════════════════════════════════
  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({
          content: "❌ داخل السيرفر فقط",
          ephemeral: true
        })
      }

      const isAdmin = commandGuardSystem.requireAdmin(interaction)
      if (!isAdmin) {
        return interaction.reply({
          content: "❌ للأدمن فقط",
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
      console.error("[WELCOME ERROR]", err)

      const errMsg = "❌ حدث خطأ"

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: errMsg, ephemeral: true }).catch(() => {})
      }
      return interaction.reply({ content: errMsg, ephemeral: true }).catch(() => {})
    }
  }
}