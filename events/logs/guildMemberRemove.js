const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "guildMemberRemove",

  async execute(member, client) {
    try {
      if (!member.guild) return

      const roles = member.roles?.cache
        ?.filter(r => r.id !== member.guild.id)
        ?.map(r => `${r}`)
        ?.join(", ") || "بدون أدوار"

      const joinedAt = member.joinedTimestamp
        ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
        : "غير معروف"

      await sendLog(client, member.guild.id, "member_leave", {
        title: "📤 عضو غادر",
        color: LOG_COLORS.leave,
        fields: [
          { name: "👤 العضو", value: `${member.user.tag}`, inline: true },
          { name: "🔢 عدد الأعضاء", value: `${member.guild.memberCount}`, inline: true },
          { name: "📅 انضم", value: joinedAt, inline: true },
          { name: "🏷️ الأدوار", value: roles.length > 1024 ? roles.slice(0, 1021) + "..." : roles }
        ],
        thumbnail: member.user.displayAvatarURL({ size: 256 }),
        footer: `معرف العضو: ${member.id}`
      })
    } catch (err) {
      logger.error("LOG_MEMBER_REMOVE_FAILED", { error: err.message })
    }
  }
}