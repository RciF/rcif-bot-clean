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
const aiServerAwarenessSystem = require("../systems/aiServerAwarenessSystem");

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

  // ═══════════════════════════════════════════════════════
  //  اختيار الموديل حسب النمط
  // ═══════════════════════════════════════════════════════
  chooseModel(mode) {
    const map = {
      fast: "gpt-4o-mini",
      smart: "gpt-4o-mini",
      creative: "gpt-4o",
      mention: "gpt-4o-mini"
    };
    return map[mode] || "gpt-4o-mini";
  }

  chooseTemperature(mode) {
    const map = {
      fast: 0.7,
      smart: 0.85,
      creative: 1.0,
      mention: 0.85
    };
    return map[mode] ?? 0.85;
  }

  async generateAIResponse(messages, options = {}) {
    try {
      const {
        cacheKey = null,
        mode = "smart",
        guild = null,
        maxToolRounds = 3
      } = options;

      if (cacheKey && this.responseCache.has(cacheKey)) {
        return this.responseCache.get(cacheKey);
      }

      const model = this.chooseModel(mode);
      const temperature = this.chooseTemperature(mode);

      // الأدوات متاحة فقط لما يكون عندنا guild
      const tools = guild
        ? aiServerAwarenessSystem.getToolDefinitions(guild)
        : null;

      let conversationMessages = [...messages];
      let finalContent = null;

      // ═══════════════════════════════════════════════
      //  حلقة Tool Calling — أقصى 3 جولات
      // ═══════════════════════════════════════════════
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

        // هل الموديل طلب أدوات؟
        const toolCalls = msg.tool_calls;

        if (toolCalls && toolCalls.length > 0 && guild) {
          // أضف رسالة الموديل (اللي فيها tool_calls) للمحادثة
          conversationMessages.push({
            role: "assistant",
            content: msg.content || null,
            tool_calls: toolCalls
          });

          // نفّذ كل أداة
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

          // نرجع للحلقة عشان نخلي الموديل يستخدم نتائج الأدوات
          continue;
        }

        // الموديل رد بدون أدوات → انتهينا
        finalContent = msg.content || null;
        break;
      }

      if (cacheKey && finalContent) {
        if (this.responseCache.size >= this.maxCacheSize) {
          const firstKey = this.responseCache.keys().next().value;
          this.responseCache.delete(firstKey);
        }
        this.responseCache.set(cacheKey, finalContent);
      }

      return finalContent;

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

   // 9) توجيهات الأدوات — إجبار صارم على الاستخدام
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

مثال:
المستخدم: "فين قناة عام؟"
→ تستدعي find_channel("عام")
→ ترجع: { mention: "<#111>" }
→ ردك: "قناة <#111> هنا يا صاحبي"

❌ ممنوع تقول "قناة عام موجودة" فقط — لازم <#id>
❌ ممنوع تخمّن أن قناة/رتبة موجودة بدون استدعاء الأداة
` : "";

      // 10) دمج كل شي في system prompt واحد
      const systemPrompt = `
${identityPrompt}

${personalityPrompt}

${contextBlock}

${toolsGuide}

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

    const cacheKey = this.buildCacheKey(userId, cleanMessage, "", "");

   let reply = await this.generateAIResponse(messages, {
      cacheKey,
      mode: context.model || "smart",
      guild: context.guild || null,
      user: context.user || null
    });

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