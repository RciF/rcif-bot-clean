const aiMemorySystem = require("./aiMemorySystem")
const aiSocialAwarenessSystem = require("./aiSocialAwarenessSystem")
const logger = require("./loggerSystem")

class AiObservationSystem {

  constructor() {

    this.activityThreshold = 3
    this.trendingThreshold = 6

    this.userActivity = new Map()
    this.topicTracker = new Map()

    this.lastTrendingTopic = null
    this.lastTrendingTime = 0
    this.trendingCooldown = 10 * 60 * 1000

    this.maxTrackedTopics = 200
    this.maxTrackedUsers = 500

    this.stopWords = [
      "هذا","هذه","ذلك","الذي","التي",
      "الى","على","عن","في","من",
      "the","and","you","this","that"
    ]

    this.ignoredChannelKeywords = [
      "log","logs","bot","admin","mod",
      "staff","ticket","support",
      "command","commands"
    ]

    this.ignoredChannelIds = []

  }

  // =========================
  // CLEANING
  // =========================

  cleanText(text) {
    if (!text) return ""

    return String(text)
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .trim()
  }

  shouldIgnoreChannel(channel) {
    if (!channel) return true

    if (this.ignoredChannelIds.includes(channel.id)) return true

    const name = (channel.name || "").toLowerCase()

    return this.ignoredChannelKeywords.some(k => name.includes(k))
  }

  // =========================
  // KEYWORDS
  // =========================

  extractKeywords(text) {
    const cleaned = this.cleanText(text)
    if (!cleaned) return []

    return cleaned
      .split(" ")
      .filter(w => w.length > 3 && !this.stopWords.includes(w))
      .slice(0, 6)
  }

  // =========================
  // USER ACTIVITY
  // =========================

  trackUserActivity(userId) {
    if (!userId) return 0

    if (this.userActivity.size > this.maxTrackedUsers) {
      this.userActivity.clear()
    }

    const count = this.userActivity.get(userId) || 0
    const newCount = count + 1

    this.userActivity.set(userId, newCount)
    return newCount
  }

  // =========================
  // TOPIC TRACKING
  // =========================

  trackTopics(message) {
    const keywords = this.extractKeywords(message)
    if (!keywords.length) return

    for (const word of keywords) {

      if (this.topicTracker.size > this.maxTrackedTopics) {
        this.topicTracker.clear()
      }

      const count = this.topicTracker.get(word) || 0
      this.topicTracker.set(word, count + 1)
    }
  }

  getTopTopics(limit = 5) {
    return Array.from(this.topicTracker.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word, count]) => ({ word, count }))
  }

  // =========================
  // OBSERVE
  // =========================

  async observeMessage(message) {

    try {

      if (!message || !message.content || !message.author) return
      if (message.author.bot) return
      if (this.shouldIgnoreChannel(message.channel)) return

      const userId = message.author.id
      const text = message.content

      const activity = this.trackUserActivity(userId)

      this.trackTopics(text)

      // ✅ user activity memory
      if (activity === this.activityThreshold) {
        await aiMemorySystem.storeMemory({
          userId,
          type: "behavior",
          memory: "نشط في السيرفر"
        })
      }

      // 🔥 advanced social tracking (multi mention)
      if (message.mentions?.users?.size > 0) {
        for (const [, target] of message.mentions.users) {
          if (!target || target.id === userId) continue

          await aiSocialAwarenessSystem.trackInteractionSimple(
            userId,
            target.id,
            "message"
          )
        }
      }

      // 🔥 cluster awareness (boost group interaction)
      await this.detectGroupInteraction(message)

      await this.detectTrendingTopic()

    } catch (error) {
      logger.error("AI_OBSERVATION_ERROR", {
        error: error.message
      })
    }

  }

  // =========================
  // 🔥 GROUP INTELLIGENCE
  // =========================

  async detectGroupInteraction(message) {
    try {

      const mentions = message.mentions?.users
      if (!mentions || mentions.size < 2) return

      const users = Array.from(mentions.values()).map(u => u.id)

      for (let i = 0; i < users.length; i++) {
        for (let j = i + 1; j < users.length; j++) {

          await aiSocialAwarenessSystem.trackInteractionSimple(
            users[i],
            users[j],
            "reply"
          )

        }
      }

    } catch (err) {
      logger.error("GROUP_INTERACTION_ERROR", {
        error: err.message
      })
    }
  }

  // =========================
  // TRENDING
  // =========================

  async detectTrendingTopic() {

    try {

      if (!this.topicTracker.size) return

      let topWord = null
      let topCount = 0

      for (const [word, count] of this.topicTracker.entries()) {
        if (count > topCount) {
          topWord = word
          topCount = count
        }
      }

      if (!topWord) return
      if (topCount < this.trendingThreshold) return

      const now = Date.now()

      if (this.lastTrendingTopic === topWord) return
      if (now - this.lastTrendingTime < this.trendingCooldown) return

      // 🔥 trending memory
      await aiMemorySystem.storeServerMemory(
        `الموضوع الشائع حالياً: ${topWord}`
      )

      // 🔥 inject richer context
      await aiMemorySystem.storeServerMemory(
        `كلمات مرتبطة: ${this.getTopTopics(3).map(t => t.word).join(", ")}`
      )

      this.lastTrendingTopic = topWord
      this.lastTrendingTime = now

      this.topicTracker.clear()

    } catch (error) {
      logger.error("AI_TRENDING_TOPIC_ERROR", {
        error: error.message
      })
    }

  }

}

module.exports = new AiObservationSystem()