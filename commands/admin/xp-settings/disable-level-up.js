// ══════════════════════════════════════════════════════════════════
//  /اعدادات_xp تعطيل_قناة — إيقاف قناة رسائل الصعود
//  (رسائل الصعود ترجع تطلع في نفس قناة العضو)
//  المسار: commands/admin/xp-settings/disable-level-up.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const databaseSystem = require("../../../systems/databaseSystem")
const { COLORS } = require("./_shared")

module.exports = async function handleDisableLevelUp(interaction, guildId) {
  await databaseSystem.query(
    "UPDATE xp_settings SET levelup_channel_id = NULL WHERE guild_id = $1",
    [guildId]
  )

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle("⭐ تم التعطيل")
        .setDescription("رسائل الصعود ستُرسل في نفس القناة التي كتب فيها العضو")
        .setTimestamp()
    ]
  })
}