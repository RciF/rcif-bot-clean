const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js")
const {
  ensureTables,
  getEventSettings,
  setManagerRole
} = require("./_eventShared")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("فعالية-إعداد")
    .setDescription("تحديد رتبة مديري الفعاليات — أدمن فقط")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(o =>
      o.setName("الرتبة")
        .setDescription("الرتبة اللي تقدر تتحكم بالفعاليات")
        .setRequired(false)
    )
    .addBooleanOption(o =>
      o.setName("إزالة")
        .setDescription("إزالة الرتبة المحددة وإرجاع الصلاحية للأدمن فقط")
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      if (!interaction.member?.permissions?.has("Administrator")) {
        return interaction.reply({ content: "❌ هذا الأمر للأدمن فقط", ephemeral: true })
      }

      await ensureTables()
      await interaction.deferReply({ ephemeral: true })

      const role   = interaction.options.getRole("الرتبة")
      const remove = interaction.options.getBoolean("إزالة") ?? false

      // ── إزالة الرتبة ──
      if (remove) {
        await setManagerRole(interaction.guild.id, null)
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xef4444)
              .setTitle("🗑️ تم إزالة رتبة المدير")
              .setDescription("الفعاليات الآن محمية بصلاحية **الأدمن فقط**.")
              .setTimestamp()
          ]
        })
      }

      // ── عرض الإعداد الحالي بدون تغيير ──
      if (!role) {
        const settings = await getEventSettings(interaction.guild.id)
        const current  = settings?.manager_role_id
          ? `<@&${settings.manager_role_id}>`
          : "غير محددة — الأدمن فقط"

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle("⚙️ إعدادات الفعاليات")
              .addFields(
                { name: "🏷️ رتبة المدير الحالية", value: current, inline: false },
                {
                  name: "📋 الأوامر المحمية",
                  value: "`/فعالية-إنشاء` `/فعالية-إلغاء` `/فعالية-بدء` `/فعالية-إنهاء` `/فعالية-تذكير`",
                  inline: false
                },
                {
                  name: "🌐 الأوامر العامة",
                  value: "`/فعالية-عرض` `/فعالية-قائمة`",
                  inline: false
                }
              )
              .setFooter({ text: "استخدم الخيار 'الرتبة' لتغيير رتبة المدير" })
              .setTimestamp()
          ]
        })
      }

      // ── تعيين الرتبة ──
      const botMember = interaction.guild.members.me
      if (role.position >= botMember.roles.highest.position) {
        return interaction.editReply({
          content: `❌ رتبة **${role.name}** أعلى من رتبة البوت — ارفع البوت أولاً.`
        })
      }

      if (role.managed) {
        return interaction.editReply({
          content: "❌ هذه رتبة بوت — اختر رتبة عادية."
        })
      }

      await setManagerRole(interaction.guild.id, role.id)

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x22c55e)
            .setTitle("✅ تم تحديد رتبة المدير")
            .addFields(
              { name: "🏷️ الرتبة", value: `${role}`, inline: true },
              { name: "🔐 الصلاحية", value: "التحكم الكامل بالفعاليات", inline: true },
              {
                name: "📋 الأوامر المتاحة لها",
                value: "`/فعالية-إنشاء` `/فعالية-إلغاء` `/فعالية-بدء` `/فعالية-إنهاء` `/فعالية-تذكير` `/فعالية-حضور`",
                inline: false
              }
            )
            .setFooter({ text: "الأدمن يبقى يتحكم بكل شيء دائماً" })
            .setTimestamp()
        ]
      })

    } catch (err) {
      console.error("[EVENT-SETUP ERROR]", err)
      const msg = "❌ حدث خطأ في إعداد الفعاليات."
      if (interaction.deferred) return interaction.editReply({ content: msg })
      if (!interaction.replied) return interaction.reply({ content: msg, ephemeral: true })
    }
  }
}