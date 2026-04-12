const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "roleDelete",
  async execute(role, client) {
    try {
      if (!role.guild) return
      if (role.managed) return
      await sendLog(client, role.guild.id, "role_delete", {
        title: "🗑️ دور محذوف",
        color: LOG_COLORS.delete,
        fields: [
          { name: "🏷️ الدور", value: role.name, inline: true },
          { name: "🎨 اللون", value: role.hexColor || "بدون لون", inline: true },
          { name: "👥 الأعضاء", value: String(role.members?.size || 0), inline: true }
        ],
        footer: "معرف الدور: " + role.id
      })
    } catch (err) {
      logger.error("LOG_ROLE_DELETE_FAILED", { error: err.message })
    }
  }
}