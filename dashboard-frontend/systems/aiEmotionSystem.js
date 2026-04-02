const aiMemorySystem = require("./aiMemorySystem");
const aiContextSystem = require("./aiContextSystem");

class AIEmotionSystem {
  constructor() {
    this.emotionKeywords = {
      sad: ["حزين", "زعلان", "تعبان", "مكتئب", "طفشان", "ضايق", "مضايق"],
      happy: ["مبسوط", "فرحان", "سعيد", "متحمس", "مرتاح"],
      angry: ["معصب", "غاضب", "مقهور", "منرفز", "مستفز"],
      fear: ["خايف", "متوتر", "قلق", "مرعوب"]
    };

    this.intensifiers = ["جداً", "مره", "مرة", "كثير", "قوي"];
    this.negations = ["مو", "مش", "ما", "ليس", "ماني"];

    // 🔥 self-learning memory
    this.emotionMemory = new Map();
  }

  // =========================
  // 🔥 SELF LEARNING
  // =========================

  updateLearning(userId, emotion) {
    if (!userId || !emotion) return;

    const data = this.emotionMemory.get(userId) || {
      sad: 0,
      happy: 0,
      angry: 0,
      fear: 0
    };

    if (data[emotion] !== undefined) {
      data[emotion]++;
    }

    this.emotionMemory.set(userId, data);
  }

  getEmotionBias(userId) {
    const data = this.emotionMemory.get(userId);
    if (!data) return null;

    const total = Object.values(data).reduce((a, b) => a + b, 0);
    if (total === 0) return null;

    const dominant = Object.entries(data).sort((a, b) => b[1] - a[1])[0];
    if (!dominant) return null;

    const [emotion, count] = dominant;
    const ratio = count / total;

    if (ratio < 0.4) return null;

    return emotion;
  }

  async analyze(message, context = {}, predictedBehavior = null) {
    try {
      const text = (message || "").toLowerCase();
      const words = text.split(/\s+/);

      let scores = {
        sad: 0,
        happy: 0,
        angry: 0,
        fear: 0
      };

      let signals = {
        words: [],
        patterns: [],
        context: false,
        prediction: null
      };

      for (const [emotion, keywords] of Object.entries(this.emotionKeywords)) {
        for (const word of words) {
          if (keywords.includes(word)) {
            scores[emotion] += 1;
            signals.words.push(word);
          }
        }
      }

      let intensityBoost = 0;
      for (const word of words) {
        if (this.intensifiers.includes(word)) {
          intensityBoost += 0.5;
          signals.patterns.push("intensifier");
        }
      }

      let negated = false;
      for (const word of words) {
        if (this.negations.includes(word)) {
          negated = true;
          signals.patterns.push("negation_detected");
        }
      }

      if (text.length > 100) {
        for (const key in scores) {
          if (scores[key] > 0) scores[key] += 0.5;
        }
        signals.patterns.push("long_message");
      }

      let contextBoost = 0;
      if (context?.recentEmotion) {
        scores[context.recentEmotion] += 0.5;
        contextBoost = 0.5;
        signals.context = true;
      }

      if (predictedBehavior) {
        signals.prediction = predictedBehavior.type;

        if (predictedBehavior.type === "emotional_continuation") {
          for (const key in scores) {
            if (scores[key] > 0) scores[key] += 0.5;
          }
        }

        if (predictedBehavior.type === "escalation") {
          scores.angry += 0.5;
        }

        if (predictedBehavior.type === "deep_engagement") {
          intensityBoost += 0.2;
        }
      }

      let primary = "neutral";
      let max = 0;

      for (const [emotion, value] of Object.entries(scores)) {
        if (value > max) {
          max = value;
          primary = emotion;
        }
      }

      // 🔥 learning bias applied
      const bias = this.getEmotionBias(context?.userId);
      if (bias && scores[bias] > 0) {
        primary = bias;
        max += 0.3;
      }

      let intensity = Math.min(1, (max + intensityBoost) / 3);

      let polarity = "neutral";
      if (["sad", "angry", "fear"].includes(primary)) polarity = "negative";
      if (primary === "happy") polarity = "positive";

      let hidden = [];
      if (negated && primary !== "neutral") {
        hidden.push(primary);
        primary = "neutral";
      }

      let secondary = null;
      let secondMax = 0;

      for (const [emotion, value] of Object.entries(scores)) {
        if (emotion !== primary && value > secondMax) {
          secondMax = value;
          secondary = value > 0 ? emotion : null;
        }
      }

      let confidence = Math.min(1, (max + contextBoost + intensityBoost) / 3);

      // 🔥 update learning
      if (primary !== "neutral") {
        this.updateLearning(context?.userId, primary);
      }

      return {
        primary,
        secondary,
        intensity,
        polarity,
        confidence,
        hidden,
        signals
      };

    } catch (error) {
      return {
        primary: "neutral",
        secondary: null,
        intensity: 0,
        polarity: "neutral",
        confidence: 0,
        hidden: [],
        signals: {}
      };
    }
  }
}

module.exports = new AIEmotionSystem();