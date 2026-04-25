// ══════════════════════════════════════════════════════════════════
//  /تذاكر إعداد — إعداد نظام التذاكر وإرسال رسالة فتح التذاكر
//  المسار: commands/tickets/setup.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder, PermissionFlagsBits } = require("discord.js")
const ticketSystem = require("../../systems/ticketSystem")
const { COLORS } = require("./_shared")

module.exports = async function handleSetup(interaction) {
  await interaction.deferReply({ ephemeral: true })

  const targetChannel   = interaction.options.getChannel("القناة")
  const categoryChannel = interaction.options.getChannel("الكاتيقوري")
  const logChannel      = interaction.options.getChannel("قناة_اللوق")
  const supportRole     = interaction.options.getRole("رتبة_الدعم")

  // ✅ تحقق من صلاحيات البوت في القناة
  const botPerms = targetChannel.permissionsFor(interaction.guild.members.me)
  if (
    !botPerms ||
    !botPerms.has(PermissionFlagsBits.SendMessages) ||
    !botPerms.has(PermissionFlagsBits.EmbedLinks)
  ) {
    return interaction.editReply({
      content: `❌ البوت ما يقدر يرسل رسائل في ${targetChannel}. تأكد من الصلاحيات.`
    })
  }

  // ✅ تحقق من صلاحية إدارة القنوات
  if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.editReply({
      content: "❌ البوت يحتاج صلاحية **إدارة القنوات** عشان ينشئ قنوات التذاكر."
    })
  }

  const currentSettings = await ticketSystem.getSettings(interaction.guild.id)

  const settingsData = {
    category_id:        categoryChannel?.id || currentSettings?.category_id        || null,
    log_channel_id:     logChannel?.id      || currentSettings?.log_channel_id     || null,
    support_role_id:    supportRole?.id     || currentSettings?.support_role_id    || null,
    welcome_message:    currentSettings?.welcome_message    || "مرحباً! فريق الدعم سيكون معك قريباً.",
    max_open_tickets:   currentSettings?.max_open_tickets   || 1,
    auto_close_hours:   currentSettings?.auto_close_hours   || 48,
    transcript_enabled: currentSettings?.transcript_enabled !== false,
    enabled: true
  }

  const saved = await ticketSystem.saveSettings(interaction.guild.id, settingsData)
  if (!saved) {
    return interaction.editReply({ content: "❌ فشل في حفظ إعدادات التذاكر." })
  }

  // ✅ إرسال رسالة فتح التذاكر في القناة
  const setupEmbed = ticketSystem.buildSetupEmbed(interaction.guild)
  const openButton = ticketSystem.buildOpenButton()

  await targetChannel.send({
    embeds: [setupEmbed],
    components: [openButton]
  })

  // ✅ رسالة التأكيد للأدمن
  const confirmEmbed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle("✅ تم إعداد نظام التذاكر")
    .addFields(
      { name: "📨 قناة فتح التذاكر", value: `${targetChannel}`,                              inline: true },
      { name: "📁 كاتيقوري التذاكر", value: categoryChannel ? `${categoryChannel}` : "غير محدد", inline: true },
      { name: "📋 قناة اللوق",       value: logChannel      ? `${logChannel}`      : "غير محدد", inline: true },
      { name: "👥 رتبة الدعم",       value: supportRole     ? `${supportRole}`     : "غير محدد", inline: true }
    )
    .setFooter({ text: "يمكنك تعديل الإعدادات باستخدام /تذاكر إعدادات" })
    .setTimestamp()

  return interaction.editReply({ embeds: [confirmEmbed] })
}