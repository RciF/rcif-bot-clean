// ══════════════════════════════════════════════════════════════════
//  /حماية رايد — إعداد نظام Anti-Raid
//  المسار: commands/protection/raid.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const protectionSystem = require("../../systems/protectionSystem")
const { COLORS, actionLabel } = require("./_shared")

module.exports = async function handleRaid(interaction, guildId) {
  await interaction.deferReply()

  const current = await protectionSystem.getSettings(guildId) || {}

  const enabled = interaction.options.getString("الحالة") === "on"
  const threshold = interaction.options.getInteger("الحد") ?? current.antiraid_join_threshold ?? 10
  const interval = (
    interaction.options.getInteger("الفترة")
      ?? (current.antiraid_join_interval_ms ?? 10000) / 1000
  ) * 1000
  const action = interaction.options.getString("العقوبة") ?? current.antiraid_action ?? "lockdown"

  await protectionSystem.saveSettings(guildId, {
    ...current,
    antiraid_enabled:           enabled,
    antiraid_join_threshold:    threshold,
    antiraid_join_interval_ms:  interval,
    antiraid_action:            action
  })

  const embed = new EmbedBuilder()
    .setColor(enabled ? COLORS.success : COLORS.danger)
    .setTitle(`🌊 Anti-Raid — ${enabled ? "✅ تم التفعيل" : "❌ تم الإيقاف"}`)
    .addFields(
      { name: "📊 الحد",     value: `**${threshold}** عضو في **${interval / 1000}** ثانية`, inline: true },
      { name: "⚡ العقوبة",  value: `**${actionLabel(action)}**`,                            inline: true },
      { name: "👮 بواسطة",   value: `${interaction.user}`,                                   inline: true }
    )
    .setTimestamp()

  return interaction.editReply({ embeds: [embed] })
}