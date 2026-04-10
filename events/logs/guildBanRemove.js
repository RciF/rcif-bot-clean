const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "guildBanRemove",

  async execute(ban, client) {
    try {
      if (!ban.guild) return

      await sendLog(client, ban.guild.id, "member_unban", {
        title: "🔓 تم فك حظر عضو",
        color: LOG_COLORS.unban,
        fields: [
          { name: "👤 العضو", value: `${ban.user.tag}`, inline: true },
          { name: "🆔 المعرف", value: `${ban.user.id}`, inline: true }
        ],
        thumbnail: ban.user.displayAvatarURL({ size: 256 }),
        footer: `معرف العضو: ${ban.user.id}`
      })
    } catch (err) {
      logger.error("LOG_BAN_REMOVE_FAILED", { error: err.message })
    }
  }
}