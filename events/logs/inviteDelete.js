const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "inviteDelete",
  async execute(invite, client) {
    try {
      if (!invite.guild) return
      await sendLog(client, invite.guild.id, "invite_delete", {
        title: "🗑️ دعوة محذوفة",
        color: LOG_COLORS.delete,
        fields: [
          { name: "🔗 الكود", value: invite.code, inline: true },
          { name: "📌 القناة", value: invite.channel?.name || "غير معروف", inline: true }
        ],
        footer: "معرف السيرفر: " + invite.guild.id
      })
    } catch (err) {
      logger.error("LOG_INVITE_DELETE_FAILED", { error: err.message })
    }
  }
}