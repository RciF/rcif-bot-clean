// ══════════════════════════════════════════════════════════════════
//  /اعدادات_xp حالة — عرض إعدادات XP الحالية للسيرفر
//  المسار: commands/admin/xp-settings/status.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const databaseSystem = require("../../../systems/databaseSystem")
const { COLORS } = require("./_shared")

module.exports = async function handleStatus(interaction, guildId) {
  const settings = await databaseSystem.queryOne(
    "SELECT * FROM xp_settings WHERE guild_id = $1",
    [guildId]
  )

  const levelupChannel = settings?.levelup_channel_id
    ? `<#${settings.levelup_channel_id}>`
    : "نفس القناة"

  const multiplier = settings?.xp_multiplier || 1
  const disabled = settings?.disabled_channels || []

  const disabledText = disabled.length > 0
    ? disabled.map(id => `<#${id}>`).join(", ")
    : "لا يوجد"

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.neutral)
        .setTitle("⭐ إعدادات نظام XP")
        .addFields(
          {
            name: "📢 قناة الصعود",
            value: levelupChannel,
            inline: true
          },
          {
            name: "🔢 مضاعف XP",
            value: `**${multiplier}x**`,
            inline: true
          },
          {
            name: "📊 XP لكل رسالة",
            value: `**${Math.floor(10 * multiplier)} XP**`,
            inline: true
          },
          {
            name: "🚫 قنوات بدون XP",
            value: disabledText,
            inline: false
          }
        )
        .setTimestamp()
    ],
    ephemeral: true
  })
}