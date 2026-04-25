// ══════════════════════════════════════════════════════════════════
//  /اعدادات_xp — الأمر الرئيسي
//  المسار: commands/admin/xp-settings/index.js
//
//  يحتوي على:
//   • بناء SlashCommandBuilder مع كل الساب-كوماندات
//   • دالة execute اللي تعمل routing للـ handler الصح
//
//  كل ساب-كوماند موجود في ملف مستقل بنفس المجلد:
//   - level-up-channel.js  → قناة_الصعود
//   - disable-level-up.js  → تعطيل_قناة
//   - multiplier.js        → مضاعف_xp
//   - disable-channel.js   → تعطيل_قناة_xp
//   - status.js            → حالة
// ══════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js")
const commandGuardSystem = require("../../../systems/commandGuardSystem")
const { ensureSettings } = require("./_shared")

// استيراد الـ handlers
const handleLevelUpChannel  = require("./level-up-channel")
const handleDisableLevelUp  = require("./disable-level-up")
const handleMultiplier      = require("./multiplier")
const handleDisableChannel  = require("./disable-channel")
const handleStatus          = require("./status")

// ══════════════════════════════════════════════════════════════════
//  ROUTING TABLE — الربط بين اسم الساب-كوماند والـ handler
// ══════════════════════════════════════════════════════════════════

const ROUTES = {
  "قناة_الصعود":     handleLevelUpChannel,
  "تعطيل_قناة":      handleDisableLevelUp,
  "مضاعف_xp":        handleMultiplier,
  "تعطيل_قناة_xp":   handleDisableChannel,
  "حالة":            handleStatus
}

// ══════════════════════════════════════════════════════════════════
//  COMMAND DEFINITION
// ══════════════════════════════════════════════════════════════════

module.exports = {
  data: new SlashCommandBuilder()
    .setName("اعدادات_xp")
    .setDescription("إعدادات نظام XP والمستويات")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // ── قناة_الصعود ──
    .addSubcommand(sub =>
      sub
        .setName("قناة_الصعود")
        .setDescription("تحديد القناة التي تُرسل فيها رسائل الصعود للمستوى")
        .addChannelOption(option =>
          option
            .setName("القناة")
            .setDescription("القناة المخصصة لرسائل الصعود")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )

    // ── تعطيل_قناة ──
    .addSubcommand(sub =>
      sub
        .setName("تعطيل_قناة")
        .setDescription("إيقاف رسائل الصعود (ترسل في نفس القناة)")
    )

    // ── مضاعف_xp ──
    .addSubcommand(sub =>
      sub
        .setName("مضاعف_xp")
        .setDescription("ضبط مضاعف XP لجميع الأعضاء")
        .addNumberOption(option =>
          option
            .setName("المضاعف")
            .setDescription("مضاعف XP (مثال: 2 = ضعف XP، 0.5 = نص XP)")
            .setRequired(true)
            .setMinValue(0.1)
            .setMaxValue(10)
        )
    )

    // ── تعطيل_قناة_xp ──
    .addSubcommand(sub =>
      sub
        .setName("تعطيل_قناة_xp")
        .setDescription("منع كسب XP في قناة معينة")
        .addChannelOption(option =>
          option
            .setName("القناة")
            .setDescription("القناة المراد تعطيل XP فيها")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )

    // ── حالة ──
    .addSubcommand(sub =>
      sub
        .setName("حالة")
        .setDescription("عرض إعدادات XP الحالية للسيرفر")
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
          content: "❌ هذا الأمر للإدارة فقط",
          ephemeral: true
        })
      }

      const sub = interaction.options.getSubcommand()
      const guildId = interaction.guild.id

      // ✅ تأكد من وجود صف السيرفر (موحّد لكل الـ handlers)
      await ensureSettings(guildId)

      const handler = ROUTES[sub]

      if (!handler) {
        return interaction.reply({
          content: "❌ أمر فرعي غير معروف",
          ephemeral: true
        })
      }

      return await handler(interaction, guildId)

    } catch (error) {
      console.error("[XP SETTINGS ERROR]", error)

      const errMsg = "❌ حدث خطأ في الإعدادات."

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: errMsg, ephemeral: true }).catch(() => {})
      }
      return interaction.reply({ content: errMsg, ephemeral: true }).catch(() => {})
    }
  }
}