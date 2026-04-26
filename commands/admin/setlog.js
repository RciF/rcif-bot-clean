// commands/admin/setlog.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require("discord.js")
const databaseSystem = require("../../systems/databaseSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ضبط_لوق")
    .setDescription("تحديد قناة اللوق لتسجيل أحداث الإشراف")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option
        .setName("القناة")
        .setDescription("القناة المخصصة للوق (اتركها فارغة لإيقاف اللوق)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  helpMeta: {
    category: "moderation",
    aliases: ["setlog", "ضبط_لوق"],
    description: "تحديد قناة اللوق لتسجيل أحداث الإشراف (الحظر، الطرد، الكتم، إلخ)",
    options: [
      { name: "القناة", description: "القناة المخصصة للوق (اتركها فاضية لإيقاف اللوق)", required: false }
    ],
    requirements: {
      botRoleHierarchy: false,
      userPermissions: ["Administrator"],
      subscriptionTier: "free"
    },
    cooldown: 0,
    relatedCommands: ["لوق ضبط", "لوق حالة"],
    examples: [
      "/ضبط_لوق القناة:#mod-logs",
      "/ضبط_لوق (لإيقاف اللوق)"
    ],
    notes: [
      "هذا اللوق خاص بأوامر الإشراف فقط (حظر، طرد، كتم، إلخ)",
      "للوق المتقدم بكل الأحداث استخدم /لوق ضبط (Silver+)",
      "البوت يحتاج صلاحيات إرسال الرسائل في القناة المحددة"
    ]
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const channel = interaction.options.getChannel("القناة")

      // ── إيقاف اللوق ──
      if (!channel) {
        await databaseSystem.query(
          "UPDATE guilds SET log_channel_id = NULL WHERE id = $1",
          [interaction.guild.id]
        )

        const embed = new EmbedBuilder()
          .setColor(0x94a3b8)
          .setTitle("📋 اللوق مُعطّل")
          .setDescription("تم إيقاف تسجيل الأحداث. لن يتم إرسال أي سجلات.")
          .setTimestamp()

        return interaction.reply({ embeds: [embed] })
      }

      // ── تفعيل اللوق ──
      // تحقق إن البوت يقدر يكتب في القناة
      const botMember = interaction.guild.members.me
      const perms = channel.permissionsFor(botMember)
      if (!perms.has("SendMessages") || !perms.has("EmbedLinks")) {
        return interaction.reply({
          content: `❌ البوت ما يملك صلاحية الكتابة أو إرسال Embeds في ${channel}`,
          ephemeral: true
        })
      }

      await databaseSystem.query(
        "UPDATE guilds SET log_channel_id = $1 WHERE id = $2",
        [channel.id, interaction.guild.id]
      )

      const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle("✅ تم ضبط قناة اللوق")
        .setDescription(`سيتم إرسال جميع سجلات الإشراف إلى ${channel}`)
        .addFields(
          { name: "📋 الأحداث المسجّلة", value:
            "حظر • طرد • كتم • فك كتم • تحذير\n" +
            "مسح رسائل • قفل/فتح قناة • تعديل رتبة\n" +
            "تغيير لقب • سلو مود • تذاكر (فتح/إغلاق/استلام/حذف)",
            inline: false
          }
        )
        .setTimestamp()

      // ── إرسال رسالة اختبار في قناة اللوق ──
      try {
        const testEmbed = new EmbedBuilder()
          .setColor(0x0ea5e9)
          .setTitle("📋 تم تفعيل نظام اللوق")
          .setDescription(`هذه القناة الآن مخصصة لتسجيل أحداث الإشراف في **${interaction.guild.name}**`)
          .setTimestamp()

        await channel.send({ embeds: [testEmbed] })
      } catch {
        // فشل إرسال رسالة الاختبار — مش مشكلة
      }

      return interaction.reply({ embeds: [embed] })

    } catch (err) {
      console.error("[SETLOG ERROR]", err)
      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء ضبط قناة اللوق.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء ضبط قناة اللوق.", ephemeral: true })
    }
  }
}