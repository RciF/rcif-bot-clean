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
          { name: "👤 المنشئ", value: invite.inviter ? `${invite.inviter.tag}` : "غير معروف", inline: true },
          { name: "🔗 الكود", value: `\`${invite.code}\``, inline: true },
          { name: "📌 القناة", value: invite.channel ? `${invite.channel}` : "غير معروف", inline: true },
          { name: "⏰ تنتهي", value: invite.maxAge ? `بعد ${invite.maxAge / 3600} ساعة` : "لا تنتهي", inline: true },
          { name: "🔢 الاستخدام الأقصى", value: invite.maxUses ? `${invite.maxUses}` : "غير محدود", inline: true },
        ],
        footer: `كود الدعوة: ${invite.code}`
      })

    } catch (err) {
      logger.error("LOG_INVITE_CREATE_FAILED", { error: err.message })
    }
  }
}