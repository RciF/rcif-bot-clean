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

  detectEmotion() {
    return { type: "neutral", strength: "low", score: 0 };
  }

  predictUserBehavior(message, context = {}, memory = [], emotion = null, behaviorData = null) {
    const lower = (message || "").toLowerCase();

    let prediction = "neutral";
    let confidence = 0.5;

    if (!message) {
      return { type: "unknown", confidence: 0 };
    }

    if (
      lower.includes("غبي") ||
      lower.includes("سيء") ||
      lower.includes("hate") ||
      lower.includes("stupid")
    ) {
      prediction = "escalation";
      confidence = 0.8;
    }

    else if (lower.includes("?")) {
      prediction = "follow_up";
      confidence = 0.7;
    }

    else if (emotion && emotion.type !== "neutral") {
      prediction = "emotional_continuation";
      confidence = emotion.strength === "high" ? 0.85 : 0.6;
    }

    else if (memory.length >= 3) {
      const last = memory[memory.length - 1]?.content || "";
      if (last === message) {
        prediction = "repeat";
        confidence = 0.75;
      }
    }

    else if (message.length > 120) {
      prediction = "deep_engagement";
      confidence = 0.65;
    }

    if (behaviorData?.score < -5) {
      prediction = "hostile_pattern";
      confidence = 0.9;
    }

    return {
      type: prediction,
      confidence
    };
  }

  buildPersonalityEvolutionState(userId, emotion, behaviorData) {
    const profile = aiDecisionSystem.getUserProfile
      ? aiDecisionSystem.getUserProfile(userId)
      : null;

    let mode = "normal";

    if (behaviorData?.score < -3) {
      mode = "defensive";
    } else if (emotion.type !== "neutral" && emotion.strength === "high") {
      mode = "empathetic_deep";
    } else if (behaviorData?.streak >= 10) {
      mode = "bonded";
    } else if (profile?.interactionCount > 50) {
      mode = "familiar";
    }

    return { mode, profile };
  }

  buildEmotionPrompt(emotion) {
    return `
# EMOTION ANALYSIS
type: ${emotion.type}
strength: ${emotion.strength}

RULES:
- high → دعم عاطفي واضح
- medium → تعاطف خفيف
- low → طبيعي
`;
  }

  detectContextStrength({ memories = [], knowledge = [], intent }) {
    let score = 0;

    if (memories?.length) score += memories.length;
    if (knowledge?.length) score += knowledge.length;
    if (intent) score += 2;

    return score;
  }

  buildSystemPrompt(identity, personality, context, knowledge, decisionRules, evolution, learning, control, emotionPrompt, predictionPrompt) {
    return `
${identity}

${personality}

${decisionRules}

${predictionPrompt}

${evolution}

${learning}

${control}

${emotionPrompt}

${context}

${knowledge}
`.trim();
  }

  buildDecisionRules(type, action, trustLevel, intent) {
    return `
# RESPONSE RULES

MODE: ${action}
TRUST: ${trustLevel}
INTENT: ${intent}

- answer → مباشر
- ask → سؤال
- defense → رفض
- limited → مختصر
- controlled → بحذر
- empathetic → دعم

# STYLE
- ذكي
- مختصر
- غير مكرر

# TYPE: ${type}
`;
  }

  buildEvolutionPrompt(mode, profile = null) {
    return `
# PERSONALITY EVOLUTION
mode: ${mode}

${profile ? `
interaction_count: ${profile.interactionCount || 0}
behavior_score: ${profile.score || 0}
` : ""}
`;
  }

  buildLearningPrompt(stats) {
    return `
# LEARNING
A:${stats.answer} Q:${stats.ask} D:${stats.defense}
`;
  }

  buildControlPrompt(state) {
    return `
# CONTROL
repeat:${state.repeat}
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
        temperature: 0.8,
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

  getSocialContext(userId, targetId) {
    let output = "";

    if (targetId) {
      const relation = aiSocialAwarenessSystem.getRelationshipContext(userId, targetId);

      if (relation) {
        output += `
# SOCIAL CONTEXT
interaction_count: ${relation.count}
relationship_score: ${relation.score}
`;
      }
    }

    const top = aiSocialAwarenessSystem.getTopRelationships(userId, 3);

    if (top.length > 0) {
      output += `
# TOP RELATIONSHIPS
${top.map(r => `score:${r.score} interactions:${r.count}`).join("\n")}
`;
    }

    return output;
  }

  async askAI(userId, message, context = {}) {

    try {

      const cleanMessage = this.sanitize(message);
      if (!cleanMessage) return "رسالتك غير واضحة.";

      await aiSocialAwarenessSystem.trackInteraction(
        context?.message || {
          author: { id: userId },
          content: cleanMessage,
          mentions: { users: new Map() },
          reference: null
        }
      );

      let memory = memoryManager.getMemory(userId) || [];
      memory = this.trimConversation(memory);

      const intensity = this.detectIntensity(cleanMessage);
      const messageType = this.detectMessageType(cleanMessage);

      let emotion;
      try {
        emotion = await aiEmotionSystem.analyze(cleanMessage, context);
      } catch {
        emotion = this.detectEmotion(cleanMessage);
      }

      if (emotion.primary) {
        emotion = {
          ...emotion,
          type: emotion.primary,
          strength:
            emotion.intensity > 0.7
              ? "high"
              : emotion.intensity > 0.4
              ? "medium"
              : "low"
        };
      }

      const intent = aiDecisionSystem.detectIntent(cleanMessage);
      const isAggressive = aiDecisionSystem.detectAggression(cleanMessage);

      const behaviorData = aiDecisionSystem.updateBehavior(userId, isAggressive);
      const trustLevel = aiDecisionSystem.getTrustLevel(behaviorData.score);

      const isRepeated = aiDecisionSystem.detectRepetition(userId, cleanMessage);

      const analysis = aiDecisionSystem.analyzeMessage(cleanMessage);

      const predictedBehavior = this.predictUserBehavior(
        cleanMessage,
        context,
        memory,
        emotion,
        behaviorData
      );

      const predictionPrompt = `
# USER PREDICTION
type: ${predictedBehavior.type}
confidence: ${predictedBehavior.confidence}
`;

      const knowledgeContext =
        await aiKnowledgeSystem.injectKnowledge(cleanMessage);

      const contextPrompt = aiContextSystem.buildContext({
        ...context,
        message: cleanMessage,
        emotion,
        predictedBehavior
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
        intent
      });

      let autoType = null;

      if (aiAutonomousSystem.canTrigger(userId)) {
        autoType = aiAutonomousSystem.decideTrigger({
          userId,
          message: cleanMessage,
          emotion,
          contextStrength,
          context,
          predictedBehavior
        });
      }

      const action = aiDecisionSystem.decide({
        intent,
        contextStrength,
        isAggressive,
        trustLevel,
        isRepeated,
        message: cleanMessage,
        emotion,
        userId,
        context,
        predictedBehavior
      });

      if (
        !analysis.needsResponse ||
        (analysis.confidence < 0.45 && action !== "ask") ||
        (isRepeated && analysis.confidence < 0.65)
      ) {
        return null;
      }

      const stats = aiDecisionSystem.updateStats(userId, action);
      const state = aiDecisionSystem.updateState(userId, cleanMessage, action);

      const evolutionState = this.buildPersonalityEvolutionState(
        userId,
        emotion,
        behaviorData
      );

      const personalityMode =
        trustLevel === "low"
          ? "strict"
          : evolutionState.mode === "empathetic_deep"
          ? "empathetic"
          : evolutionState.mode === "bonded"
          ? "friendly"
          : evolutionState.mode === "familiar"
          ? "casual"
          : "normal";

      const personalityPrompt =
        aiPersonalitySystem.getSystemPrompt({
          userId,
          intensity,
          contextStrength,
          messageType,
          action,
          trustLevel,
          personalityMode,
          emotion,
          streak: behaviorData.streak,
          predictedBehavior
        });

      const identityPrompt = aiIdentitySystem.buildIdentityPrompt({
        userId
      });

      const evolutionPrompt = this.buildEvolutionPrompt(
        personalityMode,
        evolutionState.profile
      );

      const learningPrompt = this.buildLearningPrompt(stats);
      const controlPrompt = this.buildControlPrompt(state);
      const emotionPrompt = this.buildEmotionPrompt(emotion);

      let decisionRules = this.buildDecisionRules(
        messageType,
        action,
        trustLevel,
        intent
      );

      if (isAggressive) {
        decisionRules += `
# DEFENSE
no compliance
`;
      }

      if (autoType) {
        decisionRules += `
# AUTONOMOUS MODE
${aiAutonomousSystem.buildAutonomousPrompt(autoType)}
`;
      }

      const socialContext = this.getSocialContext(userId, context?.targetUserId);

      const systemPrompt = this.buildSystemPrompt(
        identityPrompt,
        personalityPrompt,
        finalContext + socialContext,
        knowledgeContext,
        decisionRules,
        evolutionPrompt,
        learningPrompt,
        controlPrompt,
        emotionPrompt,
        predictionPrompt
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
      if (!reply) return "⚠️";

      reply = this.sanitize(reply);
      reply = aiResponseFormatterSystem.formatResponse(reply);

      memoryManager.addMessage(userId, "user", cleanMessage);
      memoryManager.addMessage(userId, "assistant", reply);

      this.processLearning(userId, cleanMessage, emotion, predictedBehavior); // ✅ UPDATED

      return reply;

    } catch (error) {
      logger.error("AI_HANDLER_ERROR", { error: error.message });
      return "⚠️";
    }
  }

  async processLearning(userId, message, emotion = null, predictedBehavior = null) {
    try {
      await Promise.all([
        aiMemorySystem.extractMemoryFromMessage(userId, message, emotion),
        aiKnowledgeSystem.learnFromMessage(userId, message)
      ]);
    } catch (err) {
      logger.error("AI_LEARNING_FAILED", { error: err.message });
    }
  }

}

module.exports = new AIHandler();