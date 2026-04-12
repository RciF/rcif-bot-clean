const { AuditLogEvent } = require("discord.js")
const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const protectionSystem = require("../../systems/protectionSystem")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "guildBanAdd",

  async execute(ban, client) {
    try {
      if (!ban.guild) return

      // ══ Log العادي ══
      const fields = [
        { name: "👤 العضو", value: `${ban.user.tag}`, inline: true },
        { name: "🆔 المعرف", value: `${ban.user.id}`, inline: true }
      ]
      if (ban.reason) {
        fields.push({ name: "📋 السبب", value: ban.reason })
      }

      await sendLog(client, ban.guild.id, "member_ban", {
        title: "🔨 تم حظر عضو",
        color: LOG_COLORS.ban,
        fields,
        thumbnail: ban.user.displayAvatarURL({ size: 256 }),
        footer: `معرف العضو: ${ban.user.id}`
      })

      // ══ Anti-Nuke ══
      await new Promise(r => setTimeout(r, 500))

      const logs = await ban.guild.fetchAuditLogs({
        type: AuditLogEvent.MemberBanAdd,
        limit: 1
      }).catch(() => null)

      if (!logs) return

      const entry = logs.entries.first()
      if (!entry) return
      if (Date.now() - entry.createdTimestamp > 5000) return

      const executorId = entry.executor?.id
      if (!executorId || executorId === client.user.id) return

      await protectionSystem.checkNuke(ban.guild, executorId, "ban")

    } catch (err) {
      logger.error("GUILD_BAN_ADD_EVENT_FAILED", { error: err.message })
    }
  }
}