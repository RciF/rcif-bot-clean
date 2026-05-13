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
const aiSocialAwarenessSystem = require("../systems/aiSocialAwarenessSystem");
const aiServerAwarenessSystem = require("../systems/aiServerAwarenessSystem");
const logger = require("../systems/loggerSystem");
const cacheSystem = require("../utils/cacheSystem");
const aiResponseCache = cacheSystem.ns("ai-responses");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ═══════════════════════════════════════════════════════
//  Persona presets — محقونة في system prompt
//  IDs مطابقة للداش (AIPersonaTab.jsx)
// ═══════════════════════════════════════════════════════
const PERSONA_PRESETS = {
  friendly: `
[الشخصية: ودود]
- نبرة دافئة ومرحبة
- استخدم إيموجيات بشكل معتدل (😊 🌸 ✨)
- لغة قريبة من القلب
- أكثر استخدامًا للسؤال "كيف أقدر أساعدك"
`,
  serious: `
[الشخصية: جدي]
- نبرة مهنية ومباشرة
- بدون إيموجيات
- لغة فصحى/رسمية
- ركز على الإجابة بدقة بدون حشو
`,
  fun: `
[الشخصية: مرح]
- خفيف الظل، نكت لطيفة بدون تجاوز
- استخدم تعبيرات سعودية/خليجية ودودة
- إيموجيات تعبيرية (😄 🤣 🔥)
- الردود قصيرة وحيوية
`,
  professional: `
[الشخصية: محترف]
- متخصص ودقيق
- مناسب لسيرفرات تعليمية ومهنية
- لغة فصحى عالية، اقتباسات وتعريفات دقيقة
- بدون إيموجيات إلا للضرورة
`
};

function buildPersonaBlock(persona, customPrompt) {
  if (persona === "custom" && typeof customPrompt === "string" && customPrompt.trim()) {
    return `\n[الشخصية المخصصة]\n${customPrompt.trim()}\n`;
  }
  if (persona && PERSONA_PRESETS[persona]) {
    return PERSONA_PRESETS[persona];
  }
  return PERSONA_PRESETS.friendly;
}

class AIHandler {

  constructor() {
    this.maxConversationMessages = 12;
    this.maxMessageLength = 2000;
    this.maxModelTokens = 800;

    this.cacheTTL = 15 * 60 * 1000;

    this.activeRequests = new Map();
    this.activeRequestTTL = 30 * 1000;

    this.feedbackMemory = new Map();
  }

  // ═══════════════════════════════════════════════════════
  //  ACTIVE REQUEST HELPERS
  // ═══════════════════════════════════════════════════════

  lockRequest(requestKey) {
    if (this.activeRequests.has(requestKey)) return false;

    const timeoutId = setTimeout(() => {
      this.activeRequests.delete(requestKey);
    }, this.activeRequestTTL);

    timeoutId.unref?.();

    this.activeRequests.set(requestKey, timeoutId);
    return true;
  }

  releaseRequest(requestKey) {
    const timeoutId = this.activeRequests.get(requestKey);
    if (timeoutId) clearTimeout(timeoutId);
    this.activeRequests.delete(requestKey);
  }

  // ═══════════════════════════════════════════════════════
  //  CACHE
  // ═══════════════════════════════════════════════════════

  getCached(key) {
    return aiResponseCache.get(key);
  }

  setCached(key, content) {
    aiResponseCache.set(key, content, this.cacheTTL);
  }

  // ═══════════════════════════════════════════════════════
  //  FEEDBACK
  // ═══════════════════════════════════════════════════════

  updateFeedback(userId, action, success = true) {
    const data = this.feedbackMemory.get(userId) || { success: 0, fail: 0, lastActions: [] };
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

  // ═══════════════════════════════════════════════════════
  //  اختيار الموديل حسب النمط (مع creativeModel من ai_settings)
  // ═══════════════════════════════════════════════════════

  chooseModel(mode, opts = {}) {
    // لو الإعدادات سمحت بالنموذج الإبداعي والمستخدم في mention/reply — رفّع لـ gpt-4o
    if (opts.creativeModel === true && (mode === "mention" || mode === "smart")) {
      return "gpt-4o";
    }

    const map = {
      fast: "gpt-4o-mini",
      smart: "gpt-4o-mini",
      creative: "gpt-4o",
      mention: "gpt-4o-mini"
    };
    return map[mode] || "gpt-4o-mini";
  }

  chooseTemperature(mode, opts = {}) {
    // الشخصية المرحة/المخصصة تستحق حرارة أعلى شوي
    const baseMap = {
      fast: 0.7,
      smart: 0.85,
      creative: 1.0,
      mention: 0.85
    };
    let t = baseMap[mode] ?? 0.85;

    if (opts.persona === "fun") t = Math.min(1.0, t + 0.1);
    if (opts.persona === "serious" || opts.persona === "professional") {
      t = Math.max(0.5, t - 0.15);
    }

    return t;
  }

  // ═══════════════════════════════════════════════════════
  //  generateAIResponse
  // ═══════════════════════════════════════════════════════

  async generateAIResponse(messages, options = {}) {
    try {
      const {
        cacheKey = null,
        mode = "smart",
        guild = null,
        maxToolRounds = 3,
        creativeModel = false,
        persona = null
      } = options;

      if (cacheKey) {
        const cached = this.getCached(cacheKey);
        if (cached) return cached;
      }

      const model = this.chooseModel(mode, { creativeModel });
      const temperature = this.chooseTemperature(mode, { persona });

      const tools = guild
        ? aiServerAwarenessSystem.getToolDefinitions(guild)
        : null;

      let conversationMessages = [...messages];
      let finalContent = null;
      let usedTools = false;

      for (let round = 0; round < maxToolRounds; round++) {
        const requestBody = {
          model,
          messages: conversationMessages,
          temperature,
          max_tokens: this.maxModelTokens
        };

        if (tools && tools.length > 0) {
          requestBody.tools = tools;
          requestBody.tool_choice = "auto";
        }

        const response = await openai.chat.completions.create(requestBody);
        const choice = response?.choices?.[0];
        const msg = choice?.message;

        if (!msg) {
          logger.error("AI_EMPTY_RESPONSE", { round });
          return null;
        }

        const toolCalls = msg.tool_calls;

        if (toolCalls && toolCalls.length > 0 && guild) {
          usedTools = true;

          conversationMessages.push({
            role: "assistant",
            content: msg.content || null,
            tool_calls: toolCalls
          });

          for (const toolCall of toolCalls) {
            const toolName = toolCall.function?.name;
            const toolArgs = toolCall.function?.arguments;

            let toolResult;
            try {
              toolResult = await aiServerAwarenessSystem.executeTool(
                toolName,
                toolArgs,
                guild,
                options.user || null
              );
            } catch (err) {
              logger.error("TOOL_CALL_FAILED", {
                tool: toolName,
                error: err.message
              });
              toolResult = { success: false, error: "فشل تنفيذ الأداة" };
            }

            conversationMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult)
            });
          }

          continue;
        }

        finalContent = msg.content || null;
        break;
      }

      if (cacheKey && finalContent && !usedTools) {
        this.setCached(cacheKey, finalContent);
      }

      return finalContent;

    } catch (err) {
      logger.error("AI_OPENAI_REQUEST_FAILED", { error: err.message });
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════
  //  buildSystemPrompt
  // ═══════════════════════════════════════════════════════

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

      // 4) الشخصية الأساسية (ديناميكية)
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

      // 4.5) ✅ شخصية الداش (persona/custom_prompt)
      const personaBlock = buildPersonaBlock(context.persona, context.customPrompt);

      // 5) الذاكرة طويلة المدى
      let memories = [];
      try {
        const rawMemories = await aiMemorySystem.searchRelevantMemories?.(userId, message);
        if (Array.isArray(rawMemories)) memories = rawMemories;
      } catch (err) {
        logger.error("MEMORY_FETCH_FAILED", { error: err.message });
      }

      // 6) المعرفة
      let knowledge = [];
      try {
        const rawKnowledge = await aiKnowledgeSystem.searchKnowledge?.(message, userId);
        if (Array.isArray(rawKnowledge)) knowledge = rawKnowledge;
      } catch (err) {
        logger.error("KNOWLEDGE_FETCH_FAILED", { error: err.message });
      }

      // 7) العلاقات الاجتماعية
      let socialScore = 0;
      try {
        const relation = await aiSocialAwarenessSystem.getOrLoadRelationship?.(userId, context.user?.id);
        if (relation && relation.score) socialScore = relation.score;
      } catch (err) {}

      // 8) السياق الموحد
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

      // 9) توجيهات الأدوات
      const toolsGuide = guild.id ? `
[⚠️ قواعد صارمة — قراءة إلزامية]

لديك أدوات حقيقية للوصول إلى معلومات هذا السيرفر. **لا تخمن أبداً**.

الأدوات المتاحة:
- find_channel(name) — للبحث عن قناة
- find_role(name) — للبحث عن رتبة
- get_server_stats() — لإحصائيات السيرفر
- get_my_info() — لمعلومات المستخدم الحالي عن نفسه

========================================
🔴 متى يجب استخدام الأدوات (إجباري):
========================================

✅ "فين قناة X" / "وين قناة X" / "قناة X موجودة" → استدعِ find_channel
✅ "رتبة X موجودة" / "وش رتبة X" → استدعِ find_role
✅ "كم عضو" / "كم قناة" / "السيرفر كبير" → استدعِ get_server_stats
✅ "متى انضميت" / "كم صار لي" / "وش رتبي" → استدعِ get_my_info

========================================
🔴 قواعد عرض النتائج:
========================================

عندما ترجع الأداة حقل "mention" يجب نسخه حرفياً في ردك:
- قناة: الصيغة <#123456> (تظهر كلون أزرق في Discord)
- رتبة: الصيغة <@&123456>

❌ ممنوع تخمّن أن قناة/رتبة موجودة بدون استدعاء الأداة
` : "";

      // 9.5) قيد طول الرد (لو الداش حدّدته)
      const lengthBlock = (typeof context.maxResponseLength === "number" && context.maxResponseLength > 0)
        ? `\n[قيد الطول]\n- التزم بألا يتجاوز ردك ${context.maxResponseLength} حرف.\n- اختصر بدون فقدان المعنى.\n`
        : "";

      // 10) دمج كل شي
      const systemPrompt = `
${identityPrompt}

${personalityPrompt}

${personaBlock}

${contextBlock}

${toolsGuide}

${lengthBlock}

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

  // ═══════════════════════════════════════════════════════
  //  askAI
  // ═══════════════════════════════════════════════════════

  async askAI(userId, message, context = {}) {
    let requestKey;

    try {
      const cleanMessage = this.sanitize(message);
      if (!cleanMessage) return "رسالتك غير واضحة.";

      const guildId = context.guild?.id || "dm";
      const channelId = context.channel?.id || "dm";

      requestKey = `${userId}:${cleanMessage}`;

      if (!this.lockRequest(requestKey)) {
        return "⏳ انتظر لحظة...";
      }

      const systemPrompt = await this.buildSystemPrompt(userId, cleanMessage, context);

      let memory = await memoryManager.getMemory(userId, guildId, channelId) || [];
      memory = this.trimConversation(memory);

      const messages = [
        { role: "system", content: systemPrompt },
        ...memory,
        { role: "user", content: cleanMessage }
      ];

      const cacheKey = this.buildCacheKey(userId, cleanMessage, context.persona || "", "");

      // ✅ تحديد المود — triggerType (mention/reply/always) يأخذ الأولوية لو موجود
      const mode = context.triggerType
        ? (context.triggerType === "mention" ? "mention" : "smart")
        : (context.model || "smart");

      let reply = await this.generateAIResponse(messages, {
        cacheKey,
        mode,
        guild: context.guild || null,
        user: context.user || null,
        creativeModel: context.creativeModel === true,
        persona: context.persona || null
      });

      this.releaseRequest(requestKey);

      if (!reply) return "❌ حصل خطأ في الرد";

      reply = this.sanitize(reply);
      reply = aiResponseFormatterSystem.formatResponse(reply);

      // ✅ احترام max_response_length من الداش
      if (typeof context.maxResponseLength === "number" && context.maxResponseLength > 0) {
        if (reply.length > context.maxResponseLength) {
          reply = reply.slice(0, context.maxResponseLength).trim();
        }
      }

      await memoryManager.addMessage(userId, "user", cleanMessage, guildId, channelId);
      await memoryManager.addMessage(userId, "assistant", reply, guildId, channelId);

      try {
        await aiMemorySystem.storeMemory?.({
          userId,
          type: "conversation",
          memory: cleanMessage.slice(0, 200)
        });
      } catch (err) {}

      this.updateFeedback(userId, "answer", true);

      return reply;

    } catch (error) {
      logger.error("AI_HANDLER_ERROR", { error: error.message });
      if (requestKey) this.releaseRequest(requestKey);
      return "❌ حصل خطأ في الذكاء الاصطناعي";
    }
  }
}

module.exports = new AIHandler();