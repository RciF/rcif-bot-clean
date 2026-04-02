const logger = require("./loggerSystem");
const aiSocialAwarenessSystem = require("./aiSocialAwarenessSystem");

class AIAutonomousSystem {

  constructor() {
    this.cooldowns = new Map();
    this.channelCooldowns = new Map();
    this.minCooldown = 1000 * 60 * 2;

    this.dynamicCooldown = true;

    this.lastTriggerType = new Map();

    this.activityTracker = new Map();

    this.globalLastTrigger = 0;
    this.globalCooldown = 1000 * 15;

    // 🔥 self-learning trigger performance
    this.triggerStats = new Map();
  }

  // =========================
  // 🔥 SELF LEARNING
  // =========================

  updateTriggerLearning(userId, type, success = true) {
    const data = this.triggerStats.get(userId) || {};

    if (!data[type]) {
      data[type] = { success: 0, fail: 0 };
    }

    if (success) data[type].success++;
    else data[type].fail++;

    this.triggerStats.set(userId, data);
  }

  getTriggerBias(userId, type) {
    const data = this.triggerStats.get(userId);
    if (!data || !data[type]) return 0;

    const stat = data[type];
    const total = stat.success + stat.fail;

    if (total === 0) return 0;

    const ratio = stat.success / total;

    if (ratio > 0.7) return 1;
    if (ratio < 0.3) return -1;

    return 0;
  }

  // =========================
  // COOLDOWN
  // =========================

  getCooldown(userId, contextStrength = 0) {
    if (!this.dynamicCooldown) return this.minCooldown;

    if (contextStrength >= 5) return this.minCooldown * 0.5;
    if (contextStrength >= 3) return this.minCooldown * 0.7;

    return this.minCooldown;
  }

  canTrigger(userId, channelId, contextStrength = 0) {
    const now = Date.now();

    if (now - this.globalLastTrigger < this.globalCooldown) {
      return false;
    }

    const lastUser = this.cooldowns.get(userId) || 0;
    const cooldown = this.getCooldown(userId, contextStrength);

    if (now - lastUser < cooldown) return false;

    const lastChannel = this.channelCooldowns.get(channelId) || 0;
    if (now - lastChannel < this.minCooldown * 0.5) return false;

    this.cooldowns.set(userId, now);
    this.channelCooldowns.set(channelId, now);
    this.globalLastTrigger = now;

    return true;
  }

  // =========================
  // ACTIVITY
  // =========================

  trackActivity(channelId, userId) {
    if (!channelId || !userId) return;

    const key = channelId;

    if (!this.activityTracker.has(key)) {
      this.activityTracker.set(key, []);
    }

    const arr = this.activityTracker.get(key);

    arr.push({
      userId,
      time: Date.now()
    });

    if (arr.length > 20) {
      arr.shift();
    }
  }

  getActivityLevel(channelId) {
    const arr = this.activityTracker.get(channelId) || [];

    const now = Date.now();

    const active = arr.filter(e => now - e.time < 30000);

    return active.length;
  }

  // =========================
  // DECISION
  // =========================

  async decideTrigger({
    userId,
    channelId,
    message,
    emotion,
    contextStrength,
    context,
    predictedBehavior
  }) {

    if (!message || !userId) return null;

    this.trackActivity(channelId, userId);

    const activity = this.getActivityLevel(channelId);

    if (activity <= 1 && contextStrength < 2) {
      return null;
    }

    if (!this.canTrigger(userId, channelId, contextStrength)) {
      return null;
    }

    let relation = null;

    if (context?.targetUserId) {
      try {
        relation = await aiSocialAwarenessSystem.getRelationshipContext(
          userId,
          context.targetUserId
        );
      } catch (err) {
        logger.error("AUTONOMOUS_RELATION_FETCH_FAILED", {
          error: err?.message
        });
      }
    }

    let influenceScore = 0;
    try {
      influenceScore = aiSocialAwarenessSystem.getUserInfluenceScore(userId);
    } catch {}

    let networkHealth = null;
    try {
      networkHealth = aiSocialAwarenessSystem.getNetworkHealth();
    } catch {}

    let priority = 0;

    if (emotion?.intensity > 0.6) priority += 3;
    if (predictedBehavior?.type === "deep_engagement") priority += 2;
    if (contextStrength >= 4) priority += 2;
    if (activity > 5) priority += 2;
    if (influenceScore > 25) priority += 2;

    if (networkHealth?.status === "strong") priority += 1;

    if (priority < 2) return null;

    // =========================
    // LEARNING BIAS
    // =========================

    const applyBias = (type) => {
      const bias = this.getTriggerBias(userId, type);
      if (bias < 0) return null;
      return this.safeTrigger(userId, type);
    };

    // =========================
    // PREDICTION
    // =========================

    if (predictedBehavior) {

      if (predictedBehavior.type === "escalation") return null;
      if (predictedBehavior.type === "repeat") return null;

      if (predictedBehavior.type === "emotional_continuation") {
        return applyBias("emotional_followup");
      }

      if (predictedBehavior.type === "deep_engagement") {
        return applyBias("curious");
      }
    }

    // =========================
    // SOCIAL
    // =========================

    if (relation) {

      if (relation.score > 10 && emotion?.type === "sad") {
        return applyBias("social_support");
      }

      if (relation.score < -5 && emotion?.type === "angry") {
        return null;
      }
    }

    // =========================
    // EMOTION
    // =========================

    if (emotion?.type !== "neutral" && emotion?.intensity > 0.5) {
      return applyBias("emotional_followup");
    }

    // =========================
    // ACTIVITY
    // =========================

    if (activity >= 6) {
      return applyBias("engage");
    }

    if (message.length < 6) {
      return applyBias("engage");
    }

    if (contextStrength < 2) {
      return applyBias("curious");
    }

    if (influenceScore > 30) {
      return applyBias("engage");
    }

    return null;
  }

  // =========================
  // ANTI-SPAM
  // =========================

  safeTrigger(userId, type) {
    const lastType = this.lastTriggerType.get(userId);

    if (lastType === type) {
      return null;
    }

    this.lastTriggerType.set(userId, type);

    // 🔥 learning update (assume success initially)
    this.updateTriggerLearning(userId, type, true);

    return type;
  }

  // =========================
  // PROMPTS
  // =========================

  buildAutonomousPrompt(type) {

    if (type === "social_support") {
      return `
- المستخدم قريب منك
- لاحظت حالته
- ادخل بلطف وادعمه بدون ما يطلب
- لا تكون رسمي
`;
    }

    if (type === "emotional_followup") {
      return `
- تابع المشاعر
- لا تسكت
- اسأل أو علّق بشكل إنساني
- لا تكرر نفس الاسلوب
`;
    }

    if (type === "engage") {
      return `
- حاول تفتح تفاعل
- اسأل شيء بسيط
- خفيفة وسريعة
`;
    }

    if (type === "curious") {
      return `
- اسأل سؤال خفيف
- ابني محادثة
- لا تكون ثقيل
`;
    }

    return "";
  }

}

module.exports = new AIAutonomousSystem();