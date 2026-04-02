const { EmbedBuilder } = require("discord.js")

const guildManager = require("../utils/guildManager")
const logger = require("../systems/loggerSystem")

// AI
const aiSystem = require("../systems/aiSystem")
const aiHandler = require("../systems/aiHandler")
const aiAutoReplySystem = require("../systems/aiAutoReplySystem")
const aiObservationSystem = require("../systems/aiObservationSystem")
const aiSocialAwarenessSystem = require("../systems/aiSocialAwarenessSystem")

// XP
const xpSystem = require("../systems/xpSystem")
const xpCooldownSystem = require("../systems/xpCooldownSystem")
const levelSystem = require("../systems/levelSystem")

console.log("✅ messageCreate loaded (optimized)")

module.exports = {
  name: "messageCreate",

  async execute(message, client) {

    if (!message || !message.author || message.author.bot) return
    if (!message.guild) return

    // ✅ التخفيف (السطر المهم)
    if (!message.content || message.content.length < 3) return

    const userId = message.author.id
    const guildId = message.guild.id

    // 🔹 Guild init
    try {
      guildManager.getGuild(guildId)
    } catch (err) {
      logger.error("GUILD_INIT_FAILED", { error: err.message })
    }

    // 🔹 Observation
    try {
      aiObservationSystem.observeMessage(message)
    } catch (err) {
      logger.error("AI_OBSERVATION_FAILED", { error: err.message })
    }

    // 🔹 Social
    try {
      aiSocialAwarenessSystem.trackInteraction(message)
    } catch (err) {
      logger.error("AI_SOCIAL_FAILED", { error: err.message })
    }

    // 🔹 AI (مهم جداً)
    try {

      if (aiSystem.ensureAIEnabled(message)) {

        let reply = null

        try {
          reply = await aiHandler.askAI(
            userId,
            message.content,
            {
              message,
              targetUserId: message.mentions && message.mentions.users
                ? message.mentions.users.first()?.id || null
                : null
            }
          )
        } catch (e) {
          logger.error("AI_ERROR", { error: e.message })
        }

        if (reply) {
          try {
            await aiAutoReplySystem(message, reply)
          } catch (e) {
            logger.error("AI_REPLY_FAILED", { error: e.message })
          }
        }

      }

    } catch (err) {
      logger.error("AI_SYSTEM_FAILED", { error: err.message })
    }

    // 🔹 XP
    try {

      if (!xpSystem.ensureXPEnabled(message)) return

      if (!xpCooldownSystem.canGainXP(userId)) return

      const result = await levelSystem.addXP(userId, guildId)

      if (result && result.leveledUp) {

        const embed = new EmbedBuilder()
          .setTitle("🎉 Level Up!")
          .setDescription(`${message.author} وصل للمستوى **${result.level}**`)
          .setColor(0x00ff00)
          .setThumbnail(message.author.displayAvatarURL())

        await message.channel.send({ embeds: [embed] })

      }

    } catch (err) {
      logger.error("XP_SYSTEM_FAILED", { error: err.message })
    }

  }
}