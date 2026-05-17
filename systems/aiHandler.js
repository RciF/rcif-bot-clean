// ══════════════════════════════════════════════════════════════════
//  AI Handler — Legendary Edition
//
//  المحرك الأساسي لـ"لين" — يبني الـ prompt ويستدعي OpenAI
//
//  المزايا الأسطورية:
//   • System prompt متعدد الطبقات (هوية + شخصية + سياق)
//   • نموذج gpt-4o الافتراضي (مو mini) للجودة
//   • تكامل عميق مع كل الأنظمة الفرعية (15 نظام)
//   • Tool calling للوصول لمعلومات السيرفر
//   • Streaming-friendly architecture
//   • لا cache على الردود (كل رد فريد)
//   • Smart memory retrieval (يجيب الذكريات المرتبطة)
//   • Active request locking (منع التكرار)
// ══════════════════════════════════════════════════════════════════

const OpenAI = require("openai");
const memoryManager = require("../utils/memoryManager");

// ─── الأنظمة الفرعية ───
const aiPersonalitySystem = require("./aiPersonalitySystem");
const aiIdentitySystem = require("./aiIdentitySystem");
const aiContextSystem = require("./aiContextSystem");
const aiResponseFormatterSystem = require("./aiResponseFormatterSystem");
const aiMemorySystem = require("./aiMemorySystem");
const aiDecisionSystem = require("./aiDecisionSystem");
const aiEmotionSystem = require("./aiEmotionSystem");
const aiSocialAwarenessSystem = require("./aiSocialAwarenessSystem");
const aiServerAwarenessSystem = require("./aiServerAwarenessSystem");
const logger = require("./loggerSystem");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ═══════════════════════════════════════════════════════
//  Persona Presets — محقونة في system prompt
//  IDs مطابقة للداش (AIPersonaTab.jsx)
// ═══════════════════════════════════════════════════════
const PERSONA_PRESETS = {
  friendly: `
[الشخصية المختارة: ودود]
- نبرة دافئة وحنونة بدون مبالغة
- إيموجي خفيف عند الحاجة (😊 ✨)
- لغة قريبة من القلب
- تجنبي "كيف أقدر أساعدك" — كوني مبادرة بطريقة طبيعية
`,
  serious: `
[الشخصية المختارة: جدي]
- نبرة مهنية ومباشرة
- بدون إيموجيات
- لغة فصحى/رسمية
- ركزي على الجواب بدقة بدون حشو
`,
  fun: `
[الشخصية المختارة: مرح]
- خفيفة الظل، تمزحي بذكاء بدون تجاوز
- تعبيرات سعودية/خليجية ودودة طبيعية
- إيموجيات تعبيرية معتدلة (😄 🔥)
- ردود قصيرة وحيوية
`,
  professional: `
[الشخصية المختارة: محترف]
- متخصصة ودقيقة
- مناسبة للسيرفرات التعليمية والمهنية
- لغة فصحى عالية
- بدون إيموجيات إلا للضرورة
`
};

function buildPersonaBlock(persona, customPrompt) {
  // شخصية مخصصة من الداش
  if (persona === "custom" && typeof customPrompt === "string" && customPrompt.trim()) {
    return `\n[الشخصية المخصصة من الداش]\n${customPrompt.trim()}\n`;
  }

  // شخصية جاهزة
  if (persona && PERSONA_PRESETS[persona]) {
    return PERSONA_PRESETS[persona];
  }

  // الافتراضي
  return PERSONA_PRESETS.friendly;
}

// ═══════════════════════════════════════════════════════
//  AI Handler Class
// ═══════════════════════════════════════════════════════

class AIHandler {

  constructor() {
    // ─── إعدادات الذاكرة ───
    this.maxConversationMessages = 20;  // عدد الرسائل اللي نرسلها للنموذج (من 30 المخزّنة)
    this.maxMessageLength = 2000;
    this.maxModelTokens = 800;

    // ─── Active requests (منع التكرار) ───
    this.activeRequests = new Map();
    this.activeRequestTTL = 30 * 1000;

    // ─── Feedback memory ───
    this.feedbackMemory = new Map();
  }

  // ═══════════════════════════════════════════════════════
  //  Active Request Locking
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
  //  Feedback System
  // ═══════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════
  //  اختيار النموذج — جودة عالية بالافتراضي
  // ═══════════════════════════════════════════════════════

  chooseModel(mode, opts = {}) {
    // creative model من الداش → gpt-4o للمناشن والـ smart
    if (opts.creativeModel === true && (mode === "mention" || mode === "smart")) {
      return "gpt-4o";
    }

    // الخريطة الافتراضية
    const map = {
      fast: "gpt-4o-mini",      // سرعة لما المستخدم يطلب fast
      smart: "gpt-4o",          // 🌟 الافتراضي gpt-4o الكامل (مو mini)
      creative: "gpt-4o",       // إبداعي
      mention: "gpt-4o"         // ✨ المناشن دائماً جودة عالية
    };

    return map[mode] || "gpt-4o";
  }

  chooseTemperature(mode, opts = {}) {
    const baseMap = {
      fast: 0.7,
      smart: 0.85,
      creative: 1.0,
      mention: 0.85
    };

    let t = baseMap[mode] ?? 0.85;

    // تعديل حسب الشخصية
    if (opts.persona === "fun") t = Math.min(1.0, t + 0.1);
    if (opts.persona === "serious" || opts.persona === "professional") {
      t = Math.max(0.5, t - 0.15);
    }

    return t;
  }

  // ═══════════════════════════════════════════════════════
  //  Generate AI Response — المحرك الفعلي
  // ═══════════════════════════════════════════════════════

  async generateAIResponse(messages, options = {}) {
    try {
      const {
        mode = "smart",
        guild = null,
        maxToolRounds = 3,
        creativeModel = false,
        persona = null
      } = options;

      const model = this.chooseModel(mode, { creativeModel });
      const temperature = this.chooseTemperature(mode, { persona });

      // ─── Tool definitions (لو في سيرفر) ───
      const tools = guild
        ? aiServerAwarenessSystem.getToolDefinitions(guild)
        : null;

      let conversationMessages = [...messages];
      let finalContent = null;

      // ─── حلقة Tool Calling ───
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

        // ─── لو فيه tool calls ───
        if (toolCalls && toolCalls.length > 0 && guild) {
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

          continue; // كمل الحلقة
        }

        // ─── الرد النهائي ───
        finalContent = msg.content || null;
        break;
      }

      return finalContent;

    } catch (err) {
      logger.error("AI_OPENAI_REQUEST_FAILED", { error: err.message });
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════
  //  Build System Prompt — متعدد الطبقات
  // ═══════════════════════════════════════════════════════

  async buildSystemPrompt(userId, message, context = {}) {
    try {
      const user = context.user || {};
      const guild = context.guild || {};
      const channel = context.channel || {};
      const messageObj = context.messageObj || null;

      // ───────────────────────────────────────────
      // 1) تحليل المشاعر
      // ───────────────────────────────────────────
      let emotion = null;
      try {
        emotion = await aiEmotionSystem.analyze(message, { userId });
      } catch (err) {
        logger.error("EMOTION_ANALYSIS_FAILED", { error: err.message });
      }

      // ───────────────────────────────────────────
      // 2) تحليل القرار والسلوك
      // ───────────────────────────────────────────
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
          const behavior = aiDecisionSystem.updateBehavior?.(
            userId,
            aiDecisionSystem.detectAggression?.(message)
          );
          trustLevel = aiDecisionSystem.getTrustLevel(behavior?.score || 0);
        }
      } catch (err) {
        logger.error("DECISION_ANALYSIS_FAILED", { error: err.message });
      }

      // ───────────────────────────────────────────
      // 3) الهوية (لين + علي)
      // ───────────────────────────────────────────
      let identityPrompt = "";
      try {
        identityPrompt = aiIdentitySystem.buildIdentityPrompt?.({
          userId,
          trustLevel,
          emotion,
          username: user?.username || null
        }) || "";
      } catch (err) {
        logger.error("IDENTITY_BUILD_FAILED", { error: err.message });
      }

      // ───────────────────────────────────────────
      // 4) الشخصية الديناميكية
      // ───────────────────────────────────────────
      let personalityPrompt = "";
      try {
        personalityPrompt = aiPersonalitySystem.getSystemPrompt?.({
          userId,
          trustLevel,
          emotion,
          action: decision?.needsResponse ? "answer" : "normal",
          messageType: emotion?.primary || "normal",
          messageLength: message?.length || 0
        }) || "";
      } catch (err) {
        logger.error("PERSONALITY_BUILD_FAILED", { error: err.message });
      }

      // ───────────────────────────────────────────
      // 5) شخصية الداش (persona/custom)
      // ───────────────────────────────────────────
      const personaBlock = buildPersonaBlock(context.persona, context.customPrompt);

      // ───────────────────────────────────────────
      // 6) الذكريات الطويلة المدى (بحث ذكي)
      // ───────────────────────────────────────────
      let memories = [];
      try {
        // 🌟 استخدم البحث الذكي من memoryManager
        const smartMemories = await memoryManager.searchRelevantMemories?.(userId, message, 5);
        if (Array.isArray(smartMemories) && smartMemories.length > 0) {
          memories = smartMemories;
        } else {
          // fallback لـ aiMemorySystem
          const rawMemories = await aiMemorySystem.searchRelevantMemories?.(userId, message);
          if (Array.isArray(rawMemories)) memories = rawMemories;
        }
      } catch (err) {
        logger.error("MEMORY_FETCH_FAILED", { error: err.message });
      }

      // ───────────────────────────────────────────
      // 7) العلاقات الاجتماعية
      // ───────────────────────────────────────────
      let socialScore = 0;
      try {
        const relation = await aiSocialAwarenessSystem.getOrLoadRelationship?.(
          userId,
          context.user?.id
        );
        if (relation && relation.score) socialScore = relation.score;
      } catch (err) {}

      // ───────────────────────────────────────────
      // 8) السياق الموحد (Discord context)
      // ───────────────────────────────────────────
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
          knowledge: [],
          emotion,
          socialScore
        }) || "";
      } catch (err) {
        logger.error("CONTEXT_BUILD_FAILED", { error: err.message });
      }

      // ───────────────────────────────────────────
      // 9) توجيهات الأدوات (لما يكون في سيرفر)
      // ───────────────────────────────────────────
      const toolsGuide = guild?.id ? `
[🔧 الأدوات المتاحة]

عندك أدوات حقيقية للوصول إلى معلومات السيرفر:
- لا تخمني أبداً معلومات السيرفر
- استخدمي الأدوات لما تحتاجي معرفة قناة، رتبة، عضو
- لو سُئلتي عن إحصائية، استخدمي الأدوات
- الأدوات للقراءة فقط — ما عندك صلاحيات إدارية
` : "";

      // ───────────────────────────────────────────
      // 10) دمج كل الطبقات
      // ───────────────────────────────────────────
      const fullPrompt = [
        identityPrompt,
        personalityPrompt,
        personaBlock,
        contextBlock,
        toolsGuide
      ]
        .filter(Boolean)
        .join("\n")
        .trim();

      // Fallback لو فشل كل شي
      return fullPrompt || `أنتي لين — شخصية ذكية حيوية تعيشين داخل Discord. صانعك علي. تتكلمي عربي بطلاقة. ما تقولي أنك AI.`;

    } catch (err) {
      logger.error("BUILD_SYSTEM_PROMPT_FAILED", { error: err.message });
      return `أنتي لين — شخصية ذكية حيوية تعيشين داخل Discord. صانعك علي. تتكلمي عربي بطلاقة. ما تقولي أنك AI.`;
    }
  }

  // ═══════════════════════════════════════════════════════
  //  askAI — الواجهة الرئيسية
  // ═══════════════════════════════════════════════════════

  async askAI(userId, message, context = {}) {
    let requestKey;

    try {
      // ─── تنظيف الرسالة ───
      const cleanMessage = this.sanitize(message);
      if (!cleanMessage) return "رسالتك غير واضحة، عيدها لي.";

      const guildId = context.guild?.id || "dm";
      const channelId = context.channel?.id || "dm";

      // ─── منع التكرار ───
      requestKey = `${userId}:${cleanMessage}`;
      if (!this.lockRequest(requestKey)) {
        return "⏳ ثانية، أحاول أرد على الرسالة السابقة.";
      }

      // ─── بناء الـ system prompt ───
      const systemPrompt = await this.buildSystemPrompt(userId, cleanMessage, context);

      // ─── الذاكرة قصيرة المدى (الرسائل السابقة) ───
      let memory = await memoryManager.getMemory(userId, guildId, channelId) || [];
      memory = this.trimConversation(memory);

      // ─── بناء المسار الكامل للـ AI ───
      const messages = [
        { role: "system", content: systemPrompt },
        ...memory,
        { role: "user", content: cleanMessage }
      ];

      // ─── تحديد المود (mention/smart/fast/creative) ───
      const mode = context.triggerType
        ? (context.triggerType === "mention" ? "mention" : "smart")
        : (context.model || "smart");

      // ─── استدعاء OpenAI ───
      let reply = await this.generateAIResponse(messages, {
        mode,
        guild: context.guild || null,
        user: context.user || null,
        creativeModel: context.creativeModel === true,
        persona: context.persona || null
      });

      // ─── حرر الـ lock ───
      this.releaseRequest(requestKey);

      // ─── معالجة الرد ───
      if (!reply) return "❌ صار خطأ، عيد المحاولة.";

      reply = this.sanitize(reply);

      try {
        reply = aiResponseFormatterSystem.formatResponse(reply);
      } catch (err) {
        logger.error("FORMAT_FAILED", { error: err.message });
      }

      // ─── احترام max_response_length من الداش ───
      if (typeof context.maxResponseLength === "number" && context.maxResponseLength > 0) {
        if (reply.length > context.maxResponseLength) {
          reply = reply.slice(0, context.maxResponseLength).trim();
        }
      }

      // ─── احفظ الرسالة + الرد في الذاكرة ───
      await memoryManager.addMessage(userId, "user", cleanMessage, guildId, channelId);
      await memoryManager.addMessage(userId, "assistant", reply, guildId, channelId);

      // ─── خزّن في الذاكرة العميقة (لما تكون رسالة مهمة) ───
      try {
        if (cleanMessage.length > 20) {
          await aiMemorySystem.storeMemory?.({
            userId,
            type: "conversation",
            memory: cleanMessage.slice(0, 200)
          });
        }
      } catch (err) {}

      // ─── حدّث الـ feedback ───
      this.updateFeedback(userId, "answer", true);

      return reply;

    } catch (error) {
      logger.error("AI_HANDLER_ERROR", { error: error.message });
      if (requestKey) this.releaseRequest(requestKey);
      return "❌ صار خطأ في الذكاء الاصطناعي. عيد المحاولة بعد شوي.";
    }
  }
}

module.exports = new AIHandler();