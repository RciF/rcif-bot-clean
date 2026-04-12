const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "inviteCreate",
  async execute(invite, client) {
    try {
      if (!invite.guild) return
      await sendLog(client, invite.guild.id, "invite_create", {
        title: "🔗 دعوة جديدة",
        color: LOG_COLORS.create,
        fields: [
          { name: "👤 المنشئ", value: invite.inviter?.tag || "غير معروف", inline: true },
          { name: "📌 القناة", value: invite.channel?.name || "غير معروف", inline: true },
          { name: "🔗 الكود", value: invite.code, inline: true }
        ],
        footer: "تنتهي: " + (invite.expiresAt?.toLocaleString("ar-SA") || "لا تنتهي")
      })
    } catch (err) {
      logger.error("LOG_INVITE_CREATE_FAILED", { error: err.message })
    }
  }
}