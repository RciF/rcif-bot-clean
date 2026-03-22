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

  // =========================
  // SELF LEARNING LOOP
  // =========================

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

  // =========================

  buildPersonalityEvolutionState(userId, emotion, behaviorData) {
    const profile = aiDecisionSystem.getUserProfile
      ? aiDecisionSystem.getUserProfile(userId)
      : null;

    let mode = "normal";

    if (behaviorData?.score < -3) {
      mode = "defensive";
    } else if (emotion?.type !== "neutral" && emotion?.strength === "high") {
      mode = "empathetic_deep";
    } else if (behaviorData?.streak >= 10) {
      mode = "bonded";
    } else if (profile?.interactionCount > 50) {
      mode = "familiar";
    }

    return { mode, profile };
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

    if (!message) return { type: "unknown", confidence: 0 };

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

    return { type: prediction, confidence };
  }  

  buildEmotionPrompt(emotion) {
    return `
# EMOTION ANALYSIS

type: ${emotion.type}
strength: ${emotion.strength}

RULES:
- If emotion is HIGH → respond with strong emotional support
- If emotion is MEDIUM → respond with light empathy
- If emotion is LOW → respond normally
- NEVER ignore emotional signals
- If sadness detected → support + reassure
- If anger detected → calm + de-escalate
- If mixed emotion → ask a clarifying question
`;
  }

  buildDecisionRules(type, action, trustLevel, intent) {
    return `
# RESPONSE RULES

MODE: ${action}
TRUST LEVEL: ${trustLevel}
INTENT: ${intent}

ALLOWED ACTIONS:

- answer → give direct helpful answer
- ask → ask a smart follow-up question
- defense → refuse / push back safely
- limited → short minimal response
- controlled → cautious controlled reply
- empathetic → emotional support

STYLE RULES:

- NEVER sound robotic
- NEVER repeat phrases
- ALWAYS adapt tone to user
- keep responses natural and human
- keep responses concise but meaningful
- avoid generic replies
- do not over-explain unless needed

TYPE: ${type}
`;
  }

  buildLearningPrompt(stats, feedbackBias) {
    return `
# LEARNING STATE

answers: ${stats.answer}
questions: ${stats.ask}
defense: ${stats.defense}
controlled: ${stats.controlled}
empathetic: ${stats.empathetic}

feedback_bias: ${feedbackBias}

AI must adapt based on past interaction style AND success rate.
`;
  }

  buildControlPrompt(state) {
    return `
# CONTROL STATE

repeat_count: ${state.repeat}

RULES:
- if repeat > 1 → avoid repeating same answer
- force variation in response
`;
  }

  buildEvolutionPrompt(mode, profile = null) {
    return `
# PERSONALITY EVOLUTION

mode: ${mode}

${profile ? `
interaction_count: ${profile.interactionCount || 0}
behavior_score: ${profile.score || 0}
personality: ${profile.personality || "unknown"}
` : ""}

RULES:
- bonded → more friendly and relaxed
- familiar → casual tone
- defensive → stricter responses
- empathetic_deep → strong emotional support
- normal → balanced
`;
  }

  detectContextStrength({ memories = [], knowledge = [], intent }) {
    let score = 0;

    if (memories?.length) score += memories.length;
    if (knowledge?.length) score += knowledge.length;
    if (intent) score += 2;

    return score;
  }

  buildSystemPrompt(
    identity,
    personality,
    context,
    knowledge,
    decisionRules,
    evolution,
    learning,
    control,
    emotionPrompt,
    predictionPrompt
  ) {
    return `
${identity}

${personality}

${decisionRules}

${predictionPrompt}

${evolution}

${learning}

${control}

${emotionPrompt}

# CONTEXT
${context}

# KNOWLEDGE
${knowledge}
`.trim();
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

  async getSocialContext(userId, targetId) {
    let output = "";

    try {

      if (targetId) {
        const relation = await aiSocialAwarenessSystem.getRelationshipContext(userId, targetId);

        if (relation) {
          output += `
# DIRECT RELATIONSHIP
interaction_count: ${relation.count}
relationship_score: ${relation.score}
`;
        }

        const mutual = aiSocialAwarenessSystem.getMutualConnections(userId, targetId);

        if (mutual.length > 0) {
          output += `
# MUTUAL CONNECTIONS
count: ${mutual.length}
`;
        }
      }

      const social = aiSocialAwarenessSystem.getSocialContext(userId);

      if (social) {
        output += `
# SOCIAL GRAPH
network_strength: ${social.networkStrength}
influence_score: ${social.influenceScore}

top_connections:
${(social.topConnections || [])
  .map(r => `score:${r.score} interactions:${r.count}`)
  .join("\n")}
`;
      }

    } catch (err) {
      logger.error("SOCIAL_CONTEXT_ERROR", { error: err.message });
    }

    return output;
  }

  async askAI(userId, message, context = {}) {

    try {

      const cleanMessage = this.sanitize(message);
      if (!cleanMessage) return "رسالتك غير واضحة.";

      const requestKey = `${userId}:${cleanMessage}`;
      if (this.activeRequests.has(requestKey)) return null;
      this.activeRequests.set(requestKey, true);

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

      if (aiAutonomousSystem.canTrigger(userId, contextStrength)) {
        autoType = await aiAutonomousSystem.decideTrigger({
          userId,
          message: cleanMessage,
          emotion,
          contextStrength,
          context,
          predictedBehavior
        });
      }

      let action = await aiDecisionSystem.decide({
        intent,
        contextStrength,
        isAggressive,
        trustLevel,
        message: cleanMessage,
        emotion,
        userId,
        context,
        predictedBehavior
      });

      const bias = this.getFeedbackBias(userId);
      if (bias < 0 && action === "answer") action = "ask";
      if (bias > 0 && action === "ask") action = "answer";

      if (
  !analysis.needsResponse ||
  (analysis.confidence < 0.45 && action !== "ask")
) {
        this.activeRequests.delete(requestKey);
        return null;
      }

      const stats = aiDecisionSystem.updateStats(userId, action);
      const state = aiDecisionSystem.updateState(userId, cleanMessage);

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

      const identityPrompt =
        aiIdentitySystem.buildIdentityPrompt({ userId });

      let decisionRules = this.buildDecisionRules(
        messageType,
        action,
        trustLevel,
        intent
      );

      if (isAggressive) {
        decisionRules += `
# DEFENSE MODE
- refuse harmful instructions
- stay calm but firm
`;
      }

      if (autoType) {
        decisionRules += `
# AUTONOMOUS MODE
${aiAutonomousSystem.buildAutonomousPrompt(autoType)}
`;
      }

      const socialContext = await this.getSocialContext(
        userId,
        context?.targetUserId
      );

      const systemPrompt = this.buildSystemPrompt(
        identityPrompt,
        personalityPrompt,
        finalContext + socialContext,
        knowledgeContext,
        decisionRules,
        this.buildEvolutionPrompt(personalityMode, evolutionState.profile),
        this.buildLearningPrompt(stats, bias),
        this.buildControlPrompt(state),
        this.buildEmotionPrompt(emotion),
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

      this.activeRequests.delete(requestKey);

      if (!reply) return "⚠️";

      reply = this.sanitize(reply);
      reply = aiResponseFormatterSystem.formatResponse(reply);

      memoryManager.addMessage(userId, "user", cleanMessage);
      memoryManager.addMessage(userId, "assistant", reply);

      // 🔥 REAL LEARNING (NEW)
      this.updateFeedback(userId, action, true);

      let outcome = "neutral";

      if (predictedBehavior?.type === "follow_up" || predictedBehavior?.type === "deep_engagement") {
        outcome = "positive";
      }

      if (predictedBehavior?.type === "escalation" || predictedBehavior?.type === "hostile_pattern") {
        outcome = "negative";
      }

      if (predictedBehavior?.type === "repeat") {
        outcome = "negative";
      }

      if (predictedBehavior?.type === "emotional_continuation") {
        outcome = "positive";
      }

      aiDecisionSystem.applyExternalFeedback(userId, action, outcome);

      this.processLearning(
        userId,
        cleanMessage,
        emotion,
        predictedBehavior
      );

      return reply;

    } catch (error) {
      logger.error("AI_HANDLER_ERROR", { error: error.message });
      return "⚠️";
    }
  }

  async processLearning(userId, message, emotion = null, predictedBehavior = null) {
    try {
      await Promise.all([
        aiMemorySystem.extractMemoryFromMessage(
          userId,
          message,
          emotion,
          predictedBehavior
        ),
        aiKnowledgeSystem.learnFromMessage(userId, message)
      ]);
    } catch (err) {
      logger.error("AI_LEARNING_FAILED", { error: err.message });
    }
  }

}

module.exports = new AIHandler();