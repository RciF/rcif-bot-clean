const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const moderationLogger = require("../../utils/moderationLogger")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "guildBanRemove",
  async execute(ban, client) {
    try {
      if (!ban.guild) return

      // ✅ احذف من moderation_bans
      moderationLogger.logUnban({
        guildId: ban.guild.id,
        userId: ban.user.id
      }).catch(() => {})

      await sendLog(client, ban.guild.id, "member_unban", {
        title: "🔓 تم فك حظر عضو",
        color: LOG_COLORS.unban,
        fields: [
          { name: "👤 العضو", value: ban.user.tag, inline: true },
          { name: "🆔 المعرف", value: ban.user.id, inline: true }
        ],
        thumbnail: ban.user.displayAvatarURL({ size: 256 }),
        footer: "معرف العضو: " + ban.user.id
      })
    } catch (err) {
      logger.error("LOG_BAN_REMOVE_FAILED", { error: err.message })
    }
  }
}