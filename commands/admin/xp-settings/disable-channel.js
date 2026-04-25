// ══════════════════════════════════════════════════════════════════
//  /اعدادات_xp تعطيل_قناة_xp — منع كسب XP في قناة معينة (toggle)
//  المسار: commands/admin/xp-settings/disable-channel.js
//
//  السلوك:
//   • لو القناة مش معطّلة → تتعطّل
//   • لو معطّلة → يعاد تفعيلها
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const databaseSystem = require("../../../systems/databaseSystem")
const { COLORS } = require("./_shared")

module.exports = async function handleDisableChannel(interaction, guildId) {
  const channel = interaction.options.getChannel("القناة")

  // ✅ جلب القنوات المعطلة الحالية
  const current = await databaseSystem.queryOne(
    "SELECT disabled_channels FROM xp_settings WHERE guild_id = $1",
    [guildId]
  )

  const disabled = current?.disabled_channels || []

  // ══════════════════════════════════════
  //  TOGGLE — لو القناة موجودة في القائمة نشيلها، وإلا نضيفها
  // ══════════════════════════════════════
  if (disabled.includes(channel.id)) {
    // ✅ إزالة القناة من القائمة (إعادة تفعيل)
    const updated = disabled.filter(id => id !== channel.id)

    await databaseSystem.query(
      "UPDATE xp_settings SET disabled_channels = $1 WHERE guild_id = $2",
      [JSON.stringify(updated), guildId]
    )

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle("⭐ تم إعادة تفعيل XP")
          .setDescription(`${channel} — تم إعادة تفعيل كسب XP فيها`)
          .setTimestamp()
      ]
    })
  }

  // ✅ إضافة القناة للقائمة (تعطيل)
  disabled.push(channel.id)

  await databaseSystem.query(
    "UPDATE xp_settings SET disabled_channels = $1 WHERE guild_id = $2",
    [JSON.stringify(disabled), guildId]
  )

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.danger)
        .setTitle("⭐ تم تعطيل XP")
        .setDescription(`${channel} — لن يكسب الأعضاء XP فيها`)
        .setFooter({ text: "نفذ الأمر مرة ثانية عشان تعيد التفعيل" })
        .setTimestamp()
    ]
  })
}