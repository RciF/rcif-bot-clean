// ══════════════════════════════════════════════════════════════════
//  /اعدادات_xp قناة_الصعود — تحديد قناة رسائل الصعود
//  المسار: commands/admin/xp-settings/level-up-channel.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const databaseSystem = require("../../../systems/databaseSystem")
const { COLORS, checkBotPermissions } = require("./_shared")

module.exports = async function handleLevelUpChannel(interaction, guildId) {
  const channel = interaction.options.getChannel("القناة")

  // ✅ تحقق من صلاحيات البوت
  if (!checkBotPermissions(channel, interaction.guild)) {
    return interaction.reply({
      content: "❌ البوت ما عنده صلاحيات كافية في هذي القناة",
      ephemeral: true
    })
  }

  await databaseSystem.query(
    "UPDATE xp_settings SET levelup_channel_id = $1 WHERE guild_id = $2",
    [channel.id, guildId]
  )

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle("⭐ تم ضبط قناة الصعود")
        .setDescription(`رسائل الصعود للمستوى ستُرسل في ${channel}`)
        .setTimestamp()
    ]
  })
}