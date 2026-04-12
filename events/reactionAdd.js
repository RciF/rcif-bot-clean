const databaseSystem = require("../systems/databaseSystem")
const logger = require("../systems/loggerSystem")

// ══════════════════════════════════════
//  Helper: استخراج مفتاح الإيموجي
// ══════════════════════════════════════
function getEmojiKey(emoji) {
  if (!emoji) return null
  // Custom emoji — نرجع الـ ID
  if (emoji.id) return emoji.id
  // Unicode emoji
  return emoji.name
}

// ══════════════════════════════════════
//  Helper: جلب Reaction Roles من DB
// ══════════════════════════════════════
async function getReactionRole(guildId, messageId, emojiKey) {
  return await databaseSystem.queryOne(
    "SELECT * FROM reaction_roles WHERE guild_id = $1 AND message_id = $2 AND emoji = $3",
    [guildId, messageId, emojiKey]
  )
}

// ══════════════════════════════════════
//  Helper: جلب كل RR على نفس الرسالة بنفس الوضع
// ══════════════════════════════════════
async function getExclusiveGroup(guildId, messageId, excludeRoleId) {
  return await databaseSystem.queryMany(
    "SELECT * FROM reaction_roles WHERE guild_id = $1 AND message_id = $2 AND mode = 'exclusive' AND role_id != $3",
    [guildId, messageId, excludeRoleId]
  )
}

// ══════════════════════════════════════
//  Event: reactionAdd
// ══════════════════════════════════════
module.exports = {
  name: "messageReactionAdd",

  async execute(reaction, user, client) {
    try {
      // تجاهل البوتات
      if (user.bot) return

      // جلب الريأكشن الكامل لو كان partial
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
      const rr = await getReactionRole(guild.id, reaction.message.id, emojiKey)
      if (!rr) return

      // ✅ جلب العضو
      const member = await guild.members.fetch(user.id).catch(() => null)
      if (!member) return

      // ✅ تحقق: البوت يقدر يعطي الرتبة
      const role = guild.roles.cache.get(rr.role_id)
      if (!role) return

      if (role.position >= guild.members.me.roles.highest.position) return

      // ✅ إعطاء الرتبة
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role, "Reaction Role").catch(() => {})
      }

      // ✅ وضع Exclusive — شيل باقي الرتب من نفس المجموعة
      if (rr.mode === "exclusive") {
        const exclusiveGroup = await getExclusiveGroup(guild.id, reaction.message.id, rr.role_id)

        for (const other of exclusiveGroup) {
          const otherRole = guild.roles.cache.get(other.role_id)
          if (otherRole && member.roles.cache.has(otherRole.id)) {
            await member.roles.remove(otherRole, "Reaction Role Exclusive").catch(() => {})

            // إزالة الريأكشن الآخر من الرسالة
            try {
              const msg = reaction.message
              const otherReaction = msg.reactions.cache.find(r => getEmojiKey(r.emoji) === other.emoji)
              if (otherReaction) {
                await otherReaction.users.remove(user.id).catch(() => {})
              }
            } catch {}
          }
        }
      }

    } catch (err) {
      logger.error("REACTION_ADD_ERROR", { error: err.message })
    }
  }
}