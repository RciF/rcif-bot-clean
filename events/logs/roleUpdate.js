const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "roleUpdate",
  async execute(oldRole, newRole, client) {
    try {
      if (!newRole.guild) return
      if (oldRole.name === newRole.name && oldRole.color === newRole.color) return
      await sendLog(client, newRole.guild.id, "role_update", {
        title: "✏️ تعديل دور",
        color: LOG_COLORS.update,
        fields: [
          { name: "🏷️ الدور", value: newRole.name, inline: true },
          { name: "📝 الاسم القديم", value: oldRole.name, inline: true },
          { name: "📝 الاسم الجديد", value: newRole.name, inline: true }
        ],
        footer: "معرف الدور: " + newRole.id
      })
    } catch (err) {
      logger.error("LOG_ROLE_UPDATE_FAILED", { error: err.message })
    }
  }
}