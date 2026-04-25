// ══════════════════════════════════════════════════════════════════
//  /اعدادات_xp مضاعف_xp — ضبط مضاعف XP لجميع الأعضاء
//  المسار: commands/admin/xp-settings/multiplier.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const databaseSystem = require("../../../systems/databaseSystem")
const { COLORS } = require("./_shared")

module.exports = async function handleMultiplier(interaction, guildId) {
  const multiplier = interaction.options.getNumber("المضاعف")

  await databaseSystem.query(
    "UPDATE xp_settings SET xp_multiplier = $1 WHERE guild_id = $2",
    [multiplier, guildId]
  )

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle("⭐ تم ضبط المضاعف")
        .addFields(
          {
            name: "🔢 المضاعف الجديد",
            value: `**${multiplier}x**`,
            inline: true
          },
          {
            name: "📊 مثال",
            value: `كل رسالة = **${Math.floor(10 * multiplier)} XP**`,
            inline: true
          }
        )
        .setTimestamp()
    ]
  })
}