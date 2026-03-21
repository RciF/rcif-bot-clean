const { EmbedBuilder } = require("discord.js")
const levelSystem = require("../systems/levelSystem")
const aiAutoReplySystem = require("../systems/aiAutoReplySystem")
const xpCooldownSystem = require("../systems/xpCooldownSystem")
const guildManager = require("../utils/guildManager")
const aiSystem = require("../systems/aiSystem")
const xpSystem = require("../systems/xpSystem")
const aiObservationSystem = require("../systems/aiObservationSystem")
const aiSocialGraphSystem = require("../systems/aiSocialGraphSystem")
const aiSocialAwarenessSystem = require("../systems/aiSocialAwarenessSystem") // ✅ NEW
const aiHandler = require("../systems/aiHandler")
const logger = require("../systems/loggerSystem")

console.log("messageCreate event loaded")

module.exports = {
  name: "messageCreate",

  async execute(message, client) {

    try {

      if (!message?.author || message.author.bot) return
      if (!message.guild) return

      // 🔥 ensure guild exists
      try {
        guildManager.getGuild(message.guild.id)
      } catch (err) {
        logger.error("GUILD_INIT_FAILED", { error: err.message })
      }

      // 🔥 AI observation (non-blocking)
      try {
        aiObservationSystem.observeMessage(message)
      } catch (err) {
        logger.error("AI_OBSERVATION_FAILED", { error: err.message })
      }

      // 🔥 social graph (non-blocking)
      try {
        aiSocialGraphSystem.detectRelationships(message)
      } catch (err) {
        logger.error("AI_SOCIAL_GRAPH_FAILED", { error: err.message })
      }

      // 🔥 social awareness (FIXED)
      try {
        await aiSocialAwarenessSystem.trackInteraction(message)
      } catch (err) {
        logger.error("AI_SOCIAL_AWARENESS_FAILED", { error: err.message })
      }

      // 🔥 AI auto reply
      if (aiSystem.ensureAIEnabled(message)) {

        try {

          await aiHandler.askAI(
            message.author.id,
            message.content,
            {
              message: message,
              targetUserId: message.mentions?.users?.first()?.id || null
            }
          )

          await aiAutoReplySystem(message)

        } catch (err) {
          logger.error("AI_REPLY_FAILED", { error: err.message })
        }

      }

      // 🔥 XP system
      if (!xpSystem.ensureXPEnabled(message)) return

      if (xpCooldownSystem.canGainXP(message.author.id)) {

        let result

        try {
          result = await levelSystem.addXP(message.author.id, message.guild.id)
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