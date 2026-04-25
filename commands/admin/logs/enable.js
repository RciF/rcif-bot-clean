// ══════════════════════════════════════════════════════════════════
//  /لوق تفعيل — تفعيل نظام السجلات
//  المسار: commands/admin/logs/enable.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const databaseSystem = require("../../../systems/databaseSystem")
const { clearCache, EVENT_TYPES } = require("../../../utils/logSender")
const { COLORS, ensureSettings } = require("./_shared")

module.exports = async function handleEnable(interaction, guildId) {
  await ensureSettings(guildId)

  const settings = await databaseSystem.queryOne(
    "SELECT * FROM log_settings WHERE guild_id = $1",
    [guildId]
  )

  // تحقق من وجود قناة واحدة على الأقل مضبوطة
  const hasAnyChannel = EVENT_TYPES.some(e => settings?.[e.column])

  if (!hasAnyChannel) {
    return interaction.reply({
      content: "⚠️ حدد قناة لحدث واحد على الأقل أولاً",
      ephemeral: true
    })
  }

  await databaseSystem.query(
    "UPDATE log_settings SET enabled = true WHERE guild_id = $1",
    [guildId]
  )

  clearCache(guildId)

  const embed = new EmbedBuilder()
    .setTitle("📋 نظام السجلات — مفعّل")
    .setColor(COLORS.success)
    .setDescription("🟢 تم تفعيل نظام السجلات")
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })
}