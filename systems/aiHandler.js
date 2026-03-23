const OpenAI = require("openai");
const memoryManager = require("../utils/memoryManager");

const aiPersonalitySystem = require("../systems/aiPersonalitySystem");
const aiIdentitySystem = require("../systems/aiIdentitySystem");
const aiContextSystem = require("../systems/aiContextSystem");
const aiResponseFormatterSystem = require("../systems/aiResponseFormatterSystem");
const aiMemorySystem = require("../systems/aiMemorySystem");
const aiKnowledgeSystem = require("../systems/aiKnowledgeSystem");
const aiDecisionSystem = require("../systems/aiDecisionSystem");
const aiEmotionSystem = require("../systems/aiEmotionSystem");
const aiAutonomousSystem = require("../systems/aiAutonomousSystem");
const aiSocialAwarenessSystem = require("../systems/aiSocialAwarenessSystem");

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

    this.activeRequests = new Map();

    this.feedbackMemory = new Map();
  }

  updateFeedback(userId, action, success = true) {
    const data = this.feedbackMemory.get(userId) || {
      success: 0,
      fail: 0,
      lastActions: []
    };

    if (success) data.success++;
    else data.fail++;

    data.lastActions.push(action);
    if (data.lastActions.length > 10) data.lastActions.shift();

    this.feedbackMemory.set(userId, data);
  }

  getFeedbackBias(userId) {
    const data = this.feedbackMemory.get(userId);
    if (!data) return 0;

    const total = data.success + data.fail;
    if (total === 0) return 0;

    const ratio = data.success / total;

    if (ratio > 0.7) return 0.1;
    if (ratio < 0.3) return -0.1;

    return 0;
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

  buildCacheKey(userId, message, context, knowledge) {
    return `${userId}:${message}:${context}:${knowledge}`.slice(0, 500);
  }

  async generateAIResponse(messages, cacheKey = null) {
    try {
      if (cacheKey && this.responseCache.has(cacheKey)) {
        return this.responseCache.get(cacheKey);
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.85,
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
      logger.error("AI_OPENAI_REQUEST_FAILED", { error: err.message });
      return null;
    }
  }

  async askAI(userId, message, context = {}) {
    let requestKey;

    try {

      const cleanMessage = this.sanitize(message);
      if (!cleanMessage) return "رسالتك غير واضحة.";

      requestKey = `${userId}:${cleanMessage}`;

      // ✅ FIX: منع التعليق
      if (this.activeRequests.has(requestKey)) {
        return "⏳ انتظر لحظة...";
      }

      this.activeRequests.set(requestKey, true);

      let memory = memoryManager.getMemory(userId) || [];
      memory = this.trimConversation(memory);

      const messages = [
        { role: "system", content: "You are a helpful AI." },
        ...memory,
        { role: "user", content: cleanMessage }
      ];

      const cacheKey = this.buildCacheKey(userId, cleanMessage, "", "");

      let reply = await this.generateAIResponse(messages, cacheKey);

      // ✅ FIX: إزالة القفل دائمًا
      this.activeRequests.delete(requestKey);

      if (!reply) {
        return "❌ حصل خطأ في الرد";
      }

      reply = this.sanitize(reply);
      reply = aiResponseFormatterSystem.formatResponse(reply);

      memoryManager.addMessage(userId, "user", cleanMessage);
      memoryManager.addMessage(userId, "assistant", reply);

      this.updateFeedback(userId, "answer", true);

      return reply;

    } catch (error) {
      logger.error("AI_HANDLER_ERROR", { error: error.message });

      if (requestKey) {
        this.activeRequests.delete(requestKey); // ✅ FIX مهم
      }

      return "❌ حصل خطأ في الذكاء الاصطناعي";
    }
  }

}

module.exports = new AIHandler();