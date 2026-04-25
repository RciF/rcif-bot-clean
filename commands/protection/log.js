// ══════════════════════════════════════════════════════════════════
//  /حماية لوق — تحديد قناة سجل الحماية
//  المسار: commands/protection/log.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const protectionSystem = require("../../systems/protectionSystem")
const { COLORS } = require("./_shared")

module.exports = async function handleLog(interaction, guildId) {
  const channel = interaction.options.getChannel("القناة")
  const current = await protectionSystem.getSettings(guildId) || {}

  // ✅ تحقق من صلاحيات البوت في القناة
  const perms = channel.permissionsFor(interaction.guild.members.me)
  if (!perms?.has(["ViewChannel", "SendMessages", "EmbedLinks"])) {
    return interaction.reply({
      content: "❌ البوت ما عنده صلاحيات كافية في هذي القناة.",
      ephemeral: true
    })
  }

  await protectionSystem.saveSettings(guildId, {
    ...current,
    log_channel_id: channel.id
  })

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle("📋 قناة لوق الحماية")
        .setDescription(`تم تحديد ${channel} كقناة سجل لنظام الحماية.`)
        .setTimestamp()
    ]
  })
}