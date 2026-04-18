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

  async buildSystemPrompt(userId, message, context = {}) {
    try {
      const user = context.user || {};
      const guild = context.guild || {};
      const channel = context.channel || {};
      const messageObj = context.messageObj || null;

      // 1) تحليل المشاعر
      let emotion = null;
      try {
        emotion = await aiEmotionSystem.analyze(message, { userId });
      } catch (err) {
        logger.error("EMOTION_ANALYSIS_FAILED", { error: err.message });
      }

      // 2) تحليل القرار والسلوك
      let decision = null;
      let trustLevel = "neutral";
      let intent = "normal";
      try {
        if (aiDecisionSystem.analyzeMessage) {
          decision = aiDecisionSystem.analyzeMessage(message);
        }
        if (aiDecisionSystem.detectIntent) {
          intent = aiDecisionSystem.detectIntent(message) || "normal";
        }
        if (aiDecisionSystem.getTrustLevel) {
          const behavior = aiDecisionSystem.updateBehavior?.(userId, aiDecisionSystem.detectAggression?.(message));
          trustLevel = aiDecisionSystem.getTrustLevel(behavior?.score || 0);
        }
      } catch (err) {
        logger.error("DECISION_ANALYSIS_FAILED", { error: err.message });
      }

      // 3) الهوية
      let identityPrompt = "";
      try {
        identityPrompt = aiIdentitySystem.buildIdentityPrompt?.({
          userId,
          trustLevel,
        }) || "";
      } catch (err) {
        logger.error("IDENTITY_BUILD_FAILED", { error: err.message });
      }

      // 4) الشخصية
      let personalityPrompt = "";
      try {
        personalityPrompt = aiPersonalitySystem.getSystemPrompt?.({
          userId,
          trustLevel,
          emotion,
          action: decision?.needsResponse ? "answer" : "normal",
          messageType: emotion?.primary || "normal",
        }) || "";
      } catch (err) {
        logger.error("PERSONALITY_BUILD_FAILED", { error: err.message });
      }

      // 5) الذاكرة طويلة المدى
      let memories = [];
      try {
        const rawMemories = await aiMemorySystem.searchRelevantMemories?.(userId, message);
        if (Array.isArray(rawMemories)) {
          memories = rawMemories;
        }
      } catch (err) {
        logger.error("MEMORY_FETCH_FAILED", { error: err.message });
      }

      // 6) المعرفة
      let knowledge = [];
      try {
        const rawKnowledge = await aiKnowledgeSystem.searchKnowledge?.(message, userId);
        if (Array.isArray(rawKnowledge)) {
          knowledge = rawKnowledge;
        }
      } catch (err) {
        logger.error("KNOWLEDGE_FETCH_FAILED", { error: err.message });
      }

      // 7) العلاقات الاجتماعية
      let socialScore = 0;
      try {
        const relation = await aiSocialAwarenessSystem.getOrLoadRelationship?.(userId, context.user?.id);
        if (relation && relation.score) {
          socialScore = relation.score;
        }
      } catch (err) {
        // صامت
      }

      // 8) بناء السياق الموحد عبر aiContextSystem
      let contextBlock = "";
      try {
        contextBlock = aiContextSystem.buildContext({
          user,
          guild,
          channel,
          message,
          messageObj,
          intent,
          memories,
          knowledge,
          emotion,
          socialScore
        }) || "";
      } catch (err) {
        logger.error("CONTEXT_BUILD_FAILED", { error: err.message });
      }

      // 9) دمج كل شي في system prompt واحد
      const systemPrompt = `
${identityPrompt}

${personalityPrompt}

${contextBlock}

[معلومات الجلسة]
المستخدم: ${user.username || "مجهول"}
السيرفر: ${guild.name || "غير معروف"}
القناة: ${channel.name || "عام"}
`.trim();

      return systemPrompt;

    } catch (error) {
      logger.error("SYSTEM_PROMPT_BUILD_FAILED", { error: error.message });
      return "اسمك لين. تتكلم عربي. تتصرف كشخص حقيقي داخل سيرفر Discord. لا تقول أنك AI.";
    }
  }

  async askAI(userId, message, context = {}) {
    let requestKey;

    try {

      const cleanMessage = this.sanitize(message);
      if (!cleanMessage) return "رسالتك غير واضحة.";

      const guildId = context.guild?.id || "dm";
      const channelId = context.channel?.id || "dm";

      requestKey = `${userId}:${cleanMessage}`;

      if (this.activeRequests.has(requestKey)) {
        return "⏳ انتظر لحظة...";
      }

      this.activeRequests.set(requestKey, true);

      const systemPrompt = await this.buildSystemPrompt(userId, cleanMessage, context);

      let memory = await memoryManager.getMemory(userId, guildId, channelId) || [];
      memory = this.trimConversation(memory);

      const messages = [
        { role: "system", content: systemPrompt },
        ...memory,
        { role: "user", content: cleanMessage }
      ];

      let reply = await this.generateAIResponse(messages, null);

      this.activeRequests.delete(requestKey);

      if (!reply) {
        return "❌ حصل خطأ في الرد";
      }

      reply = this.sanitize(reply);
      reply = aiResponseFormatterSystem.formatResponse(reply);

      await memoryManager.addMessage(userId, "user", cleanMessage, guildId, channelId);
      await memoryManager.addMessage(userId, "assistant", reply, guildId, channelId);

      try {
        await aiMemorySystem.storeMemory?.({
          userId,
          type: "conversation",
          memory: cleanMessage.slice(0, 200)
        });
      } catch (err) {
        // صامت — الذاكرة اختيارية
      }

      this.updateFeedback(userId, "answer", true);

      return reply;

    } catch (error) {
      logger.error("AI_HANDLER_ERROR", { error: error.message });

      if (requestKey) {
        this.activeRequests.delete(requestKey);
      }

      return "❌ حصل خطأ في الذكاء الاصطناعي";
    }
  }

}

module.exports = new AIHandler();