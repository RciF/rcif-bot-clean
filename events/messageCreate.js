const { EmbedBuilder } = require("discord.js")
const levelSystem = require("../systems/levelSystem")
const aiAutoReplySystem = require("../systems/aiAutoReplySystem")
const xpCooldownSystem = require("../systems/xpCooldownSystem")
const guildManager = require("../utils/guildManager")
const aiSystem = require("../systems/aiSystem")
const xpSystem = require("../systems/xpSystem")
const aiObservationSystem = require("../systems/aiObservationSystem")
const aiSocialAwarenessSystem = require("../systems/aiSocialAwarenessSystem")
const logger = require("../systems/loggerSystem")

// ✅ FIX: قفل عالمي لمنع معالجة نفس الرسالة مرتين
const processedMessages = new Set()
const PROCESSED_TTL = 10000 // 10 ثواني

module.exports = {
  name: "messageCreate",

  async execute(message, client) {

    try {

      if (!message?.author || message.author.bot) return
      if (!message.guild) return

      // ✅ FIX: تحقق من المعرف الفريد للرسالة — منع التكرار المطلق
      if (processedMessages.has(message.id)) return
      processedMessages.add(message.id)
      setTimeout(() => processedMessages.delete(message.id), PROCESSED_TTL)

      // 🔥 ensure guild exists
      try {
        await guildManager.getGuild(message.guild.id)
      } catch (err) {
        logger.error("GUILD_INIT_FAILED", { error: err.message })
      }

      // 🔥 AI observation (non-blocking)
      try {
        aiObservationSystem.observeMessage(message)
      } catch (err) {
        logger.error("AI_OBSERVATION_FAILED", { error: err.message })
      }

      // 🔥 social awareness
      try {
        await aiSocialAwarenessSystem.trackInteraction(message)
      } catch (err) {
        logger.error("AI_SOCIAL_AWARENESS_FAILED", { error: err.message })
      }

      // 🔥 AI auto reply
      const aiEnabled = await aiSystem.ensureAIEnabled(message)

      if (aiEnabled) {
        try {
          await aiAutoReplySystem(message)
        } catch (err) {
          logger.error("AI_REPLY_FAILED", { error: err.message })
        }
      }

      // 🔥 XP system
      const xpEnabled = await xpSystem.ensureXPEnabled(message)
      if (!xpEnabled) return

      if (xpCooldownSystem.canGainXP(message.author.id)) {

        let result

        try {
          result = await levelSystem.addXP(message.author.id, message.guild.id, message)
        } catch (err) {
          logger.error("XP_ADD_FAILED", { error: err.message })
          return
        }

        if (result?.leveledUp) {
          try {
            const embed = new EmbedBuilder()
              .setTitle("🎉 Level Up!")
              .setDescription(`${message.author} وصل للمستوى **${result.level}**`)
              .setColor(0x00ff00)
              .setThumbnail(message.author.displayAvatarURL())

            await message.channel.send({ embeds: [embed] })
          } catch (err) {
            logger.error("LEVEL_UP_MESSAGE_FAILED", { error: err.message })
          }
        }

      }

    } catch (error) {
      logger.error("MESSAGE_EVENT_FATAL_ERROR", {
        error: error.message,
        stack: error.stack
      })
    }

  }

}