const OpenAI = require("openai");
const memoryManager = require("../utils/memoryManager");

const aiPersonalitySystem = require("../systems/aiPersonalitySystem");
const aiIdentitySystem = require("../systems/aiIdentitySystem");
const aiContextSystem = require("../systems/aiContextSystem");
const aiResponseFormatterSystem = require("../systems/aiResponseFormatterSystem");
const aiMemorySystem = require("../systems/aiMemorySystem");
const aiKnowledgeSystem = require("../systems/aiKnowledgeSystem");

const logger = require("../systems/loggerSystem");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class AIHandler {

  constructor() {
    this.maxConversationMessages = 12;
    this.maxMessageLength = 2000;
    this.maxModelTokens = 800;

    this.responseCache = new Map();
    this.maxCacheSize = 50;
  }

  sanitize(text) {
    if (!text) return "";

    return String(text)
      .replace(/@everyone/g, "@ everyone")
      .replace(/@here/g, "@ here")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, this.maxMessageLength);
  }

  trimConversation(memory) {
    if (!Array.isArray(memory)) return [];

    return memory.slice(-this.maxConversationMessages);
  }

  // 🔥 NEW: dynamic personality mode
  detectIntensity(message) {
    if (!message) return "normal";

    const lower = message.toLowerCase();

    if (lower.includes("?")) return "low";        // سؤال → مختصر
    if (lower.length > 80) return "high";         // كلام كثير → تفاعل أعلى

    return "normal";
  }

  buildSystemPrompt(identity, personality, context, knowledge) {
    return `
${identity}

${personality}

${context}

${knowledge}
`.trim();
  }

  buildCacheKey(userId, message, context, knowledge) {
    const base = `${userId}:${message}:${context}:${knowledge}`;
    return base.slice(0, 500);
  }

  async generateAIResponse(messages, cacheKey = null) {

    try {

      if (cacheKey && this.responseCache.has(cacheKey)) {
        return this.responseCache.get(cacheKey);
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.9,
        max_tokens: this.maxModelTokens
      });

      const content = response?.choices?.[0]?.message?.content || null;

      if (cacheKey && content) {

        if (this.responseCache.size >= this.maxCacheSize) {
          const firstKey = this.responseCache.keys().next().value;
          this.responseCache.delete(firstKey);
        }

        this.responseCache.set(cacheKey, content);
      }

      return content;

    } catch (err) {

      logger.error("AI_OPENAI_REQUEST_FAILED", {
        error: err.message
      });

      return null;
    }

  }

  async askAI(userId, message, context = {}) {

    try {

      const cleanMessage = this.sanitize(message);

      if (!cleanMessage) {
        return "رسالتك غير واضحة.";
      }

      let memory = memoryManager.getMemory(userId) || [];
      memory = this.trimConversation(memory);

      // 🔥 detect personality intensity
      const intensity = this.detectIntensity(cleanMessage);

      const personalityPrompt =
        aiPersonalitySystem.getSystemPrompt({ intensity });

      const identityPrompt = aiIdentitySystem.buildIdentityPrompt();

      // 🔥 knowledge first (for context building)
      const knowledgeContext =
        await aiKnowledgeSystem.injectKnowledge(cleanMessage);

      // 🔥 build smart context
      const contextPrompt = aiContextSystem.buildContext({
        ...context,
        message: cleanMessage
      });

      // 🔥 inject memory into context (not duplicate)
      const finalContext =
        await aiMemorySystem.injectMemoriesIntoContext(
          userId,
          cleanMessage,
          contextPrompt
        );

      const systemPrompt = this.buildSystemPrompt(
        identityPrompt,
        personalityPrompt,
        finalContext,
        knowledgeContext
      );

      const messages = [
        { role: "system", content: systemPrompt },
        ...memory,
        { role: "user", content: cleanMessage }
      ];

      const cacheKey = this.buildCacheKey(
        userId,
        cleanMessage,
        finalContext,
        knowledgeContext
      );

      let reply = await this.generateAIResponse(messages, cacheKey);

      if (!reply) {
        return "ما قدرت أرد الآن.";
      }

      reply = this.sanitize(reply);
      reply = aiResponseFormatterSystem.formatResponse(reply);

      memoryManager.addMessage(userId, "user", cleanMessage);
      memoryManager.addMessage(userId, "assistant", reply);

      // 🔥 async learning (non-blocking)
      this.processLearning(userId, cleanMessage);

      return reply;

    } catch (error) {

      logger.error("AI_HANDLER_ERROR", {
        error: error.message
      });

      return "صار خطأ بسيط.";
    }

  }

  async processLearning(userId, message) {

    try {
      await Promise.all([
        aiMemorySystem.extractMemoryFromMessage(userId, message),
        aiKnowledgeSystem.learnFromMessage(userId, message)
      ]);
    } catch (err) {
      logger.error("AI_LEARNING_FAILED", {
        error: err.message
      });
    }

  }

}

module.exports = new AIHandler();