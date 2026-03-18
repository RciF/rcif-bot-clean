/**
 * AI Memory System (Enhanced Intelligence)
 */

const memoryRepository = require("../repositories/memoryRepository")
const logger = require("./loggerSystem")

class AiMemorySystem {

  constructor() {

    this.maxUserMemories = 50
    this.maxServerMemories = 20
    this.maxRelevantMemories = 5

    this.forbiddenWords = [
      "password","token","credit","bank","secret","pass","pin"
    ]

    // 🔥 NEW: type priority
    this.typeWeights = {
      name: 10,
      preference: 7,
      interest: 6,
      opinion: 5,
      fact: 4
    }

  }

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
    if (text.length < 3) return false

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
      .slice(0, 8)
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

  memoryDecay(memory) {

    if (!memory || !memory.created_at) return 0

    const created = new Date(memory.created_at).getTime()
    if (!created) return 0

    const age = Date.now() - created
    const days = age / (1000 * 60 * 60 * 24)

    return Math.max(0, 5 - days)
  }

  async storeMemory({ userId, type, memory }) {

    try {

      if (!userId || !type || !memory) return false

      const memoryText = this.cleanText(memory)

      if (!this.validateMemory(memoryText)) return false

      const memories = await memoryRepository.getUserMemories(userId) || []

      const duplicate = memories.find(m =>
        this.similarity(m.memory, memoryText) >= 3
      )

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

      return true

    } catch (error) {

      logger.error("AI_MEMORY_STORE_FAILED", {
        error: error.message
      })

      return false
    }
  }

  async getUserMemories(userId) {

    try {

      if (!userId) return []

      const memories = await memoryRepository.getUserMemories(userId)
      if (!memories) return []

      return memories.slice(0, this.maxUserMemories)

    } catch (error) {

      logger.error("AI_MEMORY_FETCH_FAILED", {
        error: error.message
      })

      return []
    }
  }

  async searchRelevantMemories(userId, message) {

    try {

      const memories = await this.getUserMemories(userId)
      if (!memories.length) return []

      const text = this.normalize(message)

      const scored = memories.map(m => {

        const memoryText = this.normalize(m.memory)

        let score = 0

        // 🔥 similarity
        score += this.similarity(memoryText, text) * 3

        // 🔥 direct match boost
        if (text.includes(memoryText)) score += 6

        // 🔥 type weight
        score += this.typeWeights[m.type] || 1

        // 🔥 recency
        score += this.memoryDecay(m)

        return {
          memory: m.memory,
          score
        }

      })

      return scored
        .filter(m => m.score > 2) // 🔥 remove weak memories
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

  async injectMemoriesIntoContext(userId, message, context) {

    try {

      const relevant = await this.searchRelevantMemories(userId, message)

      if (!relevant.length) return context

      const memoryText = relevant
        .map(m => `Memory: ${m}`)
        .join("\n")

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

  async extractMemoryFromMessage(userId, message) {

    try {

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
        { type: "fact", regex: /i am\s+(.+)/i }

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

      return false

    } catch (error) {

      logger.error("AI_MEMORY_EXTRACTION_FAILED", {
        error: error.message
      })

      return false
    }
  }

}

module.exports = new AiMemorySystem()