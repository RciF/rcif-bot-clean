// ══════════════════════════════════════════════════════════════════
//  /لوق الكل — إرسال جميع الأحداث في قناة واحدة
//  المسار: commands/admin/logs/all.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const databaseSystem = require("../../../systems/databaseSystem")
const { clearCache, EVENT_TYPES } = require("../../../utils/logSender")
const { COLORS, ensureSettings, checkBotPermissions } = require("./_shared")

module.exports = async function handleAll(interaction, guildId) {
  const channel = interaction.options.getChannel("القناة")

  if (!checkBotPermissions(channel, interaction.guild)) {
    return interaction.reply({
      content: "❌ البوت ما عنده صلاحيات كافية في هذي القناة",
      ephemeral: true
    })
  }

  await ensureSettings(guildId)

  // بناء SET clauses لكل الأعمدة
  const setClauses = EVENT_TYPES.map(e => e.column + " = $2").join(", ")

  await databaseSystem.query(
    "UPDATE log_settings SET " + setClauses + ", enabled = true WHERE guild_id = $1",
    [guildId, channel.id]
  )

  clearCache(guildId)

  const embed = new EmbedBuilder()
    .setTitle("📋 تم ضبط جميع السجلات")
    .setColor(COLORS.success)
    .setDescription("جميع الأحداث (" + EVENT_TYPES.length + ") ستُرسل في " + channel)
    .setFooter({ text: "النظام مفعّل تلقائياً" })
    .setTimestamp()

  await interaction.reply({ embeds: [embed] })
}