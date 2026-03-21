const logger = require("./loggerSystem");
const aiSocialAwarenessSystem = require("./aiSocialAwarenessSystem");

class AIAutonomousSystem {

  constructor() {
    this.cooldowns = new Map();
    this.minCooldown = 1000 * 60 * 2; // 2 minutes

    // 🔥 adaptive cooldown
    this.dynamicCooldown = true;

    // 🔥 anti-spam memory
    this.lastTriggerType = new Map();
  }

  // =========================
  // COOLDOWN
  // =========================

  getCooldown(userId, contextStrength = 0) {
    if (!this.dynamicCooldown) return this.minCooldown;

    // stronger context → shorter cooldown
    if (contextStrength >= 5) return this.minCooldown * 0.5;
    if (contextStrength >= 3) return this.minCooldown * 0.7;

    return this.minCooldown;
  }

  canTrigger(userId, contextStrength = 0) {
    const last = this.cooldowns.get(userId) || 0;
    const now = Date.now();

    const cooldown = this.getCooldown(userId, contextStrength);

    if (now - last < cooldown) return false;

    this.cooldowns.set(userId, now);
    return true;
  }

  // =========================
  // DECISION
  // =========================

  async decideTrigger({
    userId,
    message,
    emotion,
    contextStrength,
    context,
    predictedBehavior
  }) {

    if (!message) return null;

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

    // 🔥 influencer boost
    let influenceScore = 0;
    try {
      influenceScore = aiSocialAwarenessSystem.getUserInfluenceScore(userId);
    } catch {}

    // =========================
    // PREDICTION LAYER
    // =========================

    if (predictedBehavior) {

      if (predictedBehavior.type === "escalation") return null;
      if (predictedBehavior.type === "repeat") return null;

      if (predictedBehavior.type === "emotional_continuation") {
        return this.safeTrigger(userId, "emotional_followup");
      }

      if (predictedBehavior.type === "deep_engagement") {
        return this.safeTrigger(userId, "curious");
      }
    }

    // =========================
    // SOCIAL LOGIC
    // =========================

    if (relation) {

      if (relation.score > 10 && emotion?.type === "sad") {
        return this.safeTrigger(userId, "social_support");
      }

      if (relation.score < -5 && emotion?.type === "angry") {
        return null;
      }
    }

    // =========================
    // EMOTION
    // =========================

    if (emotion?.type !== "neutral" && emotion?.intensity > 0.5) {
      return this.safeTrigger(userId, "emotional_followup");
    }

    // =========================
    // SHORT MESSAGE
    // =========================

    if (message.length < 6) {
      return this.safeTrigger(userId, "engage");
    }

    // =========================
    // LOW CONTEXT
    // =========================

    if (contextStrength < 2) {
      return this.safeTrigger(userId, "curious");
    }

    // =========================
    // 🔥 HIGH INFLUENCE USERS
    // =========================

    if (influenceScore > 30) {
      return this.safeTrigger(userId, "engage");
    }

    return null;
  }

  // =========================
  // 🔥 ANTI-SPAM TRIGGER
  // =========================

  safeTrigger(userId, type) {
    const lastType = this.lastTriggerType.get(userId);

    if (lastType === type) {
      return null;
    }

    this.lastTriggerType.set(userId, type);
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