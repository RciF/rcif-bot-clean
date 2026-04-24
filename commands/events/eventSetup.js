const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js")
const {
  ensureTables,
  getEventSettings,
  setManagerRole,
  setLogChannel
} = require("./_eventShared")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("فعالية-إعداد")
    .setDescription("إعداد نظام الفعاليات — أدمن فقط")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommandGroup(g => g
      .setName("رتبة")
      .setDescription("إعداد رتبة مديري الفعاليات")
      .addSubcommand(s => s
        .setName("تعيين")
        .setDescription("تعيين رتبة مديري الفعاليات")
        .addRoleOption(o => o.setName("الرتبة").setDescription("الرتبة المسؤولة عن الفعاليات").setRequired(true))
      )
      .addSubcommand(s => s
        .setName("إزالة")
        .setDescription("إزالة رتبة المدير — يرجع للأدمن فقط")
      )
    )
    .addSubcommandGroup(g => g
      .setName("لوق")
      .setDescription("إعداد قناة سجل الفعاليات")
      .addSubcommand(s => s
        .setName("تعيين")
        .setDescription("تعيين قناة لوق الفعاليات")
        .addChannelOption(o => o
          .setName("القناة")
          .setDescription("القناة اللي تنسجل فيها العمليات")
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText)
        )
      )
      .addSubcommand(s => s
        .setName("إزالة")
        .setDescription("إيقاف تسجيل الفعاليات")
      )
    )
    .addSubcommand(s => s
      .setName("حالة")
      .setDescription("عرض إعدادات الفعاليات الحالية")
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

      const group = interaction.options.getSubcommandGroup(false)
      const sub   = interaction.options.getSubcommand()

      // ══════════════════════════════════════
      //  رتبة → تعيين
      // ══════════════════════════════════════
      if (group === "رتبة" && sub === "تعيين") {
        const role      = interaction.options.getRole("الرتبة")
        const botMember = interaction.guild.members.me

        if (role.position >= botMember.roles.highest.position) {
          return interaction.editReply({ content: `❌ رتبة **${role.name}** أعلى من رتبة البوت.` })
        }

        if (role.managed) {
          return interaction.editReply({ content: "❌ هذه رتبة بوت — اختر رتبة عادية." })
        }

        await setManagerRole(interaction.guild.id, role.id)

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x22c55e)
              .setTitle("✅ تم تعيين رتبة المدير")
              .addFields(
                { name: "🏷️ الرتبة",    value: `${role}`,                      inline: true },
                { name: "🔐 الصلاحية",  value: "التحكم الكامل بالفعاليات",      inline: true }
              )
              .addFields({
                name: "📋 الأوامر المتاحة لها",
                value: "`/فعالية-إنشاء` `/فعالية-إلغاء` `/فعالية-بدء` `/فعالية-إنهاء` `/فعالية-تذكير` `/فعالية-حضور`"
              })
              .setFooter({ text: "الأدمن يبقى يتحكم بكل شيء دائماً" })
              .setTimestamp()
          ]
        })
      }

      // ══════════════════════════════════════
      //  رتبة → إزالة
      // ══════════════════════════════════════
      if (group === "رتبة" && sub === "إزالة") {
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

      // ══════════════════════════════════════
      //  لوق → تعيين
      // ══════════════════════════════════════
      if (group === "لوق" && sub === "تعيين") {
        const channel = interaction.options.getChannel("القناة")

        const botPerms = channel.permissionsFor(interaction.guild.members.me)
        if (!botPerms?.has(["SendMessages", "EmbedLinks"])) {
          return interaction.editReply({ content: `❌ البوت ما يقدر يرسل في ${channel}.` })
        }

        await setLogChannel(interaction.guild.id, channel.id)

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x22c55e)
              .setTitle("✅ تم تعيين قناة اللوق")
              .setDescription(`كل عمليات الفعاليات ستُسجَّل في ${channel}`)
              .setTimestamp()
          ]
        })
      }

      // ══════════════════════════════════════
      //  لوق → إزالة
      // ══════════════════════════════════════
      if (group === "لوق" && sub === "إزالة") {
        await setLogChannel(interaction.guild.id, null)
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xef4444)
              .setTitle("🗑️ تم إيقاف اللوق")
              .setDescription("لن تُسجَّل عمليات الفعاليات بعد الآن.")
              .setTimestamp()
          ]
        })
      }

      // ══════════════════════════════════════
      //  حالة — عرض الإعدادات
      // ══════════════════════════════════════
      if (sub === "حالة") {
        const settings = await getEventSettings(interaction.guild.id)

        const managerRole = settings?.manager_role_id
          ? `<@&${settings.manager_role_id}>`
          : "غير محددة — الأدمن فقط"

        const logChannel = settings?.log_channel_id
          ? `<#${settings.log_channel_id}>`
          : "غير محددة"

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle("⚙️ إعدادات الفعاليات")
              .addFields(
                { name: "🏷️ رتبة المدير",    value: managerRole, inline: true },
                { name: "📋 قناة اللوق",      value: logChannel,  inline: true },
                {
                  name: "🔒 الأوامر المحمية",
                  value: "`/فعالية-إنشاء` `/فعالية-إلغاء` `/فعالية-بدء` `/فعالية-إنهاء` `/فعالية-تذكير` `/فعالية-حضور`"
                },
                {
                  name: "🌐 الأوامر العامة",
                  value: "`/فعالية-عرض` `/فعالية-قائمة`"
                }
              )
              .setFooter({ text: "استخدم /فعالية-إعداد رتبة تعيين لتغيير رتبة المدير" })
              .setTimestamp()
          ]
        })
      }

    } catch (err) {
      console.error("[EVENT-SETUP ERROR]", err)
      const msg = "❌ حدث خطأ في إعداد الفعاليات."
      if (interaction.deferred) return interaction.editReply({ content: msg })
      if (!interaction.replied) return interaction.reply({ content: msg, ephemeral: true })
    }
  }
}