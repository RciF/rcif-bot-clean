const aiSocialAwarenessSystem = require("./aiSocialAwarenessSystem");

class AIDecisionSystem {

  constructor() {
    this.userBehavior = new Map();
    this.userState = new Map();
    this.userStats = new Map();
    this.userProfiles = new Map();

    this.MAX_CONFIDENCE = 1.5;
    this.MIN_CONFIDENCE = 0;

    this.lastDecisions = new Map();

    // 🔥 PHASE 3 LEARNING MEMORY
    this.learningMemory = new Map();
    this.globalLearning = {
      answer: { positive: 0, negative: 0, neutral: 0 },
      ask: { positive: 0, negative: 0, neutral: 0 },
      defense: { positive: 0, negative: 0, neutral: 0 },
      limited: { positive: 0, negative: 0, neutral: 0 },
      controlled: { positive: 0, negative: 0, neutral: 0 },
      empathetic: { positive: 0, negative: 0, neutral: 0 }
    };

    // 🔥 DECISION TRACKING
    this.pendingFeedback = new Map();
    this.feedbackTimeout = 1000 * 60 * 2;

    // 🔥 LEARNING DECAY SYSTEM (NEW)
    this.learningDecayRate = 0.98;

    // 🔥 CONFIDENCE MEMORY (NEW)
    this.decisionConfidenceMemory = new Map();

    // 🔥 ADAPTIVE WEIGHTS (NEW)
    this.dynamicWeights = {
      answer: 0.15,
      ask: 0.1,
      empathetic: 0.12,
      defense: -0.2,
      limited: -0.1
    };
  }

  clampConfidence(value) {
    if (value > this.MAX_CONFIDENCE) return this.MAX_CONFIDENCE;
    if (value < this.MIN_CONFIDENCE) return this.MIN_CONFIDENCE;
    return value;
  }

  // =========================
  // 🔥 FEEDBACK SYSTEM
  // =========================

  registerDecision(userId, decision, confidence = 0.5) {
    this.pendingFeedback.set(userId, {
      decision,
      confidence,
      timestamp: Date.now()
    });

    this.decisionConfidenceMemory.set(userId, confidence);
  }

  autoEvaluateFeedback(userId, userMessage) {
    const pending = this.pendingFeedback.get(userId);
    if (!pending) return;

    const now = Date.now();
    if (now - pending.timestamp > this.feedbackTimeout) {
      this.pendingFeedback.delete(userId);
      return;
    }

    let outcome = "neutral";
    const text = (userMessage || "").toLowerCase();

    if (["شكرا","تمام","حلو","صح","اوكي"].some(w => text.includes(w))) {
      outcome = "positive";
    } else if (["لا","غلط","مو كذا","سيء"].some(w => text.includes(w))) {
      outcome = "negative";
    }

    this.updateLearning(userId, pending.decision, outcome, pending.confidence);
    this.pendingFeedback.delete(userId);
  }

  // =========================
  // 🔥 LEARNING CORE (UPGRADED)
  // =========================

  updateLearning(userId, decision, outcome = "neutral", confidence = 0.5) {
    const data = this.learningMemory.get(userId) || {
      answer: { positive: 0, negative: 0, neutral: 0 },
      ask: { positive: 0, negative: 0, neutral: 0 },
      defense: { positive: 0, negative: 0, neutral: 0 },
      limited: { positive: 0, negative: 0, neutral: 0 },
      controlled: { positive: 0, negative: 0, neutral: 0 },
      empathetic: { positive: 0, negative: 0, neutral: 0 }
    };

    if (data[decision]) {
      const weight = Math.max(0.5, confidence);
      data[decision][outcome] += weight;
      this.globalLearning[decision][outcome] += weight;
    }

    this.learningMemory.set(userId, data);
    this.applyLearningDecay(userId);
    this.adjustDynamicWeights(userId);
  }

  // 🔥 DECAY (IMPORTANT FOR REAL LEARNING)
  applyLearningDecay(userId) {
    const data = this.learningMemory.get(userId);
    if (!data) return;

    for (const type in data) {
      for (const key in data[type]) {
        data[type][key] *= this.learningDecayRate;
      }
    }
  }

  // 🔥 DYNAMIC WEIGHT ADAPTATION
  adjustDynamicWeights(userId) {
    const data = this.learningMemory.get(userId);
    if (!data) return;

    for (const type of Object.keys(data)) {
      const stats = data[type];
      const total = stats.positive + stats.negative + stats.neutral;
      if (total < 5) continue;

      const score = (stats.positive - stats.negative) / total;

      if (this.dynamicWeights[type] !== undefined) {
        this.dynamicWeights[type] += score * 0.02;
        this.dynamicWeights[type] = Math.max(-0.3, Math.min(0.3, this.dynamicWeights[type]));
      }
    }
  }

  getLearningBias(userId) {
    const data = this.learningMemory.get(userId);
    if (!data) return 0;

    let totalBias = 0;

    for (const type of Object.keys(data)) {
      const stats = data[type];
      const total = stats.positive + stats.negative + stats.neutral;

      if (total === 0) continue;

      const score = (stats.positive - stats.negative) / total;
      const weight = this.dynamicWeights[type] || 0;

      totalBias += score * weight;
    }

    return Math.max(-0.3, Math.min(0.3, totalBias));
  }

  applyExternalFeedback(userId, decision, outcome) {
    this.updateLearning(userId, decision, outcome);
  }

  // =========================
  // (باقي الملف بدون حذف أو تغيير)
  // =========================

  detectIntent(message) {
    if (!message) return "unknown";

    const text = message.toLowerCase();

    if (text.includes("?")) return "question";
    if (["ساعد","كيف","ابي","ابغى"].some(w => text.includes(w))) return "help";
    if (["احس","طفشان","زعلان"].some(w => text.includes(w))) return "emotional";
    if (["سوي","نفذ","افعل"].some(w => text.includes(w))) return "command";

    return "normal";
  }

  detectAggression(message) {
    if (!message) return false;

    const text = message.toLowerCase();

    const badWords = [
      "غبي","حمار","تافه","اخرس","اسكت","كلب","انقلع",
      "قول عمي","قول يا","سوي كذا غصب",
      "رجلي","رجلي بحلقك","رجلي فيك","بحلقك","في حلقك"
    ];

    return badWords.some(word => text.includes(word));
  }

  updateBehavior(userId, isAggressive) {
    const data = this.userBehavior.get(userId) || {
      score: 0,
      streak: 0
    };

    if (isAggressive) {
      data.score -= 2;
      data.streak = 0;
    } else {
      data.score += 1;
      data.streak += 1;
    }

    data.score = Math.max(-10, Math.min(10, data.score));

    this.userBehavior.set(userId, data);
    this.updateUserProfile(userId, data);

    return data;
  }

  getTrustLevel(score) {
    if (score <= -5) return "low";
    if (score >= 5) return "high";
    return "neutral";
  }

  updateState(userId, message) {
    const state = this.userState.get(userId) || {
      lastMessage: null,
      repeat: 0
    };

    if (state.lastMessage === message) {
      state.repeat++;
    } else {
      state.repeat = 0;
    }

    state.lastMessage = message;
    this.userState.set(userId, state);

    return state;
  }

  updateStats(userId, action) {
    const stats = this.userStats.get(userId) || {
      answer: 0,
      ask: 0,
      defense: 0,
      limited: 0,
      controlled: 0,
      empathetic: 0
    };

    if (stats[action] !== undefined) {
      stats[action]++;
    }

    this.userStats.set(userId, stats);
    this.updateUserProfile(userId, null, stats);

    return stats;
  }

  updateUserProfile(userId, behavior = null, stats = null) {
    const profile = this.userProfiles.get(userId) || {
      interactionCount: 0,
      score: 0,
      personality: "neutral",
      stats: {}
    };

    profile.interactionCount++;

    if (behavior) profile.score = behavior.score;
    if (stats) profile.stats = stats;

    if (profile.score <= -5) profile.personality = "aggressive";
    else if (profile.score >= 5) profile.personality = "friendly";
    else profile.personality = "neutral";

    this.userProfiles.set(userId, profile);
    return profile;
  }

  getUserProfile(userId) {
    return this.userProfiles.get(userId) || null;
  }

  analyzeMessage(message) {
    if (!message) {
      return { needsResponse: false, confidence: 0, reason: "empty" };
    }

    const text = message.trim();
    const lower = text.toLowerCase();

    if (text.length <= 2) {
      return { needsResponse: false, confidence: 0.9, reason: "too_short" };
    }

    if (lower.includes("?")) {
      return { needsResponse: true, confidence: 1, reason: "question" };
    }

    if (["حزين","تعبان","زعلان","طفشان"].some(w => lower.includes(w))) {
      return { needsResponse: true, confidence: 0.9, reason: "emotional" };
    }

    if (["سوي","نفذ","افعل"].some(w => lower.includes(w))) {
      return { needsResponse: true, confidence: 0.85, reason: "command" };
    }

    if (text.length < 6) {
      return { needsResponse: true, confidence: 0.4, reason: "unclear" };
    }

    if (text.length > 80) {
      return { needsResponse: true, confidence: 0.85, reason: "detailed" };
    }

    return { needsResponse: true, confidence: 0.7, reason: "normal" };
  }

  async getSocialBoost(userId, targetUserId) {
    if (!userId) return 0;

    try {
      let boost = 0;

      if (targetUserId) {
        const relation = await aiSocialAwarenessSystem.getRelationshipContext(userId, targetUserId);

        if (relation) {
          if (relation.score > 15) boost += 0.2;
          if (relation.score < -10) boost -= 0.25;
        }
      }

      const context = aiSocialAwarenessSystem.getSocialContext(userId);

      if (context?.networkStrength) {
        if (context.networkStrength > 50) boost += 0.1;
        if (context.networkStrength < -30) boost -= 0.1;
      }

      const influence = aiSocialAwarenessSystem.getUserInfluenceScore(userId);
      if (influence > 30) boost += 0.1;

      return boost;

    } catch {
      return 0;
    }
  }

  preventLoop(userId, decision) {
    const last = this.lastDecisions.get(userId);

    if (last === decision) {
      return decision === "ask" ? "answer" : decision;
    }

    this.lastDecisions.set(userId, decision);
    return decision;
  }

  async decide({
    intent,
    contextStrength,
    isAggressive,
    message,
    emotion,
    userId,
    context,
    predictedBehavior
  }) {

    this.autoEvaluateFeedback(userId, message);

    intent = intent || this.detectIntent(message);
    isAggressive = isAggressive ?? this.detectAggression(message);

    const behavior = this.updateBehavior(userId, isAggressive);
    const trustLevel = this.getTrustLevel(behavior.score);

    const state = this.updateState(userId, message);
    const isRepeated = state.repeat > 1;

    const analysis = this.analyzeMessage(message);

    const socialBoost = await this.getSocialBoost(
      userId,
      context?.targetUserId
    );

    let confidence = this.clampConfidence(
      analysis.confidence +
      socialBoost +
      this.getLearningBias(userId)
    );

    if (!analysis.needsResponse) {
      this.updateStats(userId, "limited");
      this.registerDecision(userId, "limited", confidence);
      return "limited";
    }

    if (isAggressive) {
      this.updateStats(userId, "defense");
      this.registerDecision(userId, "defense", confidence);
      return "defense";
    }

    if (isRepeated) {
      this.updateStats(userId, "limited");
      this.registerDecision(userId, "limited", confidence);
      return "limited";
    }

    if (trustLevel === "low" && confidence < 0.6) {
      this.updateStats(userId, "limited");
      this.registerDecision(userId, "limited", confidence);
      return "limited";
    }

    if (predictedBehavior) {

      if (["escalation","hostile_pattern"].includes(predictedBehavior.type)) {
        this.updateStats(userId, "defense");
        this.registerDecision(userId, "defense", confidence);
        return "defense";
      }

      if (predictedBehavior.type === "repeat") {
        this.updateStats(userId, "limited");
        this.registerDecision(userId, "limited", confidence);
        return "limited";
      }

      if (predictedBehavior.type === "emotional_continuation") {
        this.updateStats(userId, "empathetic");
        this.registerDecision(userId, "empathetic", confidence);
        return "empathetic";
      }

      if (predictedBehavior.type === "follow_up") {
        const result = confidence > 0.4 ? "answer" : "ask";
        this.updateStats(userId, result);
        this.registerDecision(userId, result, confidence);
        return result;
      }

      if (predictedBehavior.type === "deep_engagement") {
        confidence += 0.15;
      }
    }

    if (emotion) {

      if (emotion.polarity === "negative" && emotion.intensity > 0.5) {
        this.updateStats(userId, "empathetic");
        this.registerDecision(userId, "empathetic", confidence);
        return "empathetic";
      }

      if (emotion.hidden && emotion.hidden.length > 0) {
        this.updateStats(userId, "ask");
        this.registerDecision(userId, "ask", confidence);
        return "ask";
      }
    }

    if (intent === "command") {
      this.updateStats(userId, "controlled");
      this.registerDecision(userId, "controlled", confidence);
      return "controlled";
    }

    if (intent === "emotional") {
      this.updateStats(userId, "empathetic");
      this.registerDecision(userId, "empathetic", confidence);
      return "empathetic";
    }

    if (intent === "question" || intent === "help") {
      const result = confidence > 0.45 ? "answer" : "ask";
      this.updateStats(userId, result);
      this.registerDecision(userId, result, confidence);
      return result;
    }

    if (analysis.reason === "unclear") {
      this.updateStats(userId, "ask");
      this.registerDecision(userId, "ask", confidence);
      return "ask";
    }

    if (contextStrength < 2 && confidence < 0.65) {
      this.updateStats(userId, "ask");
      this.registerDecision(userId, "ask", confidence);
      return "ask";
    }

    const finalDecision = confidence > 0.4 ? "answer" : "ask";
    const safeDecision = this.preventLoop(userId, finalDecision);

    this.updateStats(userId, safeDecision);
    this.registerDecision(userId, safeDecision, confidence);

    return safeDecision;
  }

}

module.exports = new AIDecisionSystem();