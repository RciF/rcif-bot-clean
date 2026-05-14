// ══════════════════════════════════════════════════════════════════
//  messageCreate Event
//  المسار: events/messageCreate.js
//
//  الترتيب:
//   1. Dev command (prefix مخفي)
//   2. Alias resolver
//   3. Guild init
//   4. Protection (anti-spam)
//   5. AI (observation + social + auto-reply)
//   6. XP + Level-up
// ══════════════════════════════════════════════════════════════════

const guildManager = require("../utils/guildManager")
const logger = require("../systems/loggerSystem")
const scheduler = require("../systems/schedulerSystem")

const { DEV_PREFIXES, handleDeveloperCommand } = require("../commands/admin/developer")
const commandAliases = require("../systems/commandAliases")

const { handleProtection } = require("./handlers/protectionHandler")
const { handleAI } = require("./handlers/aiHandler")
const { handleXP } = require("./handlers/xpHandler")
const { handleAutoMod } = require("./handlers/automodHandler")

// ══════════════════════════════════════════════════════════
//  Deduplication
// ══════════════════════════════════════════════════════════
const processedMessages = new Map()
const PROCESSED_TTL = 10000

scheduler.register(
  "processed-messages-cleanup",
  60 * 1000,
  () => {
    const now = Date.now()
    for (const [id, timestamp] of processedMessages.entries()) {
      if (now - timestamp > PROCESSED_TTL) {
        processedMessages.delete(id)
      }
    }
  },
  false
)

module.exports = {
  name: "messageCreate",

  async execute(message, client) {
    try {
      if (!message?.author || message.author.bot) return
      if (!message.guild) return

      if (processedMessages.has(message.id)) return
      processedMessages.set(message.id, Date.now())

      // 1) Dev command
      const trimmedContent = message.content?.trim() || ""
      const matchedDevPrefix = DEV_PREFIXES.find(p =>
        trimmedContent === p || trimmedContent.startsWith(p + " ")
      )
      if (matchedDevPrefix) {
        await handleDeveloperCommand(message, client)
        return
      }

      // 2) Alias resolver
      try {
        const handled = await commandAliases.handleMessage(message, client)
        if (handled) return
      } catch (err) {
        logger.error("ALIAS_HANDLER_ERROR", { error: err.message })
      }

      // 3) Guild init
      try {
        await guildManager.getGuild(message.guild.id)
      } catch (err) {
        logger.error("GUILD_INIT_FAILED", { error: err.message })
      }

      // 4) Protection
      await handleProtection(message)

      // 4.5) AutoMod
      await handleAutoMod(message)
      
      // 5) AI
      await handleAI(message)

      // 6) XP
      await handleXP(message)

    } catch (error) {
      logger.error("MESSAGE_EVENT_FATAL_ERROR", {
        error: error.message,
        stack: error.stack
      })
    }
  }
}