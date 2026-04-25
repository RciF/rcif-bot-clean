// ══════════════════════════════════════════════════════════════════
//  /تذاكر معلومات — عرض إعدادات وإحصائيات نظام التذاكر
//  المسار: commands/tickets/info.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const ticketSystem = require("../../systems/ticketSystem")
const { COLORS } = require("./_shared")

module.exports = async function handleInfo(interaction) {
  await interaction.deferReply({ ephemeral: true })

  const settings = await ticketSystem.getSettings(interaction.guild.id)
  const stats    = await ticketSystem.getTicketStats(interaction.guild.id)

  // ══════════════════════════════════════
  //  لو النظام غير معدّ
  // ══════════════════════════════════════
  if (!settings) {
    const noSetupEmbed = new EmbedBuilder()
      .setColor(COLORS.warning)
      .setTitle("⚠️ نظام التذاكر غير معدّ")
      .setDescription("استخدم `/تذاكر إعداد` لتفعيل النظام.")

    return interaction.editReply({ embeds: [noSetupEmbed] })
  }

  // ══════════════════════════════════════
  //  بناء معلومات الكاتيقوري والقنوات والرتب
  // ══════════════════════════════════════
  const categoryName = settings.category_id
    ? interaction.guild.channels.cache.get(settings.category_id)?.name || "غير موجود"
    : "غير محدد"

  const logChannelName = settings.log_channel_id
    ? `<#${settings.log_channel_id}>`
    : "غير محدد"

  const supportRoleName = settings.support_role_id
    ? `<@&${settings.support_role_id}>`
    : "غير محدد"

  // ══════════════════════════════════════
  //  بناء الـ embed
  // ══════════════════════════════════════
  const embed = new EmbedBuilder()
    .setColor(COLORS.neutral)
    .setTitle("🎫 معلومات نظام التذاكر")
    .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: "⚡ الحالة",         value: settings.enabled ? "🟢 مفعّل" : "🔴 معطّل",        inline: true },
      { name: "📁 الكاتيقوري",     value: categoryName,                                       inline: true },
      { name: "📋 قناة اللوق",     value: logChannelName,                                     inline: true },
      { name: "👥 رتبة الدعم",     value: supportRoleName,                                    inline: true },
      { name: "🎫 حد التذاكر",     value: `${settings.max_open_tickets} لكل عضو`,             inline: true },
      { name: "⏱️ إغلاق تلقائي",   value: `${settings.auto_close_hours} ساعة`,                inline: true },
      { name: "📜 حفظ المحادثة",   value: settings.transcript_enabled ? "✅ مفعّل" : "❌ معطّل", inline: true },
      { name: "\u200b",            value: "\u200b",                                            inline: true },
      { name: "\u200b",            value: "\u200b",                                            inline: true },
      {
        name: "📊 الإحصائيات",
        value:
          `📬 إجمالي التذاكر: **${stats.total}**\n` +
          `🟢 مفتوحة: **${stats.open}**\n` +
          `🔴 مغلقة: **${stats.closed}**`,
        inline: false
      },
      {
        name: "💬 رسالة الترحيب",
        value: `\`\`\`${settings.welcome_message}\`\`\``,
        inline: false
      }
    )
    .setFooter({ text: "استخدم /تذاكر إعدادات لتعديل الإعدادات" })
    .setTimestamp()

  return interaction.editReply({ embeds: [embed] })
}