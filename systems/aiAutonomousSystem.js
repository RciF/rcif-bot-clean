const logger = require("./loggerSystem");
const aiSocialAwarenessSystem = require("./aiSocialAwarenessSystem");

class AIAutonomousSystem {

  constructor() {
    this.cooldowns = new Map();
    this.minCooldown = 1000 * 60 * 2; // 2 minutes
  }

  canTrigger(userId) {
    const last = this.cooldowns.get(userId) || 0;
    const now = Date.now();

    if (now - last < this.minCooldown) return false;

    this.cooldowns.set(userId, now);
    return true;
  }

  decideTrigger({ userId, message, emotion, contextStrength, context, predictedBehavior }) {

    if (!message) return null;

    // ✅ SOCIAL AWARENESS
    let relation = null;
    if (context?.targetUserId) {
      relation = aiSocialAwarenessSystem.getRelationshipContext(
        userId,
        context.targetUserId
      );
    }

    // 🔥 PREDICTION CONTROL (NEW)
    if (predictedBehavior) {

      // escalation → لا تتدخل أو خفف
      if (predictedBehavior.type === "escalation") {
        return null;
      }

      // repeat → لا تحفز زيادة
      if (predictedBehavior.type === "repeat") {
        return null;
      }

      // emotional continuation → دعم تلقائي
      if (predictedBehavior.type === "emotional_continuation") {
        return "emotional_followup";
      }

      // deep engagement → تفاعل أعمق
      if (predictedBehavior.type === "deep_engagement") {
        return "curious";
      }
    }

    // 🔥 SOCIAL INTERVENTION
    if (relation) {

      if (relation.score > 10 && emotion?.type === "sad") {
        return "social_support";
      }

      if (relation.score < -5 && emotion?.type === "angry") {
        return null;
      }
    }

    // 🔥 emotional → respond naturally
    if (emotion?.type !== "neutral" && emotion?.intensity > 0.5) {
      return "emotional_followup";
    }

    // 🔥 short dry message → push interaction
    if (message.length < 6) {
      return "engage";
    }

    // 🔥 no context → ask something
    if (contextStrength < 2) {
      return "curious";
    }

    return null;
  }

  buildAutonomousPrompt(type) {

    if (type === "social_support") {
      return `
- المستخدم قريب منك
- لاحظت حالته
- ادخل بلطف وادعمه بدون ما يطلب
`;
    }

    if (type === "emotional_followup") {
      return `
- تابع المشاعر
- لا تسكت
- اسأل أو علّق بشكل إنساني
`;
    }

    if (type === "engage") {
      return `
- حاول تفتح تفاعل
- اسأل شيء بسيط
`;
    }

    if (type === "curious") {
      return `
- اسأل سؤال خفيف
- ابني محادثة
`;
    }

    return "";
  }

}

module.exports = new AIAutonomousSystem();