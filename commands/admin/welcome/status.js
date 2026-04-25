// ══════════════════════════════════════════════════════════════════
//  /ترحيب حالة — عرض الإعدادات الحالية
//  المسار: commands/admin/welcome/status.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const databaseSystem = require("../../../systems/databaseSystem")
const { COLORS } = require("./_shared")

module.exports = async function handleStatus(interaction, guildId) {
  const settings = await databaseSystem.queryOne(
    "SELECT * FROM welcome_settings WHERE guild_id = $1",
    [guildId]
  )

  if (!settings) {
    return interaction.reply({
      content: "❌ لم يتم الإعداد بعد",
      ephemeral: true
    })
  }

  const welcomeCh = settings.welcome_channel_id
    ? `<#${settings.welcome_channel_id}>`
    : "غير محددة"

  const goodbyeCh = settings.goodbye_channel_id
    ? `<#${settings.goodbye_channel_id}>`
    : "غير محددة"

  const embed = new EmbedBuilder()
    .setColor(settings.enabled ? COLORS.success : COLORS.danger)
    .setTitle("📋 إعدادات الترحيب")
    .addFields(
      {
        name: "📊 الحالة",
        value: settings.enabled ? "🟢 مفعّل" : "🔴 معطّل",
        inline: true
      },
      {
        name: "📥 قناة الترحيب",
        value: welcomeCh,
        inline: true
      },
      {
        name: "📤 قناة الوداع",
        value: goodbyeCh,
        inline: true
      },
      {
        name: "💬 رسالة الترحيب",
        value: settings.welcome_message
          ? `\`\`\`${settings.welcome_message.slice(0, 300)}\`\`\``
          : "افتراضية",
        inline: false
      },
      {
        name: "💬 رسالة الوداع",
        value: settings.goodbye_message
          ? `\`\`\`${settings.goodbye_message.slice(0, 300)}\`\`\``
          : "افتراضية",
        inline: false
      }
    )
    .setFooter({ text: "استخدم \\n في الرسالة للسطر الجديد" })
    .setTimestamp()

  return interaction.reply({ embeds: [embed] })
}