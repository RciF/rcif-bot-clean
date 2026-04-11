const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "voiceStateUpdate",

  async execute(oldState, newState, client) {
    try {
      if (!newState.guild) return

      const member = newState.member
      if (!member || member.user.bot) return

      const oldChannel = oldState.channel
      const newChannel = newState.channel

      // دخل قناة صوت
      if (!oldChannel && newChannel) {
        await sendLog(client, newState.guild.id, "voice_join", {
          title: "🔊 دخل قناة صوتية",
          color: LOG_COLORS.join,
          fields: [
            { name: "👤 العضو", value: `${member} (${member.user.tag})`, inline: true },
            { name: "🔊 القناة", value: `${newChannel.name}`, inline: true },
          ],
          footer: `معرف العضو: ${member.id}`
        })
        return
      }

      // خرج من قناة صوت
      if (oldChannel && !newChannel) {
        await sendLog(client, newState.guild.id, "voice_leave", {
          title: "🔇 غادر قناة صوتية",
          color: LOG_COLORS.leave,
          fields: [
            { name: "👤 العضو", value: `${member} (${member.user.tag})`, inline: true },
            { name: "🔊 القناة", value: `${oldChannel.name}`, inline: true },
          ],
          footer: `معرف العضو: ${member.id}`
        })
        return
      }

      // انتقل بين قنوات
      if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
        await sendLog(client, newState.guild.id, "voice_move", {
          title: "↔️ انتقل بين قنوات صوتية",
          color: LOG_COLORS.update,
          fields: [
            { name: "👤 العضو", value: `${member} (${member.user.tag})`, inline: true },
            { name: "🔊 من", value: `${oldChannel.name}`, inline: true },
            { name: "🔊 إلى", value: `${newChannel.name}`, inline: true },
          ],
          footer: `معرف العضو: ${member.id}`
        })
      }

    } catch (err) {
      logger.error("LOG_VOICE_STATE_UPDATE_FAILED", { error: err.message })
    }
  }
}