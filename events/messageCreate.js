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
const protectionSystem = require("../systems/protectionSystem")
const scheduler = require("../systems/schedulerSystem")

// ✅ معالج أمر المطور (بريفكس مخفي)
const { DEV_PREFIXES, handleDeveloperCommand } = require("../commands/admin/developer")

// ══════════════════════════════════════════════════════════
//  PROCESSED MESSAGES TRACKING
//  Map<messageId, timestamp> — يمنع double-processing
//  TTL = 10 ثواني (بعدها الرسالة لن تأتي مرة ثانية)
//
//  التنظيف: scheduler واحد كل دقيقة (مو setTimeout لكل رسالة)
//  هذا يمنع تراكم آلاف الـ setTimeout في السيرفرات النشطة
// ══════════════════════════════════════════════════════════

const processedMessages = new Map()
const PROCESSED_TTL = 10000 // 10 ثواني
const CLEANUP_INTERVAL = 60 * 1000 // دقيقة

// تسجيل التنظيف عبر scheduler عشان graceful shutdown يقدر يوقفه
scheduler.register(
  "processed-messages-cleanup",
  CLEANUP_INTERVAL,
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

      // ✅ تحقق وحفظ بـ Map (مع timestamp للتنظيف)
      if (processedMessages.has(message.id)) return
      processedMessages.set(message.id, Date.now())

      // ══════════════════════════════════════════════════════════
      //  🔒 معالج أمر المطور (بريفكس مخفي)
      //  يفحص بداية الرسالة بأي من البريفكسات: !مطور / $مطور / .مطور
      //  لو طابقت → يستدعي المعالج (والمعالج نفسه يفحص isOwner)
      //  لو ما طابقت → نكمل مسار الرسالة العادي
      // ══════════════════════════════════════════════════════════
      const trimmedContent = message.content?.trim() || ""
      const matchedDevPrefix = DEV_PREFIXES.find(p =>
        trimmedContent === p || trimmedContent.startsWith(p + " ")
      )
      if (matchedDevPrefix) {
        await handleDeveloperCommand(message, client)
        return // ⚠️ نوقف هنا — ما نكمل XP/AI لرسالة الأمر
      }

      // 🔥 ensure guild exists
      try {
        await guildManager.getGuild(message.guild.id)
      } catch (err) {
        logger.error("GUILD_INIT_FAILED", { error: err.message })
      }

      try {
        await protectionSystem.checkSpam(message)
      } catch (err) {
        logger.error("ANTISPAM_CHECK_FAILED", { error: err.message })
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
            // ✅ جلب إعدادات قناة الصعود
            let targetChannel = message.channel
            if (result.settings?.levelup_channel_id) {
              const levelupChannel = message.guild.channels.cache.get(result.settings.levelup_channel_id)
              if (levelupChannel) targetChannel = levelupChannel
            }

            const embed = new EmbedBuilder()
              .setTitle("🎉 Level Up!")
              .setDescription(`${message.author} وصل للمستوى **${result.level}**`)
              .setColor(0x00ff00)
              .setThumbnail(message.author.displayAvatarURL())

            await targetChannel.send({ embeds: [embed] })
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