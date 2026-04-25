// ══════════════════════════════════════════════════════════════════
//  /إحصائيات — الأمر الرئيسي
//  المسار: commands/stats/index.js
//
//  category-as-command: القسم كله = أمر واحد
//  (الـ commandHandler يتعرّف على هذا من وجود index.js في جذر القسم)
//
//  كل ساب-كوماند موجود في ملف مستقل بنفس المجلد:
//   - auto.js    → تلقائي
//   - add.js     → إضافة
//   - remove.js  → حذف
//   - clear.js   → مسح
//   - update.js  → تحديث
//   - status.js  → حالة
// ══════════════════════════════════════════════════════════════════

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js")

const commandGuardSystem = require("../../systems/commandGuardSystem")
const { STAT_TYPE_CHOICES } = require("./_shared")

// استيراد الـ handlers
const handleAuto   = require("./auto")
const handleAdd    = require("./add")
const handleRemove = require("./remove")
const handleClear  = require("./clear")
const handleUpdate = require("./update")
const handleStatus = require("./status")

// ══════════════════════════════════════════════════════════════════
//  ROUTING TABLE
// ══════════════════════════════════════════════════════════════════

const ROUTES = {
  "تلقائي": handleAuto,
  "إضافة":  handleAdd,
  "حذف":    handleRemove,
  "مسح":    handleClear,
  "تحديث":  handleUpdate,
  "حالة":   handleStatus
}

// ══════════════════════════════════════════════════════════════════
//  COMMAND DEFINITION
// ══════════════════════════════════════════════════════════════════

module.exports = {
  data: new SlashCommandBuilder()
    .setName("إحصائيات")
    .setDescription("إعداد قنوات إحصائيات السيرفر التلقائية")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // ─── تلقائي ───
    .addSubcommand(sub =>
      sub
        .setName("تلقائي")
        .setDescription("إنشاء كل قنوات الإحصائيات تلقائياً في كاتيقوري جديدة")
        .addBooleanOption(o =>
          o.setName("شامل")
            .setDescription("تضمين إحصائيات إضافية (متصل / بوتات / بشر)")
            .setRequired(false)
        )
    )

    // ─── إضافة ───
    .addSubcommand(sub =>
      sub
        .setName("إضافة")
        .setDescription("إضافة قناة إحصائية واحدة")
        .addStringOption(o =>
          o.setName("النوع")
            .setDescription("نوع الإحصائية")
            .setRequired(true)
            .addChoices(...STAT_TYPE_CHOICES)
        )
        .addChannelOption(o =>
          o.setName("الكاتيقوري")
            .setDescription("الكاتيقوري التي ستوضع فيها القناة (اختياري)")
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildCategory)
        )
    )

    // ─── حذف ───
    .addSubcommand(sub =>
      sub
        .setName("حذف")
        .setDescription("حذف قناة إحصائية")
        .addStringOption(o =>
          o.setName("النوع")
            .setDescription("نوع الإحصائية")
            .setRequired(true)
            .addChoices(...STAT_TYPE_CHOICES)
        )
        .addBooleanOption(o =>
          o.setName("حذف_القناة")
            .setDescription("حذف القناة نفسها من السيرفر؟ (افتراضي: لا)")
            .setRequired(false)
        )
    )

    // ─── مسح ───
    .addSubcommand(sub =>
      sub
        .setName("مسح")
        .setDescription("مسح كل قنوات الإحصائيات وحذفها")
    )

    // ─── تحديث ───
    .addSubcommand(sub =>
      sub
        .setName("تحديث")
        .setDescription("تحديث كل القنوات الآن يدوياً")
    )

    // ─── حالة ───
    .addSubcommand(sub =>
      sub
        .setName("حالة")
        .setDescription("عرض الإحصائيات الحالية للسيرفر")
    ),

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

      // التحقق من صلاحية البوت
      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({
          content: "❌ البوت يحتاج صلاحية **إدارة القنوات** عشان يشتغل نظام الإحصائيات.",
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

    } catch (err) {
      console.error("[STATS COMMAND ERROR]", err)

      const errMsg = "❌ حدث خطأ في نظام الإحصائيات."

      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content: errMsg }).catch(() => {})
      }
      return interaction.reply({ content: errMsg, ephemeral: true }).catch(() => {})
    }
  }
}