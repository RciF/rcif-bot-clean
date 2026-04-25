// ══════════════════════════════════════════════════════════════════
//  /حماية نيوك — إعداد نظام Anti-Nuke
//  المسار: commands/protection/nuke.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const protectionSystem = require("../../systems/protectionSystem")
const { COLORS, actionLabel } = require("./_shared")

module.exports = async function handleNuke(interaction, guildId) {
  await interaction.deferReply()

  const current = await protectionSystem.getSettings(guildId) || {}

  const enabled = interaction.options.getString("الحالة") === "on"
  const chThreshold   = interaction.options.getInteger("حد_القنوات") ?? current.antinuke_channel_delete_threshold ?? 3
  const roleThreshold = interaction.options.getInteger("حد_الرتب")   ?? current.antinuke_role_delete_threshold    ?? 3
  const banThreshold  = interaction.options.getInteger("حد_الحظر")   ?? current.antinuke_ban_threshold            ?? 3
  const action = interaction.options.getString("العقوبة") ?? current.antinuke_action ?? "ban"

  await protectionSystem.saveSettings(guildId, {
    ...current,
    antinuke_enabled:                    enabled,
    antinuke_channel_delete_threshold:   chThreshold,
    antinuke_role_delete_threshold:      roleThreshold,
    antinuke_ban_threshold:              banThreshold,
    antinuke_action:                     action
  })

  const embed = new EmbedBuilder()
    .setColor(enabled ? COLORS.success : COLORS.danger)
    .setTitle(`💣 Anti-Nuke — ${enabled ? "✅ تم التفعيل" : "❌ تم الإيقاف"}`)
    .addFields(
      { name: "🗑️ حد القنوات",  value: `**${chThreshold}** حذف`,    inline: true },
      { name: "🏷️ حد الرتب",     value: `**${roleThreshold}** حذف`,  inline: true },
      { name: "🔨 حد الحظر",    value: `**${banThreshold}** حظر`,   inline: true },
      { name: "⚡ العقوبة",     value: `**${actionLabel(action)}**`, inline: true },
      { name: "👮 بواسطة",      value: `${interaction.user}`,        inline: true }
    )
    .setTimestamp()

  return interaction.editReply({ embeds: [embed] })
}