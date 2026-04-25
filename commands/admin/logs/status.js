// ══════════════════════════════════════════════════════════════════
//  /لوق حالة — عرض حالة نظام السجلات
//  المسار: commands/admin/logs/status.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const databaseSystem = require("../../../systems/databaseSystem")
const { EVENT_TYPES } = require("../../../utils/logSender")
const { COLORS } = require("./_shared")

module.exports = async function handleStatus(interaction, guildId) {
  const settings = await databaseSystem.queryOne(
    "SELECT * FROM log_settings WHERE guild_id = $1",
    [guildId]
  )

  if (!settings) {
    return interaction.reply({
      content: "⚠️ نظام السجلات غير مُعد بعد",
      ephemeral: true
    })
  }

  let eventsStatus = ""
  let activeCount = 0

  for (const event of EVENT_TYPES) {
    const channelId = settings[event.column]

    if (channelId) {
      const channel = interaction.guild.channels.cache.get(channelId)
      if (channel) {
        eventsStatus += event.emoji + " **" + event.label + "** → " + channel + "\n"
        activeCount++
      } else {
        eventsStatus += event.emoji + " **" + event.label + "** → ⚠️ قناة محذوفة\n"
      }
    } else {
      eventsStatus += event.emoji + " **" + event.label + "** → ❌ غير محدد\n"
    }
  }

  const embed = new EmbedBuilder()
    .setTitle("📋 حالة نظام السجلات")
    .setColor(settings.enabled ? COLORS.success : COLORS.danger)
    .addFields(
      {
        name: "📊 النظام",
        value: settings.enabled ? "🟢 مفعّل" : "🔴 معطّل",
        inline: true
      },
      {
        name: "📈 الإحصائيات",
        value: "✅ " + activeCount + " مفعّل",
        inline: true
      },
      {
        name: "📝 الأحداث والقنوات",
        value: eventsStatus || "لا يوجد"
      }
    )
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })
}