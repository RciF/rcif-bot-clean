// ══════════════════════════════════════════════════════════════════
//  /إعلان — الأمر الرئيسي
//  المسار: commands/admin/announce/index.js
//
//  يحتوي على:
//   • بناء SlashCommandBuilder مع كل الساب-كوماندات
//   • دالة execute اللي تعمل routing للـ handler الصح
//
//  كل ساب-كوماند موجود في ملف مستقل بنفس المجلد:
//   - send.js    → إرسال
//   - edit.js    → تعديل
//   - delete.js  → حذف
// ══════════════════════════════════════════════════════════════════

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js")

const commandGuardSystem = require("../../../systems/commandGuardSystem")
const logger = require("../../../systems/loggerSystem")
const { COLOR_CHOICES } = require("./_shared")

// استيراد الـ handlers
const handleSend   = require("./send")
const handleEdit   = require("./edit")
const handleDelete = require("./delete")

// ══════════════════════════════════════════════════════════════════
//  ROUTING TABLE
// ══════════════════════════════════════════════════════════════════

const ROUTES = {
  "إرسال": handleSend,
  "تعديل": handleEdit,
  "حذف":   handleDelete
}

// ══════════════════════════════════════════════════════════════════
//  COMMAND DEFINITION
// ══════════════════════════════════════════════════════════════════

module.exports = {
  data: new SlashCommandBuilder()
    .setName("إعلان")
    .setDescription("إرسال وإدارة الإعلانات الرسمية")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)

    // ══════════════════════════════════════
    //  إرسال
    // ══════════════════════════════════════
    .addSubcommand(sub =>
      sub
        .setName("إرسال")
        .setDescription("إرسال إعلان جديد بشكل Embed احترافي")
        .addChannelOption(option =>
          option
            .setName("القناة")
            .setDescription("القناة المستهدفة")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addStringOption(option =>
          option
            .setName("العنوان")
            .setDescription("عنوان الإعلان")
            .setRequired(true)
            .setMaxLength(256)
        )
        .addStringOption(option =>
          option
            .setName("المحتوى")
            .setDescription("نص الإعلان (استخدم \\n للسطر الجديد)")
            .setRequired(true)
            .setMaxLength(4000)
        )
        .addStringOption(option =>
          option
            .setName("اللون")
            .setDescription("لون الـ embed")
            .setRequired(false)
            .addChoices(...COLOR_CHOICES)
        )
        .addStringOption(option =>
          option
            .setName("الصورة")
            .setDescription("رابط الصورة الكبيرة (اختياري)")
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("صورة_مصغرة")
            .setDescription("رابط الصورة المصغرة في الزاوية (اختياري)")
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("التذييل")
            .setDescription("نص التذييل أسفل الـ embed (اختياري)")
            .setRequired(false)
            .setMaxLength(2048)
        )
        .addStringOption(option =>
          option
            .setName("منشن")
            .setDescription("منشن قبل الإعلان (اختياري)")
            .setRequired(false)
            .addChoices(
              { name: "الكل | @everyone",   value: "everyone" },
              { name: "الموجودين | @here", value: "here"     },
              { name: "بدون منشن | None",   value: "none"     }
            )
        )
    )

    // ══════════════════════════════════════
    //  تعديل
    // ══════════════════════════════════════
    .addSubcommand(sub =>
      sub
        .setName("تعديل")
        .setDescription("تعديل إعلان أرسله البوت سابقاً")
        .addChannelOption(option =>
          option
            .setName("القناة")
            .setDescription("قناة الإعلان الأصلية")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addStringOption(option =>
          option
            .setName("معرف_الرسالة")
            .setDescription("Message ID للإعلان المراد تعديله")
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("العنوان")
            .setDescription("العنوان الجديد (اختياري)")
            .setRequired(false)
            .setMaxLength(256)
        )
        .addStringOption(option =>
          option
            .setName("المحتوى")
            .setDescription("النص الجديد (استخدم \\n للسطر الجديد)")
            .setRequired(false)
            .setMaxLength(4000)
        )
        .addStringOption(option =>
          option
            .setName("اللون")
            .setDescription("لون جديد (اختياري)")
            .setRequired(false)
            .addChoices(...COLOR_CHOICES)
        )
        .addStringOption(option =>
          option
            .setName("الصورة")
            .setDescription("رابط صورة جديد (اكتب \"إزالة\" لحذف الحالية)")
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("صورة_مصغرة")
            .setDescription("رابط صورة مصغرة جديد (اكتب \"إزالة\" لحذف الحالية)")
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("التذييل")
            .setDescription("تذييل جديد (اكتب \"إزالة\" لحذف الحالي)")
            .setRequired(false)
            .setMaxLength(2048)
        )
    )

    // ══════════════════════════════════════
    //  حذف
    // ══════════════════════════════════════
    .addSubcommand(sub =>
      sub
        .setName("حذف")
        .setDescription("حذف إعلان أرسله البوت")
        .addChannelOption(option =>
          option
            .setName("القناة")
            .setDescription("قناة الإعلان")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addStringOption(option =>
          option
            .setName("معرف_الرسالة")
            .setDescription("Message ID للإعلان المراد حذفه")
            .setRequired(true)
        )
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
      logger.error("ANNOUNCE_COMMAND_FAILED", { error: error.message })

      const errMsg = "❌ فشل تنفيذ الأمر"

      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content: errMsg }).catch(() => {})
      }
      return interaction.reply({
        content: errMsg,
        ephemeral: true
      }).catch(() => {})
    }
  }
}