// ══════════════════════════════════════════════════════════════════
//  /حماية سبام — إعداد نظام Anti-Spam
//  المسار: commands/protection/spam.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const protectionSystem = require("../../systems/protectionSystem")
const { COLORS, actionLabel } = require("./_shared")

module.exports = async function handleSpam(interaction, guildId) {
  await interaction.deferReply()

  const current = await protectionSystem.getSettings(guildId) || {}

  const enabled = interaction.options.getString("الحالة") === "on"
  const maxMsgs = interaction.options.getInteger("الحد") ?? current.antispam_max_messages ?? 5
  const interval = (
    interaction.options.getInteger("الفترة")
      ?? (current.antispam_interval_ms ?? 3000) / 1000
  ) * 1000
  const action = interaction.options.getString("العقوبة") ?? current.antispam_action ?? "mute"
  const muteDuration = (
    interaction.options.getInteger("مدة_الكتم")
      ?? (current.antispam_mute_duration ?? 300000) / 60000
  ) * 60000

  await protectionSystem.saveSettings(guildId, {
    ...current,
    antispam_enabled:        enabled,
    antispam_max_messages:   maxMsgs,
    antispam_interval_ms:    interval,
    antispam_action:         action,
    antispam_mute_duration:  muteDuration
  })

  const embed = new EmbedBuilder()
    .setColor(enabled ? COLORS.success : COLORS.danger)
    .setTitle(`🔴 Anti-Spam — ${enabled ? "✅ تم التفعيل" : "❌ تم الإيقاف"}`)
    .addFields(
      { name: "📊 الحد",     value: `**${maxMsgs}** رسائل في **${interval / 1000}** ثانية`, inline: true },
      { name: "⚡ العقوبة",  value: `**${actionLabel(action)}**`,                          inline: true },
      { name: "👮 بواسطة",   value: `${interaction.user}`,                                 inline: true }
    )

  if (action === "mute") {
    embed.addFields({
      name: "⏱️ مدة الكتم",
      value: `**${muteDuration / 60000}** دقيقة`,
      inline: true
    })
  }

  embed.setTimestamp()

  return interaction.editReply({ embeds: [embed] })
}