const memoryRepository = require("../repositories/memoryRepository")
const logger = require("./loggerSystem")
const aiSocialAwarenessSystem = require("./aiSocialAwarenessSystem")

class AiMemorySystem {

  constructor() {

    this.maxUserMemories = 50
    this.maxServerMemories = 20
    this.maxRelevantMemories = 5

    this.userBehaviorProfile = new Map()
    this.userEmotionProfile = new Map()
    this.userPredictionProfile = new Map()

    this.forbiddenWords = [
      "password","token","credit","bank","secret","pass","pin"
    ]

    this.typeWeights = {
      name: 10,
      preference: 7,
      interest: 6,
      opinion: 5,
      fact: 4,
      relationship: 8,
      behavior: 9,
      goal: 8,
      skill: 7,
      emotion: 9,
      prediction: 6
    }

    // 🔥 cache layer
    this.memoryCache = new Map()
    this.cacheTTL = 1000 * 60 * 5

  }

  // =========================
  // CLEANING
  // =========================

  cleanText(text) {
    if (!text) return ""

    return String(text)
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300)
  }

  normalize(text) {
    return this.cleanText(text).toLowerCase()
  }

  validateMemory(text) {

    if (!text) return false
    if (typeof text !== "string") return false
    if (text.length < 4) return false

    const lower = text.toLowerCase()

    for (const word of this.forbiddenWords) {
      if (lower.includes(word)) return false
    }

    return true
  }

  extractKeywords(text) {
    if (!text) return []

    return this.normalize(text)
      .split(" ")
      .filter(w => w.length > 3)
      .slice(0, 10)
  }

  similarity(a, b) {

    const wa = this.extractKeywords(a)
    const wb = this.extractKeywords(b)

    if (!wa.length || !wb.length) return 0

    let score = 0

    for (const w of wa) {
      if (wb.includes(w)) score++
    }

    return score
  }

  // =========================
  // DECAY + SOCIAL
  // =========================

  memoryDecay(memory) {

    if (!memory || !memory.created_at) return 0

    const created = new Date(memory.created_at).getTime()
    if (!created) return 0

    const age = Date.now() - created
    const days = age / (1000 * 60 * 60 * 24)

    return Math.max(0, 10 - (days * 0.4))
  }

  getSocialWeight(userId) {
    try {
      const social = aiSocialAwarenessSystem.getSocialContext(userId)
      if (!social) return 0

      if (social.networkStrength > 50) return 3
      if (social.networkStrength < -30) return -2

      return 1
    } catch {
      return 0
    }
  }

  // =========================
  // STORE DECISION
  // =========================

  shouldStoreMemory(message) {

    const text = this.normalize(message)

    if (text.includes("?")) return false
    if (text.length < 5) return false

    if (
      text.includes("اليوم") ||
      text.includes("الحين") ||
      text.includes("الحالي")
    ) return false

    return true
  }

  // =========================
  // PROFILES
  // =========================

  updateBehaviorProfile(userId, message) {

    if (!this.userBehaviorProfile.has(userId)) {
      this.userBehaviorProfile.set(userId, {
        totalMessages: 0,
        emotionalCount: 0,
        aggressiveCount: 0,
        shortMessages: 0
      })
    }

    const profile = this.userBehaviorProfile.get(userId)
    const text = this.normalize(message)

    profile.totalMessages++

    if (["حزين","زعلان","تعبان"].some(w => text.includes(w))) {
      profile.emotionalCount++
    }

    if (["غبي","اخرس","كلب"].some(w => text.includes(w))) {
      profile.aggressiveCount++
    }

    if (text.length < 5) {
      profile.shortMessages++
    }

    return profile
  }

  updateEmotionProfile(userId, emotion) {

    if (!emotion || !emotion.type) return

    if (!this.userEmotionProfile.has(userId)) {
      this.userEmotionProfile.set(userId, {
        sad: 0,
        happy: 0,
        angry: 0,
        fear: 0,
        last: null
      })
    }

    const profile = this.userEmotionProfile.get(userId)

    if (emotion.type !== "neutral") {
      profile[emotion.type] = (profile[emotion.type] || 0) + 1
      profile.last = emotion.type
    }

    return profile
  }

  updatePredictionProfile(userId, predictedBehavior) {

    if (!predictedBehavior || !predictedBehavior.type) return

    if (!this.userPredictionProfile.has(userId)) {
      this.userPredictionProfile.set(userId, {})
    }

    const profile = this.userPredictionProfile.get(userId)

    profile[predictedBehavior.type] =
      (profile[predictedBehavior.type] || 0) + 1

    return profile
  }

  // =========================
  // BUILD MEMORY
  // =========================

  async buildEmotionMemory(userId, profile) {

    if (!profile) return

    const entries = Object.entries(profile).filter(([k]) => k !== "last")
    const dominant = entries.sort((a, b) => b[1] - a[1])[0]

    if (!dominant || dominant[1] < 3) return

    const map = {
      sad: "يميل للحزن غالباً",
      angry: "يميل للغضب غالباً",
      fear: "يميل للتوتر والقلق",
      happy: "شخص إيجابي غالباً"
    }

    const summary = map[dominant[0]]
    if (!summary) return

    await this.storeMemory({ userId, type: "emotion", memory: summary })
  }

  async buildPredictionMemory(userId, profile) {

    if (!profile) return

    const entries = Object.entries(profile)
    const dominant = entries.sort((a, b) => b[1] - a[1])[0]

    if (!dominant || dominant[1] < 4) return

    const map = {
      repeat: "يميل لتكرار نفس الرسائل",
      deep_engagement: "يميل للنقاش العميق",
      escalation: "يميل للتصعيد",
      emotional_continuation: "يستمر في الحالة العاطفية"
    }

    const summary = map[dominant[0]]
    if (!summary) return

    await this.storeMemory({ userId, type: "prediction", memory: summary })
  }

  async buildBehaviorMemory(userId, profile) {

    if (!profile || profile.totalMessages < 5) return

    let summary = null

    if (profile.aggressiveCount >= 3) summary = "يميل للتعامل بعدوانية"
    else if (profile.emotionalCount >= 3) summary = "يتحدث بمشاعر عالية"
    else if (profile.shortMessages >= 3) summary = "يرسل رسائل قصيرة غالباً"

    if (!summary) return

    await this.storeMemory({ userId, type: "behavior", memory: summary })
  }

  // =========================
  // CACHE
  // =========================

  getCache(userId) {
    const cached = this.memoryCache.get(userId)
    if (!cached) return null

    if (Date.now() - cached.time > this.cacheTTL) {
      this.memoryCache.delete(userId)
      return null
    }

    return cached.data
  }

  setCache(userId, data) {
    this.memoryCache.set(userId, {
      data,
      time: Date.now()
    })
  }

  // =========================
  // STORE
  // =========================

  async storeMemory({ userId, type, memory }) {

    try {

      if (!userId || !type || !memory) return false

      const memoryText = this.cleanText(memory)
      if (!this.validateMemory(memoryText)) return false

      const memories = await memoryRepository.getUserMemories(userId) || []

      const duplicate = memories.find(m => {
        const sim = this.similarity(m.memory, memoryText)
        return sim >= 3 || this.normalize(m.memory) === this.normalize(memoryText)
      })

      if (duplicate) return false

      if (memories.length >= this.maxUserMemories) {
        await memoryRepository.removeOldestUserMemory(userId)
      }

      await memoryRepository.createMemory({
        userId: String(userId),
        type,
        memory: memoryText,
        createdAt: new Date()
      })

      this.memoryCache.delete(userId)

      return true

    } catch (error) {

      logger.error("AI_MEMORY_STORE_FAILED", {
        error: error.message
      })

      return false
    }
  }

  // =========================
  // FETCH
  // =========================

  async getUserMemories(userId) {

    try {

      if (!userId) return []

      const cached = this.getCache(userId)
      if (cached) return cached

      const memories = await memoryRepository.getUserMemories(userId) || []
      const result = memories.slice(0, this.maxUserMemories)

      this.setCache(userId, result)

      return result

    } catch (error) {

      logger.error("AI_MEMORY_FETCH_FAILED", {
        error: error.message
      })

      return []
    }
  }

  // =========================
  // SEARCH
  // =========================

  async searchRelevantMemories(userId, message) {

    try {

      const memories = await this.getUserMemories(userId)
      if (!memories.length) return []

      const text = this.normalize(message)
      const socialWeight = this.getSocialWeight(userId)

      const scored = memories.map(m => {

        const memoryText = this.normalize(m.memory)

        let score = 0

        score += this.similarity(memoryText, text) * 4

        if (text.includes(memoryText)) score += 10
        if (memoryText.includes(text)) score += 6

        score += this.typeWeights[m.type] || 1
        score += this.memoryDecay(m)

        if (memoryText.length < 40) score += 2

        score += socialWeight

        return { memory: m.memory, score }

      })

      return scored
        .filter(m => m.score > 5)
        .sort((a, b) => b.score - a.score)
        .slice(0, this.maxRelevantMemories)
        .map(m => m.memory)

    } catch (error) {

      logger.error("AI_MEMORY_SEARCH_FAILED", {
        error: error.message
      })

      return []
    }
  }

  // =========================
  // CONTEXT
  // =========================

  async injectMemoriesIntoContext(userId, message, context) {

    try {

      const relevant = await this.searchRelevantMemories(userId, message)
      if (!relevant.length) return context

      const memoryText = relevant.map(m => `Memory: ${m}`).join("\n")

      return `
[Relevant User Memory]
${memoryText}

${context}
`.trim()

    } catch (error) {

      logger.error("AI_MEMORY_INJECTION_FAILED", {
        error: error.message
      })

      return context
    }
  }

  // =========================
  // EXTRACTION
  // =========================

  async extractMemoryFromMessage(userId, message, emotion = null, predictedBehavior = null) {

    try {

      if (!this.shouldStoreMemory(message)) return false

      const profile = this.updateBehaviorProfile(userId, message)
      await this.buildBehaviorMemory(userId, profile)

      if (emotion) {
        const emotionProfile = this.updateEmotionProfile(userId, emotion)
        await this.buildEmotionMemory(userId, emotionProfile)
      }

      if (predictedBehavior) {
        const predictionProfile = this.updatePredictionProfile(userId, predictedBehavior)
        await this.buildPredictionMemory(userId, predictionProfile)
      }

      const cleaned = this.cleanText(message)
      if (!cleaned || cleaned.length < 5) return false

      const patterns = [

        { type: "name", regex: /اسمي\s+(.+)/i },
        { type: "name", regex: /my name is\s+(.+)/i },

        { type: "preference", regex: /احب\s+(.+)/i },
        { type: "preference", regex: /i like\s+(.+)/i },

        { type: "interest", regex: /اهتم\s+(.+)/i },
        { type: "interest", regex: /i am interested in\s+(.+)/i },

        { type: "opinion", regex: /اعتقد\s+(.+)/i },
        { type: "opinion", regex: /i think\s+(.+)/i },

        { type: "fact", regex: /انا\s+(.+)/i },
        { type: "fact", regex: /i am\s+(.+)/i },

        { type: "relationship", regex: /(.+)\s+صديقي/i },
        { type: "relationship", regex: /(.+)\s+my friend/i },

        { type: "goal", regex: /هدفي\s+(.+)/i },
        { type: "goal", regex: /my goal is\s+(.+)/i },

        { type: "skill", regex: /اجيد\s+(.+)/i },
        { type: "skill", regex: /i can\s+(.+)/i }
      ]

      for (const p of patterns) {

        const match = cleaned.match(p.regex)
        if (!match) continue

        const memory = match[1].trim()
        if (!memory || memory.length < 3) continue

        await this.storeMemory({
          userId,
          type: p.type,
          memory
        })

        return true
      }

      if (cleaned.length > 20) {
        await this.storeMemory({
          userId,
          type: "fact",
          memory: cleaned
        })
        return true
      }

      return false

    } catch (error) {

      logger.error("AI_MEMORY_EXTRACTION_FAILED", {
        error: error.message
      })

      return false
    }
  }

  // =========================
  // SERVER MEMORY
  // =========================

  async storeServerMemory(memory) {

    try {

      if (!memory) return false

      const clean = this.cleanText(memory)
      if (!this.validateMemory(clean)) return false

      await memoryRepository.createMemory({
        userId: "server",
        type: "server",
        memory: clean,
        createdAt: new Date()
      })

      return true

    } catch (error) {

      logger.error("AI_SERVER_MEMORY_FAILED", {
        error: error.message
      })

      return false
    }

  }

  async markUserAsAggressive(userId) {

    try {

      await this.storeMemory({
        userId,
        type: "behavior",
        memory: "يتحدث بأسلوب سيء"
      })

    } catch (error) {
      logger.error("AI_BEHAVIOR_STORE_FAILED", {
        error: error.message
      })
    }

  }

}

module.exports = new AiMemorySystem()