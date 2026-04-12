const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "guildUpdate",
  async execute(oldGuild, newGuild, client) {
    try {
      if (oldGuild.name === newGuild.name) return
      await sendLog(client, newGuild.id, "guild_update", {
        title: "✏️ تعديل السيرفر",
        color: LOG_COLORS.update,
        fields: [
          { name: "📝 الاسم القديم", value: oldGuild.name, inline: true },
          { name: "📝 الاسم الجديد", value: newGuild.name, inline: true }
        ],
        footer: "معرف السيرفر: " + newGuild.id
      })
    } catch (err) {
      logger.error("LOG_GUILD_UPDATE_FAILED", { error: err.message })
    }
  }
}