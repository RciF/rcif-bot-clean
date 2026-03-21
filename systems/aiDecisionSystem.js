const aiSocialAwarenessSystem = require("./aiSocialAwarenessSystem");

class AIDecisionSystem {

  constructor() {
    this.userBehavior = new Map();
    this.userState = new Map();
    this.userStats = new Map();
    this.userProfiles = new Map();
  }

  detectIntent(message) {
    if (!message) return "unknown";

    const text = message.toLowerCase();

    if (text.includes("?")) return "question";

    if (
      text.includes("ساعد") ||
      text.includes("كيف") ||
      text.includes("ابي") ||
      text.includes("ابغى")
    ) return "help";

    if (
      text.includes("احس") ||
      text.includes("طفشان") ||
      text.includes("زعلان")
    ) return "emotional";

    if (
      text.includes("سوي") ||
      text.includes("نفذ") ||
      text.includes("افعل")
    ) return "command";

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

    if (data.score > 10) data.score = 10;
    if (data.score < -10) data.score = -10;

    this.userBehavior.set(userId, data);
    this.updateUserProfile(userId, data);

    return data;
  }

  getTrustLevel(score) {
    if (score <= -5) return "low";
    if (score >= 5) return "high";
    return "neutral";
  }

  detectRepetition(userId, message) {
    const state = this.userState.get(userId);
    if (!state) return false;

    return state.lastMessage === message;
  }

  updateState(userId, message, action) {
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
      personality: "neutral"
    };

    profile.interactionCount++;

    if (behavior) {
      profile.score = behavior.score;
    }

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
      return {
        needsResponse: false,
        confidence: 0,
        reason: "empty"
      };
    }

    const text = message.trim();
    const lower = text.toLowerCase();

    if (text.length <= 2) {
      return {
        needsResponse: false,
        confidence: 0.9,
        reason: "too_short"
      };
    }

    if (lower.includes("?")) {
      return {
        needsResponse: true,
        confidence: 1,
        reason: "question"
      };
    }

    if (
      lower.includes("حزين") ||
      lower.includes("تعبان") ||
      lower.includes("زعلان") ||
      lower.includes("طفشان")
    ) {
      return {
        needsResponse: true,
        confidence: 0.9,
        reason: "emotional"
      };
    }

    if (
      lower.includes("سوي") ||
      lower.includes("نفذ") ||
      lower.includes("افعل")
    ) {
      return {
        needsResponse: true,
        confidence: 0.85,
        reason: "command"
      };
    }

    if (text.length < 6) {
      return {
        needsResponse: true,
        confidence: 0.4,
        reason: "unclear"
      };
    }

    if (text.length > 80) {
      return {
        needsResponse: true,
        confidence: 0.85,
        reason: "detailed"
      };
    }

    return {
      needsResponse: true,
      confidence: 0.7,
      reason: "normal"
    };
  }

  decide({
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

    let relationshipBoost = 0;

    if (context?.targetUserId && userId) {
      const relation = aiSocialAwarenessSystem.getRelationshipContext(
        userId,
        context.targetUserId
      );

      if (relation) {
        if (relation.score > 10) relationshipBoost = 0.15;
        if (relation.score < -5) relationshipBoost = -0.2;
      }
    }

    let confidence = analysis.confidence + relationshipBoost;

    if (!analysis.needsResponse) {
      return "limited";
    }

    if (isAggressive) return "defense";

    if (isRepeated) return "limited";

    if (trustLevel === "low") return "limited";

    // ✅ Prediction Influence (refined)
    if (predictedBehavior) {

      if (
        predictedBehavior.type === "escalation" ||
        predictedBehavior.type === "hostile_pattern"
      ) {
        return "defense";
      }

      if (predictedBehavior.type === "repeat") {
        return "limited";
      }

      if (predictedBehavior.type === "emotional_continuation") {
        return "empathetic";
      }

      if (predictedBehavior.type === "follow_up") {
        return confidence > 0.35 ? "answer" : "ask";
      }

      if (predictedBehavior.type === "deep_engagement") {
        confidence += 0.15;
      }
    }

    // 🔥 Emotion layer
    if (emotion) {

      if (emotion.polarity === "negative" && emotion.intensity > 0.6) {
        return "empathetic";
      }

      if (emotion.polarity === "negative" && emotion.intensity > 0.3) {
        return "empathetic";
      }

      if (emotion.hidden && emotion.hidden.length > 0) {
        return "ask";
      }
    }

    if (intent === "command") return "controlled";

    if (intent === "emotional") return "empathetic";

    if (intent === "question") return confidence > 0.4 ? "answer" : "ask";

    if (intent === "help") return confidence > 0.4 ? "answer" : "ask";

    if (analysis.reason === "unclear") return "ask";

    if (contextStrength < 2 && confidence < 0.6) return "ask";

    return "answer";
  }

}

module.exports = new AIDecisionSystem();