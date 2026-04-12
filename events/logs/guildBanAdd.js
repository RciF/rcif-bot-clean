const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "guildBanAdd",
  async execute(ban, client) {
    try {
      if (!ban.guild) return
      const fields = [
        { name: "👤 العضو", value: ban.user.tag, inline: true },
        { name: "🆔 المعرف", value: ban.user.id, inline: true }
      ]
      if (ban.reason) fields.push({ name: "📋 السبب", value: ban.reason })
      await sendLog(client, ban.guild.id, "member_ban", {
        title: "🔨 تم حظر عضو",
        color: LOG_COLORS.ban,
        fields,
        thumbnail: ban.user.displayAvatarURL({ size: 256 }),
        footer: "معرف العضو: " + ban.user.id
      })
    } catch (err) {
      logger.error("LOG_BAN_ADD_FAILED", { error: err.message })
    }
  }
}