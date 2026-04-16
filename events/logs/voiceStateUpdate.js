const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState, client) {
    try {
      if (!newState.guild) return
      if (oldState.channelId === newState.channelId) return

      // ✅ FIX: استخدام الـ event keys الصحيحة المعرّفة في EVENT_CHANNEL_MAP
      // voice_join, voice_leave, voice_move — كلها تستخدم نفس الـ column
      let title, color, eventType

      if (!oldState.channelId && newState.channelId) {
        title = "🔊 انضم لقناة صوتية"
        color = LOG_COLORS.join
        eventType = "voice_join"
      } else if (oldState.channelId && !newState.channelId) {
        title = "🔇 غادر قناة صوتية"
        color = LOG_COLORS.leave
        eventType = "voice_leave"
      } else {
        title = "🔊 نقل قناة صوتية"
        color = LOG_COLORS.update
        eventType = "voice_move"
      }

      await sendLog(client, newState.guild.id, eventType, {
        title,
        color,
        fields: [
          { name: "👤 العضو", value: newState.member?.user.tag || "غير معروف", inline: true },
          { name: "📌 من",    value: oldState.channel?.name || "خارج",          inline: true },
          { name: "📌 إلى",   value: newState.channel?.name || "خارج",          inline: true }
        ],
        footer: "معرف العضو: " + newState.id
      })
    } catch (err) {
      logger.error("LOG_VOICE_STATE_UPDATE_FAILED", { error: err.message })
    }
  }
}