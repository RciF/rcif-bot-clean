const aiMemorySystem = require("./aiMemorySystem")
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

    if (this.ignoredChannelIds.includes(channel.id)) {
      return true
    }

    const name = (channel.name || "").toLowerCase()

    return this.ignoredChannelKeywords.some(keyword =>
      name.includes(keyword)
    )
  }

  extractKeywords(text) {
    const cleaned = this.cleanText(text)
    if (!cleaned) return []

    const words = cleaned
      .split(" ")
      .filter(w =>
        w.length > 3 &&
        !this.stopWords.includes(w)
      )

    return words.slice(0, 6)
  }

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

  async observeMessage(message) {

    try {

      if (!message) return
      if (!message.content) return
      if (!message.author) return
      if (message.author.bot) return

      if (this.shouldIgnoreChannel(message.channel)) return

      const userId = message.author.id
      const username = message.author.username
      const text = message.content

      const activity = this.trackUserActivity(userId)

      this.trackTopics(text)

      // ❌ disabled temporarily (fix error)
      // if (activity === this.activityThreshold) {
      //   const memory = `${username} عضو نشط في السيرفر`
      //   await aiMemorySystem.storeServerMemory(memory)
      // }

      await this.detectTrendingTopic()

    } catch (error) {

      logger.error("AI_OBSERVATION_ERROR", {
        error: error.message
      })

    }

  }

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

      // ❌ disabled temporarily
      // const memory = `الموضوع الشائع حالياً هو ${topWord}`
      // await aiMemorySystem.storeServerMemory(memory)

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