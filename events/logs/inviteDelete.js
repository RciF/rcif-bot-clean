const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "inviteDelete",

  async execute(invite, client) {
    try {
      if (!invite.guild) return

      await sendLog(client, invite.guild.id, "invite_delete", {
        title: "🔗 دعوة محذوفة",
        color: LOG_COLORS.delete,
        fields: [
          { name: "🔗 الكود", value: `\`${invite.code}\``, inline: true },
          { name: "📌 القناة", value: invite.channel ? `${invite.channel}` : "غير معروف", inline: true },
        ],
        footer: `كود الدعوة: ${invite.code}`
      })

    } catch (err) {
      logger.error("LOG_INVITE_DELETE_FAILED", { error: err.message })
    }
  }
}