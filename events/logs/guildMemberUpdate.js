const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "guildMemberUpdate",

  async execute(oldMember, newMember, client) {
    try {
      if (!newMember.guild) return

      if (oldMember.nickname !== newMember.nickname) {
        await sendLog(client, newMember.guild.id, "member_update", {
          title: "👤 تغيير لقب",
          color: LOG_COLORS.member,
          fields: [
            { name: "👤 العضو", value: `${newMember} (${newMember.user.tag})`, inline: true },
            { name: "📝 القديم", value: oldMember.nickname || "بدون لقب", inline: true },
            { name: "📝 الجديد", value: newMember.nickname || "بدون لقب", inline: true }
          ],
          thumbnail: newMember.user.displayAvatarURL({ size: 256 }),
          footer: `معرف العضو: ${newMember.id}`
        })
      }

      const oldRoles = oldMember.roles.cache
      const newRoles = newMember.roles.cache
      const addedRoles   = newRoles.filter(r => !oldRoles.has(r.id))
      const removedRoles = oldRoles.filter(r => !newRoles.has(r.id))

      if (addedRoles.size > 0) {
        await sendLog(client, newMember.guild.id, "member_update", {
          title: "🏷️ إضافة دور",
          color: LOG_COLORS.role,
          fields: [
            { name: "👤 العضو", value: `${newMember} (${newMember.user.tag})`, inline: true },
            { name: "➕ الدور المضاف", value: addedRoles.map(r => `${r}`).join(", "), inline: true }
          ],
          footer: `معرف العضو: ${newMember.id}`
        })
      }

      if (removedRoles.size > 0) {
        await sendLog(client, newMember.guild.id, "member_update", {
          title: "🏷️ إزالة دور",
          color: LOG_COLORS.role,
          fields: [
            { name: "👤 العضو", value: `${newMember} (${newMember.user.tag})`, inline: true },
            { name: "➖ الدور المزال", value: removedRoles.map(r => `${r}`).join(", "), inline: true }
          ],
          footer: `معرف العضو: ${newMember.id}`
        })
      }

      if (!oldMember.communicationDisabledUntilTimestamp && newMember.communicationDisabledUntilTimestamp) {
        await sendLog(client, newMember.guild.id, "member_update", {
          title: "🔇 تم كتم عضو",
          color: LOG_COLORS.ban,
          fields: [
            { name: "👤 العضو", value: `${newMember} (${newMember.user.tag})`, inline: true },
            { name: "⏰ ينتهي", value: `<t:${Math.floor(newMember.communicationDisabledUntilTimestamp / 1000)}:R>`, inline: true }
          ],
          footer: `معرف العضو: ${newMember.id}`
        })
      } else if (oldMember.communicationDisabledUntilTimestamp && !newMember.communicationDisabledUntilTimestamp) {
        await sendLog(client, newMember.guild.id, "member_update", {
          title: "🔊 تم فك كتم عضو",
          color: LOG_COLORS.unban,
          fields: [
            { name: "👤 العضو", value: `${newMember} (${newMember.user.tag})`, inline: true }
          ],
          footer: `معرف العضو: ${newMember.id}`
        })
      }

    } catch (err) {
      logger.error("LOG_MEMBER_UPDATE_FAILED", { error: err.message })
    }
  }
}