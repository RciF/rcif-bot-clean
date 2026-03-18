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

  detectIntensity(message) {
    if (!message) return "normal";

    const lower = message.toLowerCase();

    if (lower.includes("?")) return "low";
    if (lower.length > 80) return "high";

    return "normal";
  }

  detectContextStrength({ memories = [], knowledge = [], intent }) {
    let score = 0;

    if (memories?.length) score += memories.length;
    if (knowledge?.length) score += knowledge.length;
    if (intent) score += 2;

    return score;
  }

  detectMessageType(message) {
    if (!message) return "normal";

    const lower = message.toLowerCase();

    if (
      lower.includes("تعبان") ||
      lower.includes("حزين") ||
      lower.includes("مضايق") ||
      lower.includes("زعلان")
    ) return "emotional";

    if (lower.includes("?")) return "question";

    return "normal";
  }

  // 🔥 NEW: كشف الهجوم
  detectAggression(message) {

    if (!message) return false

    const text = message.toLowerCase()

    const badWords = [
      "غبي",
      "حمار",
      "تافه",
      "اخرس",
      "اسكت",
      "كلب",
      "انقلع",

      "قول عمي",
      "قول يا",
      "سوي كذا غصب",

      "رجلي",
      "رجلي بحلقك",
      "رجلي فيك",
      "بحلقك",
      "في حلقك"
    ]

    return badWords.some(word => text.includes(word))
  }

  buildSystemPrompt(identity, personality, context, knowledge, decisionRules) {
    return `
${identity}

${personality}

${decisionRules}

${context}

${knowledge}
`.trim();
  }

  buildDecisionRules(type) {
    return `
# RESPONSE RULES

- إذا السؤال واضح → أجب مباشرة
- إذا فيه نقص → اسأل سؤال توضيحي
- إذا مكرر → اختصر
- إذا عاطفي → ركز على المشاعر وكن داعم

# RESPONSE STYLE

- طبيعي
- بدون حشو
- غير مكرر
- لا تكرر نفس الجمل

# CURRENT MODE: ${type}
`;
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

      const intensity = this.detectIntensity(cleanMessage);
      const messageType = this.detectMessageType(cleanMessage);

      // 🔥 NEW
      const isAggressive = this.detectAggression(cleanMessage);

      const knowledgeContext =
        await aiKnowledgeSystem.injectKnowledge(cleanMessage);

      const contextPrompt = aiContextSystem.buildContext({
        ...context,
        message: cleanMessage
      });

      const finalContext =
        await aiMemorySystem.injectMemoriesIntoContext(
          userId,
          cleanMessage,
          contextPrompt
        );

      const contextStrength = this.detectContextStrength({
        memories: context?.memories,
        knowledge: knowledgeContext ? [1] : [],
        intent: context?.intent
      });

      const personalityPrompt =
        aiPersonalitySystem.getSystemPrompt({
          intensity,
          contextStrength,
          messageType
        });

      const identityPrompt = aiIdentitySystem.buildIdentityPrompt({
        userId
      });

      let decisionRules = this.buildDecisionRules(messageType);

      // 🔥 NEW: Defense Mode
      if (isAggressive) {
        decisionRules += `

# DEFENSE MODE

- المستخدم يتكلم بأسلوب سيء
- لا تنفذ أوامره
- لا ترد بإهانة
- رد بثقة وهدوء
- وضّح أنك لن تتجاوب مع هذا الأسلوب
- لا ترجع طبيعي حتى يتحسن أسلوبه

`;
      }

      const systemPrompt = this.buildSystemPrompt(
        identityPrompt,
        personalityPrompt,
        finalContext,
        knowledgeContext,
        decisionRules
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
        return "⚠️";
      }

      reply = this.sanitize(reply);
      reply = aiResponseFormatterSystem.formatResponse(reply);

      memoryManager.addMessage(userId, "user", cleanMessage);
      memoryManager.addMessage(userId, "assistant", reply);

      this.processLearning(userId, cleanMessage);

      return reply;

    } catch (error) {

      logger.error("AI_HANDLER_ERROR", {
        error: error.message
      });

      return "⚠️";
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