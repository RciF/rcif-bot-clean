const { AuditLogEvent } = require("discord.js")
const { sendLog, LOG_COLORS } = require("../../utils/logSender")
const protectionSystem = require("../../systems/protectionSystem")
const moderationLogger = require("../../utils/moderationLogger")
const logger = require("../../systems/loggerSystem")

module.exports = {
  name: "guildBanAdd",

  async execute(ban, client) {
    try {
      if (!ban.guild) return

      let executorId = null
      let auditReason = ban.reason || null

      try {
        await new Promise(r => setTimeout(r, 500))
        const logs = await ban.guild.fetchAuditLogs({
          type: AuditLogEvent.MemberBanAdd,
          limit: 1
        }).catch(() => null)

        if (logs) {
          const entry = logs.entries.first()
          if (entry && Date.now() - entry.createdTimestamp < 10000) {
            executorId = entry.executor?.id || null
            if (!auditReason && entry.reason) auditReason = entry.reason
          }
        }
      } catch {}

      // ✅ احفظ في moderation_bans (للداش)
      moderationLogger.logBan({
        guildId: ban.guild.id,
        userId: ban.user.id,
        username: ban.user.username || ban.user.tag,
        reason: auditReason,
        moderatorId: executorId
      }).catch(() => {})

      // ══ Log العادي ══
      const fields = [
        { name: "👤 العضو", value: `${ban.user.tag}`, inline: true },
        { name: "🆔 المعرف", value: `${ban.user.id}`, inline: true }
      ]
      if (auditReason) {
        fields.push({ name: "📋 السبب", value: auditReason })
      }

      await sendLog(client, ban.guild.id, "member_ban", {
        title: "🔨 تم حظر عضو",
        color: LOG_COLORS.ban,
        fields,
        thumbnail: ban.user.displayAvatarURL({ size: 256 }),
        footer: `معرف العضو: ${ban.user.id}`
      })

      // ══ Anti-Nuke ══
      if (executorId && executorId !== client.user.id) {
        await protectionSystem.checkNuke(ban.guild, executorId, "ban")
      }

    } catch (err) {
      logger.error("GUILD_BAN_ADD_EVENT_FAILED", { error: err.message })
    }
  }
}