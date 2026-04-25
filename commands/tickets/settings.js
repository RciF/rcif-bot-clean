// ══════════════════════════════════════════════════════════════════
//  /تذاكر إعدادات — تعديل إعدادات نظام التذاكر
//  المسار: commands/tickets/settings.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const ticketSystem = require("../../systems/ticketSystem")
const { COLORS, parseMessage } = require("./_shared")

module.exports = async function handleSettings(interaction) {
  const maxTickets    = interaction.options.getInteger("حد_التذاكر")
  const autoClose     = interaction.options.getInteger("إغلاق_تلقائي")
  const welcomeMsg    = interaction.options.getString("رسالة_الترحيب")
  const transcriptOpt = interaction.options.getString("حفظ_المحادثة")
  const statusOpt     = interaction.options.getString("الحالة")

  // ✅ تحقق إن في خيار واحد على الأقل
  if (!maxTickets && !autoClose && !welcomeMsg && !transcriptOpt && !statusOpt) {
    return interaction.reply({
      content: "⚠️ حدد خيار واحد على الأقل لتعديله.\nاستخدم `/تذاكر معلومات` لعرض الإعدادات الحالية.",
      ephemeral: true
    })
  }

  await interaction.deferReply({ ephemeral: true })

  const currentSettings = await ticketSystem.getSettings(interaction.guild.id)

  if (!currentSettings) {
    return interaction.editReply({
      content: "❌ نظام التذاكر غير معدّ بعد. استخدم `/تذاكر إعداد` أولاً."
    })
  }

  const updatedSettings = {
    category_id:        currentSettings.category_id,
    log_channel_id:     currentSettings.log_channel_id,
    support_role_id:    currentSettings.support_role_id,
    welcome_message:    parseMessage(welcomeMsg) || currentSettings.welcome_message,
    max_open_tickets:   maxTickets               || currentSettings.max_open_tickets,
    auto_close_hours:   autoClose                || currentSettings.auto_close_hours,
    transcript_enabled: transcriptOpt !== null
      ? transcriptOpt === "true"
      : currentSettings.transcript_enabled,
    enabled: statusOpt !== null
      ? statusOpt === "on"
      : currentSettings.enabled
  }

  const saved = await ticketSystem.saveSettings(interaction.guild.id, updatedSettings)
  if (!saved) {
    return interaction.editReply({ content: "❌ فشل في حفظ الإعدادات." })
  }

  // ✅ بناء قائمة التغييرات
  const changes = []
  if (maxTickets)    changes.push(`🎫 حد التذاكر → **${maxTickets}**`)
  if (autoClose)     changes.push(`⏱️ إغلاق تلقائي → **${autoClose} ساعة**`)
  if (welcomeMsg)    changes.push("💬 رسالة الترحيب → تم التحديث")
  if (transcriptOpt) changes.push(`📜 حفظ المحادثة → **${transcriptOpt === "true" ? "مفعّل" : "معطّل"}**`)
  if (statusOpt)     changes.push(`⚡ الحالة → **${statusOpt === "on" ? "مفعّل" : "معطّل"}**`)

  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle("⚙️ تم تحديث إعدادات التذاكر")
    .setDescription(changes.join("\n"))
    .setTimestamp()

  return interaction.editReply({ embeds: [embed] })
}