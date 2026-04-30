// ══════════════════════════════════════════════════════════════════
//  /إحصائيات v2 — لوحة إحصائيات ذكية
//  المسار: commands/stats/index.js
// ══════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js")
const commandGuardSystem = require("../../systems/commandGuardSystem")

const handleSetup   = require("./setup")
const handleRefresh = require("./refresh")
const handleReport  = require("./report")
const handleDisable = require("./disable")

const ROUTES = {
  "إعداد":   handleSetup,
  "تحديث":   handleRefresh,
  "تقرير":   handleReport,
  "إيقاف":   handleDisable,
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("إحصائيات")
    .setDescription("لوحة إحصائيات السيرفر الذكية")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // ─── إعداد ───
    .addSubcommand(sub =>
      sub
        .setName("إعداد")
        .setDescription("إنشاء لوحة الإحصائيات في قناة محددة")
        .addChannelOption(o =>
          o.setName("القناة")
            .setDescription("القناة التي ستظهر فيها اللوحة (الافتراضي: القناة الحالية)")
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addChannelOption(o =>
          o.setName("قناة_الاحتفالات")
            .setDescription("القناة التي تُرسل فيها رسائل الـ Milestone")
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildText)
        )
    )

    // ─── تحديث ───
    .addSubcommand(sub =>
      sub
        .setName("تحديث")
        .setDescription("تحديث اللوحة فوراً بدون انتظار")
    )

    // ─── تقرير ───
    .addSubcommand(sub =>
      sub
        .setName("تقرير")
        .setDescription("عرض تقرير أسبوعي مفصل للسيرفر")
    )

    // ─── إيقاف ───
    .addSubcommand(sub =>
      sub
        .setName("إيقاف")
        .setDescription("إيقاف نظام الإحصائيات")
    ),

  helpMeta: {
    category: "stats",
    description: "لوحة إحصائيات ذكية — embed واحد يتحدث تلقائياً مع ذاكرة أسبوعية وإشعارات Milestone",
    subcommands: {
      "إعداد": {
        description: "إنشاء لوحة الإحصائيات",
        examples: [
          "/إحصائيات إعداد",
          "/إحصائيات إعداد القناة:#📊-إحصائيات قناة_الاحتفالات:#🎉-عام"
        ]
      },
      "تحديث": {
        description: "تحديث اللوحة فوراً",
        examples: ["/إحصائيات تحديث"]
      },
      "تقرير": {
        description: "تقرير أسبوعي مفصل",
        examples: ["/إحصائيات تقرير"]
      },
      "إيقاف": {
        description: "إيقاف النظام",
        examples: ["/إحصائيات إيقاف"]
      }
    },
    requirements: {
      userPermissions: ["Administrator"]
    }
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const isAdmin = commandGuardSystem.requireAdmin(interaction)
      if (!isAdmin) {
        return interaction.reply({ content: "❌ هذا الأمر للأدمن فقط", ephemeral: true })
      }

      const sub     = interaction.options.getSubcommand()
      const handler = ROUTES[sub]

      if (!handler) {
        return interaction.reply({ content: "❌ أمر غير معروف", ephemeral: true })
      }

      return await handler(interaction)

    } catch (err) {
      console.error("[STATS COMMAND ERROR]", err)
      const msg = "❌ حدث خطأ في نظام الإحصائيات."
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content: msg }).catch(() => {})
      }
      return interaction.reply({ content: msg, ephemeral: true }).catch(() => {})
    }
  }
}