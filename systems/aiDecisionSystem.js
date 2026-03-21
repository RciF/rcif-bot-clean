const aiSocialAwarenessSystem = require("./aiSocialAwarenessSystem");

class AIDecisionSystem {

  constructor() {
    this.userBehavior = new Map();
    this.userState = new Map();
    this.userStats = new Map();
    this.userProfiles = new Map();

    this.MAX_CONFIDENCE = 1.5;
    this.MIN_CONFIDENCE = 0;

    // 🔥 adaptive memory
    this.lastDecisions = new Map();
  }

  clampConfidence(value) {
    if (value > this.MAX_CONFIDENCE) return this.MAX_CONFIDENCE;
    if (value < this.MIN_CONFIDENCE) return this.MIN_CONFIDENCE;
    return value;
  }

  // =========================
  // INTENT
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

  // =========================
  // BEHAVIOR
  // =========================

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

  // =========================
  // STATE
  // =========================

  detectRepetition(userId, message) {
    const state = this.userState.get(userId);
    if (!state) return false;

    return state.lastMessage === message;
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

  // =========================
  // STATS
  // =========================

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

  // =========================
  // PROFILE
  // =========================

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

  // =========================
  // MESSAGE ANALYSIS
  // =========================

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

  // =========================
  // SOCIAL BOOST
  // =========================

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

      // 🔥 influence boost
      const influence = aiSocialAwarenessSystem.getUserInfluenceScore(userId);
      if (influence > 30) boost += 0.1;

      return boost;

    } catch {
      return 0;
    }
  }

  // =========================
  // ANTI LOOP
  // =========================

  preventLoop(userId, decision) {
    const last = this.lastDecisions.get(userId);

    if (last === decision) {
      return decision === "ask" ? "answer" : decision;
    }

    this.lastDecisions.set(userId, decision);
    return decision;
  }

  // =========================
  // DECISION ENGINE
  // =========================

  async decide({
    intent,
    contextStrength,
    isAggressive,
    trustLevel,
    isRepeated,
    message,
    emotion,
    userId,
    context,
    predictedBehavior
  }) {

    const analysis = this.analyzeMessage(message);

    const socialBoost = await this.getSocialBoost(
      userId,
      context?.targetUserId
    );

    let confidence = this.clampConfidence(analysis.confidence + socialBoost);

    if (!analysis.needsResponse) return "limited";

    if (isAggressive) return "defense";

    if (isRepeated) return "limited";

    if (trustLevel === "low" && confidence < 0.6) return "limited";

    // =========================
    // PREDICTION
    // =========================

    if (predictedBehavior) {

      if (["escalation","hostile_pattern"].includes(predictedBehavior.type)) {
        return "defense";
      }

      if (predictedBehavior.type === "repeat") {
        return "limited";
      }

      if (predictedBehavior.type === "emotional_continuation") {
        return "empathetic";
      }

      if (predictedBehavior.type === "follow_up") {
        return confidence > 0.4 ? "answer" : "ask";
      }

      if (predictedBehavior.type === "deep_engagement") {
        confidence += 0.15;
      }
    }

    // =========================
    // EMOTION
    // =========================

    if (emotion) {

      if (emotion.polarity === "negative" && emotion.intensity > 0.5) {
        return "empathetic";
      }

      if (emotion.hidden && emotion.hidden.length > 0) {
        return "ask";
      }
    }

    // =========================
    // INTENT
    // =========================

    if (intent === "command") return "controlled";

    if (intent === "emotional") return "empathetic";

    if (intent === "question") return confidence > 0.45 ? "answer" : "ask";

    if (intent === "help") return confidence > 0.45 ? "answer" : "ask";

    if (analysis.reason === "unclear") return "ask";

    // =========================
    // CONTEXT
    // =========================

    if (contextStrength < 2 && confidence < 0.65) return "ask";

    const finalDecision = confidence > 0.4 ? "answer" : "ask";

    return this.preventLoop(userId, finalDecision);
  }

}

module.exports = new AIDecisionSystem();