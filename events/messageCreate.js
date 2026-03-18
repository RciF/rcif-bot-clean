const { EmbedBuilder } = require("discord.js")
const levelSystem = require("../systems/levelSystem")
const aiAutoReplySystem = require("../systems/aiAutoReplySystem")
const xpCooldownSystem = require("../systems/xpCooldownSystem")
const guildManager = require("../utils/guildManager")
const aiSystem = require("../systems/aiSystem")
const xpSystem = require("../systems/xpSystem")
const aiObservationSystem = require("../systems/aiObservationSystem")
const aiSocialGraphSystem = require("../systems/aiSocialGraphSystem")

console.log("messageCreate event loaded")

module.exports = {
  name: "messageCreate",

  async execute(message, client) {

    if (message.author.bot) return
    if (!message.guild) return

    guildManager.getGuild(message.guild.id)

    // AI Observation System
    aiObservationSystem.observeMessage(message)

    // AI Social Graph System
    aiSocialGraphSystem.detectRelationships(message)

    if (aiSystem.ensureAIEnabled(message)) {

      await aiAutoReplySystem(message, {
        user: message.author,
        guild: message.guild,
        channel: message.channel
      })

    }

    if (!xpSystem.ensureXPEnabled(message)) return

    if (xpCooldownSystem.canGainXP(message.author.id)) {

      const result = await levelSystem.addXP(message.author.id, message.guild.id)

      if (result.leveledUp) {

        const embed = new EmbedBuilder()
          .setTitle("🎉 Level Up!")
          .setDescription(`${message.author} وصل للمستوى **${result.level}**`)
          .setColor(0x00ff00)
          .setThumbnail(message.author.displayAvatarURL())

        await message.channel.send({ embeds: [embed] })

      }

    }

  }

}