// ══════════════════════════════════════════════════════════════════
//  /تخصيص_بطاقة — الأمر الرئيسي
//  المسار: commands/xp/customize-card/index.js
//
//  كل ساب-كوماند موجود في ملف مستقل:
//   - color.js       → لون
//   - background.js  → خلفية
//   - avatar.js      → صورة_شخصية
//   - preview.js     → معاينة
//   - reset.js       → إعادة_تعيين
//   - status.js      → حالة
// ══════════════════════════════════════════════════════════════════

const { SlashCommandBuilder } = require("discord.js")
const { THEME_CHOICES } = require("./_shared")

// ── استيراد الـ handlers ──
const handleColor      = require("./color")
const handleBackground = require("./background")
const handleAvatar     = require("./avatar")
const handlePreview    = require("./preview")
const handleReset      = require("./reset")
const handleStatus     = require("./status")

// ── Routing Table ──
const ROUTES = {
  "لون":            handleColor,
  "خلفية":          handleBackground,
  "صورة_شخصية":    handleAvatar,
  "معاينة":         handlePreview,
  "إعادة_تعيين":   handleReset,
  "حالة":           handleStatus,
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("تخصيص_بطاقة")
    .setDescription("خصص شكل بطاقة مستواك (يحتاج اشتراك شخصي)")
    .setDMPermission(false)

    // ── لون ──
    .addSubcommand(sub =>
      sub
        .setName("لون")
        .setDescription("تغيير لون ثيم البطاقة")
        .addStringOption(o =>
          o.setName("الثيم")
            .setDescription("اختر اللون")
            .setRequired(true)
            .addChoices(...THEME_CHOICES)
        )
    )

    // ── خلفية ──
    .addSubcommand(sub =>
      sub
        .setName("خلفية")
        .setDescription("تغيير خلفية البطاقة برابط صورة")
        .addStringOption(o =>
          o.setName("الرابط")
            .setDescription("رابط الصورة (jpg/png/webp)")
            .setRequired(true)
        )
    )

    // ── صورة شخصية ──
    .addSubcommand(sub =>
      sub
        .setName("صورة_شخصية")
        .setDescription("تغيير الصورة الشخصية على البطاقة")
        .addStringOption(o =>
          o.setName("الرابط")
            .setDescription("رابط الصورة (jpg/png/webp)")
            .setRequired(true)
        )
    )

    // ── معاينة ──
    .addSubcommand(sub =>
      sub
        .setName("معاينة")
        .setDescription("معاينة بطاقتك الحالية مع كل التخصيصات")
    )

    // ── إعادة تعيين ──
    .addSubcommand(sub =>
      sub
        .setName("إعادة_تعيين")
        .setDescription("إعادة البطاقة للشكل الافتراضي")
    )

    // ── حالة ──
    .addSubcommand(sub =>
      sub
        .setName("حالة")
        .setDescription("عرض تخصيصاتك الحالية وحالة اشتراكك")
    ),

  helpMeta: {
    category: "xp",
    aliases: ["customize-card", "card-customize", "تخصيص_بطاقة"],
    description: "تخصيص بطاقة المستوى الشخصية (يحتاج اشتراك شخصي)",
    requirements: {
      botRoleHierarchy: false,
      userPermissions: [],
      subscriptionTier: "personal_premium"
    },
    cooldown: 5,
    relatedCommands: ["مستوى"],
    examples: [
      "/تخصيص_بطاقة لون الثيم:🔵 أزرق",
      "/تخصيص_بطاقة خلفية الرابط:https://...",
      "/تخصيص_بطاقة معاينة",
      "/تخصيص_بطاقة حالة"
    ],
    notes: [
      "يحتاج اشتراك شخصي $2.99/شهر أو $18/سنة",
      "التخصيص عالمي — يظهر في كل السيرفرات",
      "الخلفية يجب أن تكون رابط صورة مباشر"
    ]
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({
          content: "❌ هذا الأمر داخل السيرفر فقط",
          flags: 64
        })
      }

      const sub = interaction.options.getSubcommand()
      const handler = ROUTES[sub]

      if (!handler) {
        return interaction.reply({
          content: "❌ أمر فرعي غير معروف",
          flags: 64
        })
      }

      return await handler(interaction)

    } catch (err) {
      console.error("[CARD CUSTOMIZE ERROR]", err)

      const msg = "❌ حدث خطأ في تخصيص البطاقة."
      if (interaction.deferred) return interaction.editReply({ content: msg })
      if (!interaction.replied) return interaction.reply({ content: msg, flags: 64 })
    }
  }
}