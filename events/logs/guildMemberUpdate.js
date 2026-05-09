const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const moderationLogger = require("../../utils/moderationLogger")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "guildMemberUpdate",
  async execute(oldMember, newMember, client) {
    try {
      if (!newMember.guild) return

      // ── Timeout (Mute/Unmute) tracking ──
      const oldTimeout = oldMember.communicationDisabledUntilTimestamp
      const newTimeout = newMember.communicationDisabledUntilTimestamp
      const now = Date.now()

      const wasMuted = oldTimeout && oldTimeout > now
      const isMuted = newTimeout && newTimeout > now

      // ✅ Mute (طبّق الآن)
      if (!wasMuted && isMuted) {
        const durationMs = newTimeout - now
        moderationLogger.logMute({
          guildId: newMember.guild.id,
          userId: newMember.id,
          reason: null, // غير معروف من الحدث
          moderatorId: null, // يُلتقط من audit logs لو احتجناه لاحقاً
          durationMs
        }).catch(() => {})
      }

      // ✅ Unmute (فُكّ الكتم)
      if (wasMuted && !isMuted) {
        moderationLogger.logUnmute({
          guildId: newMember.guild.id,
          userId: newMember.id
        }).catch(() => {})
      }

      // ── Nickname ──
      if (oldMember.nickname !== newMember.nickname) {
        await sendLog(client, newMember.guild.id, "member_update", {
          title: "👤 تغيير لقب",
          color: LOG_COLORS.member,
          fields: [
            { name: "👤 العضو", value: newMember.user.tag, inline: true },
            { name: "📝 القديم", value: oldMember.nickname || "بدون لقب", inline: true },
            { name: "📝 الجديد", value: newMember.nickname || "بدون لقب", inline: true }
          ],
          footer: "معرف العضو: " + newMember.id
        })
      }

      // ── Roles ──
      const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id))
      const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id))

      if (addedRoles.size > 0) {
        await sendLog(client, newMember.guild.id, "member_update", {
          title: "🏷️ إضافة دور",
          color: LOG_COLORS.role,
          fields: [
            { name: "👤 العضو", value: newMember.user.tag, inline: true },
            { name: "➕ الدور المضاف", value: addedRoles.map(r => r.name).join(", "), inline: true }
          ],
          footer: "معرف العضو: " + newMember.id
        })
      }

      if (removedRoles.size > 0) {
        await sendLog(client, newMember.guild.id, "member_update", {
          title: "🏷️ إزالة دور",
          color: LOG_COLORS.role,
          fields: [
            { name: "👤 العضو", value: newMember.user.tag, inline: true },
            { name: "➖ الدور المزال", value: removedRoles.map(r => r.name).join(", "), inline: true }
          ],
          footer: "معرف العضو: " + newMember.id
        })
      }
    } catch (err) {
      logger.error("LOG_MEMBER_UPDATE_FAILED", { error: err.message })
    }
  }
}