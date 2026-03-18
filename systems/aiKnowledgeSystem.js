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
    this.minLearnLength = 12

    this.embeddingCache = new Map()
    this.maxCacheSize = 100

    // 🔥 NEW
    this.minRelevanceScore = 0.3

  }

  sanitizeText(text) {

    if (!text) return ""

    const cleaned = String(text)
      .replace(/\s+/g, " ")
      .trim()

    if (!cleaned) return ""

    if (cleaned.length > this.maxContentLength) {
      return cleaned.slice(0, this.maxContentLength)
    }

    return cleaned

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

  async storeKnowledge(data) {

    try {

      if (!data?.content) return null

      const content = this.sanitizeText(data.content)
      if (!content) return null

      const existing = await knowledgeRepository.findSimilarContent(content)
      if (existing) return null

      const embedding = await this.generateEmbedding(content)
      if (!embedding) {
        logger.warn("AI_KNOWLEDGE_SKIP_STORE_NO_EMBEDDING")
        return null
      }

      const knowledgeEntry = {
        userId: data.userId || null,
        content,
        source: data.source || "user",
        embedding
      }

      const stored = await knowledgeRepository.createKnowledge(knowledgeEntry)

      logger.info("AI_KNOWLEDGE_STORED", {
        source: knowledgeEntry.source
      })

      return stored

    } catch (error) {

      logger.error("AI_KNOWLEDGE_STORE_FAILED", {
        error: error.message
      })

      return null

    }

  }

  async searchKnowledge(query) {

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

      // 🔥 NEW: filter weak knowledge
      const filtered = knowledge.filter(k => {
        if (!k?.content) return false

        // إذا فيه similarity score من DB استخدمه
        if (typeof k.similarity === "number") {
          return k.similarity >= this.minRelevanceScore
        }

        return true
      })

      return filtered

    } catch (error) {

      logger.error("AI_KNOWLEDGE_SEARCH_FAILED", {
        error: error.message
      })

      return []

    }

  }

  formatKnowledge(knowledge) {

    if (!Array.isArray(knowledge) || !knowledge.length) return ""

    const trimmed = knowledge.slice(0, 3) // 🔥 تقليل الضوضاء

    const formatted = trimmed
      .map((k) => `- ${k.content}`)
      .join("\n")

    return `
[Relevant Knowledge]
${formatted}
`.trim()

  }

  async injectKnowledge(userMessage) {

    try {

      const knowledge = await this.searchKnowledge(userMessage)
      if (!knowledge.length) return ""

      return this.formatKnowledge(knowledge)

    } catch (error) {

      logger.error("AI_KNOWLEDGE_INJECTION_FAILED", {
        error: error.message
      })

      return ""

    }

  }

  async learnFromMessage(userId, message) {

    try {

      if (!message) return

      const sanitized = this.sanitizeText(message)
      if (!sanitized) return
      if (sanitized.length < this.minLearnLength) return

      const lower = sanitized.toLowerCase()

      const learningTriggers = [
        "تعريف",
        "definition",
        "meaning",
        "هو",
        "هي",
        "is",
        "are",
        "يعني"
      ]

      const shouldLearn = learningTriggers.some(trigger =>
        lower.includes(trigger)
      )

      if (!shouldLearn) return

      await this.storeKnowledge({
        userId,
        content: sanitized,
        source: "conversation"
      })

    } catch (error) {

      logger.error("AI_KNOWLEDGE_LEARNING_FAILED", {
        error: error.message
      })

    }

  }

}

module.exports = new AIKnowledgeSystem()