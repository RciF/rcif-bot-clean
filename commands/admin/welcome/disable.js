// ══════════════════════════════════════════════════════════════════
//  /ترحيب إيقاف — إيقاف نظام الترحيب
//  المسار: commands/admin/welcome/disable.js
// ══════════════════════════════════════════════════════════════════

const databaseSystem = require("../../../systems/databaseSystem")

module.exports = async function handleDisable(interaction, guildId) {
  await databaseSystem.query(
    "UPDATE welcome_settings SET enabled = false WHERE guild_id = $1",
    [guildId]
  )

  return interaction.reply({
    content: "✅ تم إيقاف نظام الترحيب",
    ephemeral: true
  })
}