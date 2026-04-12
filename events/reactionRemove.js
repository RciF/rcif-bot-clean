const databaseSystem = require("../systems/databaseSystem")
const logger = require("../systems/loggerSystem")

function getEmojiKey(emoji) {
  if (!emoji) return null
  if (emoji.id) return emoji.id
  return emoji.name
}

module.exports = {
  name: "messageReactionRemove",

  async execute(reaction, user, client) {
    try {
      if (user.bot) return

      if (reaction.partial) {
        try { await reaction.fetch() } catch { return }
      }
      if (reaction.message.partial) {
        try { await reaction.message.fetch() } catch { return }
      }

      const guild = reaction.message.guild
      if (!guild) return

      const emojiKey = getEmojiKey(reaction.emoji)
      if (!emojiKey) return

      // ✅ جلب الـ Reaction Role
      const rr = await databaseSystem.queryOne(
        "SELECT * FROM reaction_roles WHERE guild_id = $1 AND message_id = $2 AND emoji = $3",
        [guild.id, reaction.message.id, emojiKey]
      )
      if (!rr) return

      // ✅ جلب العضو
      const member = await guild.members.fetch(user.id).catch(() => null)
      if (!member) return

      // ✅ سحب الرتبة
      const role = guild.roles.cache.get(rr.role_id)
      if (!role) return

      if (role.position >= guild.members.me.roles.highest.position) return

      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role, "Reaction Role Removed").catch(() => {})
      }

    } catch (err) {
      logger.error("REACTION_REMOVE_ERROR", { error: err.message })
    }
  }
}