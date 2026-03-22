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

    // 🔥 NEW: dynamic weights (ما حذفنا الأصلي)
    this.dynamicTypeWeights = { ...this.typeWeights }

    this.memoryCache = new Map()
    this.cacheTTL = 1000 * 60 * 5

    // 🔥 COMPRESSION
    this.compressionThreshold = 3
    this.minMergeSimilarity = 2

    // 🔥 SELF-LEARNING MEMORY FEEDBACK
    this.learningSignals = new Map()

    // 🔥 PHASE 3: FEEDBACK MEMORY QUALITY
    this.memoryFeedback = new Map()

    // 🔥 NEW: decay + confidence
    this.feedbackDecayRate = 0.97
    this.memoryConfidence = new Map()

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
  // 🔥 SELF-LEARNING
  // =========================

  updateLearningSignal(userId, type) {
    const data = this.learningSignals.get(userId) || {
      stored: 0,
      skipped: 0
    }

    if (data[type] !== undefined) {
      data[type]++
    }

    this.learningSignals.set(userId, data)
  }

  getLearningAdjustment(userId) {
    const data = this.learningSignals.get(userId)
    if (!data) return 0

    const total = data.stored + data.skipped
    if (total === 0) return 0

    const ratio = data.stored / total

    if (ratio > 0.7) return 0.1
    if (ratio < 0.3) return -0.1

    return 0
  }

  // 🔥 UPDATED FEEDBACK (مطور بدون حذف)
  updateMemoryFeedback(memoryId, outcome, confidence = 0.5) {
    if (!memoryId) return

    const data = this.memoryFeedback.get(memoryId) || {
      positive: 0,
      negative: 0
    }

    const weight = Math.max(0.5, confidence)

    if (outcome === "positive") data.positive += weight
    if (outcome === "negative") data.negative += weight

    this.memoryFeedback.set(memoryId, data)
    this.memoryConfidence.set(memoryId, weight)

    // 🔥 decay
    data.positive *= this.feedbackDecayRate
    data.negative *= this.feedbackDecayRate

    // 🔥 adaptive weights
    const total = data.positive + data.negative
    if (total > 3) {
      const score = (data.positive - data.negative) / total

      for (const type in this.dynamicTypeWeights) {
        this.dynamicTypeWeights[type] += score * 0.01
        this.dynamicTypeWeights[type] = Math.max(1, Math.min(15, this.dynamicTypeWeights[type]))
      }
    }
  }

  getMemoryFeedbackScore(memoryId) {
    const data = this.memoryFeedback.get(memoryId)
    if (!data) return 0

    const total = data.positive + data.negative
    if (total === 0) return 0

    return (data.positive - data.negative) / total
  }

  // =========================
  // COMPRESSION
  // =========================
  groupSimilarMemories(memories) {
    const groups = []

    for (const mem of memories) {
      let added = false

      for (const group of groups) {
        const sim = this.similarity(group[0].memory, mem.memory)

        if (sim >= this.minMergeSimilarity) {
          group.push(mem)
          added = true
          break
        }
      }

      if (!added) {
        groups.push([mem])
      }
    }

    return groups
  }

  summarizeGroup(group) {
    if (group.length === 1) return group[0]

    const base = group[0].memory

    return {
      ...group[0],
      memory: base + " (متكرر)"
    }
  }

  compressMemories(memories) {
    if (!Array.isArray(memories) || memories.length < this.compressionThreshold) {
      return memories
    }

    const groups = this.groupSimilarMemories(memories)

    return groups.map(g => this.summarizeGroup(g))
  }

  // =========================
  // 🔥 PRIORITY SYSTEM
  // =========================

  getMemoryPriority(memory, userId) {
    let score = 0

    // 🔥 dynamic بدل الثابت (بدون حذف القديم)
    score += this.dynamicTypeWeights[memory.type] || this.typeWeights[memory.type] || 1

    score += this.memoryDecay(memory)

    try {
      score += this.getSocialWeight(userId)
    } catch {}

    score += this.getLearningAdjustment(userId)

    // 🔥 FEEDBACK BOOST (محسن)
    if (memory.id) {
      score += this.getMemoryFeedbackScore(memory.id) * 6
    }

    if (memory.memory.length < 50) score += 1

    return score
  }

  applyDynamicLimit(memories, userId) {
    if (memories.length <= this.maxUserMemories) return memories

    const scored = memories.map(m => ({
      data: m,
      score: this.getMemoryPriority(m, userId)
    }))

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, this.maxUserMemories)
      .map(m => m.data)
  }

  // =========================
  // DECAY + SOCIAL
  // =========================

  memoryDecay(memory) {
    if (!memory || !memory.createdAt) return 0

    const created = new Date(memory.createdAt).getTime()
    if (isNaN(created)) return 0

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
  // STORE
  // =========================

  async storeMemory({ userId, type, memory }) {

    try {

      if (!userId || !type || !memory) return false

      const memoryText = this.cleanText(memory)
      if (!this.validateMemory(memoryText)) {
        this.updateLearningSignal(userId, "skipped")
        return false
      }

      let memories = await memoryRepository.getUserMemories(userId) || []

      memories = this.compressMemories(memories)

      const duplicate = memories.find(m => {
        const sim = this.similarity(m.memory, memoryText)
        return sim >= 3 || this.normalize(m.memory) === this.normalize(memoryText)
      })

      if (duplicate) {
        this.updateLearningSignal(userId, "skipped")
        return false
      }

      memories = this.applyDynamicLimit(memories, userId)

      if (memories.length >= this.maxUserMemories) {
        await memoryRepository.removeOldestUserMemory(userId)
      }

      const created = await memoryRepository.createMemory({
        userId: String(userId),
        type,
        memory: memoryText,
        createdAt: new Date()
      })

      this.memoryCache.delete(userId)

      this.updateLearningSignal(userId, "stored")

      return created

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

      let memories = await memoryRepository.getUserMemories(userId) || []

      memories = this.compressMemories(memories)
      memories = this.applyDynamicLimit(memories, userId)

      this.setCache(userId, memories)

      return memories

    } catch (error) {

      logger.error("AI_MEMORY_FETCH_FAILED", {
        error: error.message
      })

      return []
    }
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

        // 🔥 dynamic weights
        score += this.dynamicTypeWeights[m.type] || this.typeWeights[m.type] || 1

        score += this.memoryDecay(m)

        if (memoryText.length < 40) score += 2

        score += socialWeight
        score += this.getLearningAdjustment(userId)

        if (m.id) {
          score += this.getMemoryFeedbackScore(m.id) * 6
        }

        return { memory: m.memory, id: m.id, score }

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
      await this.buildBehaviorMemory?.(userId, profile)

      if (emotion) {
        const emotionProfile = this.updateEmotionProfile(userId, emotion)
        await this.buildEmotionMemory?.(userId, emotionProfile)
      }

      if (predictedBehavior) {
        const predictionProfile = this.updatePredictionProfile(userId, predictedBehavior)
        await this.buildPredictionMemory?.(userId, predictionProfile)
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