const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState, client) {
    try {
      if (!newState.guild) return
      if (oldState.channelId === newState.channelId) return
      let title, color
      if (!oldState.channelId && newState.channelId) {
        title = "🔊 انضم لقناة صوتية"
        color = LOG_COLORS.join
      } else if (oldState.channelId && !newState.channelId) {
        title = "🔇 غادر قناة صوتية"
        color = LOG_COLORS.leave
      } else {
        title = "🔊 نقل قناة صوتية"
        color = LOG_COLORS.update
      }
      await sendLog(client, newState.guild.id, "voice_update", {
        title,
        color,
        fields: [
          { name: "👤 العضو", value: newState.member?.user.tag || "غير معروف", inline: true },
          { name: "📌 من", value: oldState.channel?.name || "خارج", inline: true },
          { name: "📌 إلى", value: newState.channel?.name || "خارج", inline: true }
        ],
        footer: "معرف العضو: " + newState.id
      })
    } catch (err) {
      logger.error("LOG_VOICE_STATE_UPDATE_FAILED", { error: err.message })
    }
  }
}