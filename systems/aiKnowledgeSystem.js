const OpenAI = require("openai")
const logger = require("./loggerSystem")
const knowledgeRepository = require("../repositories/knowledgeRepository")

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

class AIKnowledgeSystem {

  constructor() {

    this.maxKnowledgeResults = 5
    this.maxContentLength = 2000
    this.minLearnLength = 15

    this.embeddingCache = new Map()
    this.maxCacheSize = 100

    this.minRelevanceScore = 0.35

    // 🔥 self-learning signals
    this.learningStats = new Map()
  }

  // =========================
  // 🔥 SELF LEARNING
  // =========================

  updateLearning(userId, success = true) {
    if (!userId) return

    const data = this.learningStats.get(userId) || {
      learned: 0,
      skipped: 0
    }

    if (success) data.learned++
    else data.skipped++

    this.learningStats.set(userId, data)
  }

  getLearningBias(userId) {
    const data = this.learningStats.get(userId)
    if (!data) return 0

    const total = data.learned + data.skipped
    if (total === 0) return 0

    const ratio = data.learned / total

    if (ratio > 0.7) return 0.1
    if (ratio < 0.3) return -0.1

    return 0
  }

  sanitizeText(text) {

    if (!text) return ""

    const cleaned = String(text)
      .replace(/\s+/g, " ")
      .trim()

    if (!cleaned) return ""

    return cleaned.slice(0, this.maxContentLength)
  }

  normalize(text) {
    return this.sanitizeText(text).toLowerCase()
  }

  extractKeywords(text) {
    return this.normalize(text)
      .split(" ")
      .filter(w => w.length > 3)
      .slice(0, 10)
  }

  keywordScore(a, b) {
    const wa = this.extractKeywords(a)
    const wb = this.extractKeywords(b)

    let score = 0
    for (const w of wa) {
      if (wb.includes(w)) score++
    }

    return score
  }

  async generateEmbedding(text) {

    try {

      const sanitized = this.sanitizeText(text)
      if (!sanitized) return null

      if (this.embeddingCache.has(sanitized)) {
        return this.embeddingCache.get(sanitized)
      }

      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: sanitized
      })

      if (!response?.data?.length) return null

      const embedding = response.data[0].embedding

      if (!Array.isArray(embedding)) return null

      if (this.embeddingCache.size >= this.maxCacheSize) {
        const firstKey = this.embeddingCache.keys().next().value
        this.embeddingCache.delete(firstKey)
      }

      this.embeddingCache.set(sanitized, embedding)

      return embedding

    } catch (error) {

      logger.error("AI_KNOWLEDGE_EMBEDDING_FAILED", {
        error: error.message
      })

      return null
    }
  }

  shouldLearn(message, predictedBehavior = null, userId = null) {

    const text = this.normalize(message)

    if (!text) return false
    if (text.length < this.minLearnLength) return false
    if (text.includes("?") || text.includes("؟")) return false

    if (
      text.includes("كيف حالك") ||
      text.includes("تمام") ||
      text.includes("اوكي")
    ) return false

    if (predictedBehavior?.type === "repeat") return false

    const triggers = [
      "هو","هي","يعني","definition","is","are","سبب","شرح","طريقة"
    ]

    let result = triggers.some(t => text.includes(t))

    // 🔥 learning bias
    const bias = this.getLearningBias(userId)
    if (bias > 0) result = true
    if (bias < 0 && text.length < 25) result = false

    return result
  }

  async storeKnowledge(data) {

    try {

      if (!data?.content) return null

      const content = this.sanitizeText(data.content)
      if (!content) return null

      const existing = await knowledgeRepository.findSimilarContent(content)
      if (existing) return null

      const embedding = await this.generateEmbedding(content)
      if (!embedding) return null

      const result = await knowledgeRepository.createKnowledge({
        userId: data.userId || null,
        content,
        source: data.source || "user",
        embedding
      })

      return result

    } catch (error) {

      logger.error("AI_KNOWLEDGE_STORE_FAILED", {
        error: error.message
      })

      return null
    }
  }

  async searchKnowledge(query, userId = null) {

    try {

      const sanitizedQuery = this.sanitizeText(query)
      if (!sanitizedQuery) return []

      const embedding = await this.generateEmbedding(sanitizedQuery)
      if (!embedding) return []

      const knowledge =
        await knowledgeRepository.searchKnowledgeByEmbedding(
          embedding,
          this.maxKnowledgeResults
        )

      if (!Array.isArray(knowledge) || !knowledge.length) return []

      const queryNorm = this.normalize(query)
      const bias = this.getLearningBias(userId)

      const filtered = knowledge
        .map(k => {

          if (!k?.content) return null

          let score = 0

          if (typeof k.similarity === "number") {
            score += k.similarity * 5
          }

          const contentNorm = this.normalize(k.content)

          if (queryNorm.includes(contentNorm)) score += 3
          if (contentNorm.includes(queryNorm)) score += 2

          score += this.keywordScore(queryNorm, contentNorm) * 2

          if (contentNorm.length < 120) score += 1

          score += bias

          return {
            ...k,
            finalScore: score
          }

        })
        .filter(k => k && k.finalScore >= this.minRelevanceScore * 5)
        .sort((a, b) => b.finalScore - a.finalScore)

      return filtered

    } catch (error) {

      logger.error("AI_KNOWLEDGE_SEARCH_FAILED", {
        error: error.message
      })

      return []
    }
  }

  dedupeKnowledge(list) {

    const seen = new Set()
    const result = []

    for (const item of list) {

      const clean = this.normalize(item.content)

      if (!seen.has(clean)) {
        seen.add(clean)
        result.push(item)
      }

      if (result.length >= 3) break
    }

    return result
  }

  formatKnowledge(knowledge) {

    if (!Array.isArray(knowledge) || !knowledge.length) return ""

    const cleanList = this.dedupeKnowledge(knowledge)

    const formatted = cleanList
      .map((k) => `- ${k.content}`)
      .join("\n")

    return `
[Relevant Knowledge]
${formatted}
`.trim()
  }

  async injectKnowledge(userMessage, userId = null) {

    try {

      const knowledge = await this.searchKnowledge(userMessage, userId)
      if (!knowledge.length) return ""

      return this.formatKnowledge(knowledge)

    } catch (error) {

      logger.error("AI_KNOWLEDGE_INJECTION_FAILED", {
        error: error.message
      })

      return ""
    }
  }

  async learnFromMessage(userId, message, predictedBehavior = null) {

    try {

      const should = this.shouldLearn(message, predictedBehavior, userId)

      if (!should) {
        this.updateLearning(userId, false)
        return
      }

      const sanitized = this.sanitizeText(message)
      if (!sanitized) {
        this.updateLearning(userId, false)
        return
      }

      const stored = await this.storeKnowledge({
        userId,
        content: sanitized,
        source: "conversation"
      })

      this.updateLearning(userId, !!stored)

    } catch (error) {

      logger.error("AI_KNOWLEDGE_LEARNING_FAILED", {
        error: error.message
      })

    }
  }

}

module.exports = new AIKnowledgeSystem()