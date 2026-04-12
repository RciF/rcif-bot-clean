const { AuditLogEvent } = require("discord.js")
const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const protectionSystem = require("../../systems/protectionSystem")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "roleDelete",

  async execute(role, client) {
    try {
      if (!role.guild) return
      if (role.managed) return

      // ══ Log العادي ══
      await sendLog(client, role.guild.id, "role_delete", {
        title: "🗑️ دور محذوف",
        color: LOG_COLORS.delete,
        fields: [
          { name: "🏷️ الدور", value: role.name, inline: true },
          { name: "🎨 اللون", value: role.hexColor || "بدون لون", inline: true },
          { name: "👥 الأعضاء", value: `${role.members?.size || 0}`, inline: true }
        ],
        footer: `معرف الدور: ${role.id}`
      })

      // ══ Anti-Nuke ══
      await new Promise(r => setTimeout(r, 800))

      const logs = await role.guild.fetchAuditLogs({
        type: AuditLogEvent.RoleDelete,
        limit: 1
      }).catch(() => null)

      if (!logs) return

      const entry = logs.entries.first()
      if (!entry) return
      if (Date.now() - entry.createdTimestamp > 5000) return

      const executorId = entry.executor?.id
      if (!executorId || executorId === client.user.id) return

      await protectionSystem.checkNuke(role.guild, executorId, "roleDelete")

    } catch (err) {
      logger.error("ROLE_DELETE_EVENT_FAILED", { error: err.message })
    }
  }
}