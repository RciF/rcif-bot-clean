// ══════════════════════════════════════════════════════════════════
//  /ترحيب تفعيل — تفعيل نظام الترحيب
//  المسار: commands/admin/welcome/enable.js
// ══════════════════════════════════════════════════════════════════

const databaseSystem = require("../../../systems/databaseSystem")

module.exports = async function handleEnable(interaction, guildId) {
  await databaseSystem.query(
    "UPDATE welcome_settings SET enabled = true WHERE guild_id = $1",
    [guildId]
  )

  return interaction.reply({
    content: "✅ تم تفعيل نظام الترحيب",
    ephemeral: true
  })
}