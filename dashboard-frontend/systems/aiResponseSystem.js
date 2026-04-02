const aiMemorySystem = require("./aiMemorySystem");

class AIResponseSystem {

  constructor() {
    this.responseStyles = {
      answer: this.answerResponse.bind(this),
      ask: this.askResponse.bind(this),
      empathetic: this.empatheticResponse.bind(this),
      defense: this.defenseResponse.bind(this),
      limited: this.limitedResponse.bind(this),
      controlled: this.controlledResponse.bind(this)
    };
  }

  // =========================
  // MAIN
  // =========================

  async generateResponse({
    userId,
    message,
    decision,
    context = "",
    emotion = null
  }) {

    const memories = await aiMemorySystem.searchRelevantMemories(userId, message);

    const memoryContext = memories.length
      ? `\n[Memory]\n${memories.join("\n")}\n`
      : "";

    const finalContext = `
${memoryContext}
${context}
`.trim();

    const handler = this.responseStyles[decision];

    if (!handler) {
      return this.defaultResponse(message);
    }

    return handler({
      message,
      context: finalContext,
      emotion
    });
  }

  // =========================
  // RESPONSE TYPES
  // =========================

  answerResponse({ message }) {
    return `تمام، خلني أجاوبك:\n${message}`;
  }

  askResponse({ message }) {
    return `ممكن توضح أكثر؟`;
  }

  empatheticResponse({ emotion }) {
    return `واضح إنك تمر بشيء مو سهل، تبي تتكلم عنه أكثر؟`;
  }

  defenseResponse() {
    return `تكلم بأسلوب محترم عشان أقدر أساعدك.`;
  }

  limitedResponse() {
    return `ما أقدر أتعامل مع هذا الطلب حالياً.`;
  }

  controlledResponse({ message }) {
    return `خلنا نمشي خطوة خطوة:\n${message}`;
  }

  defaultResponse(message) {
    return `وضح أكثر: ${message}`;
  }

}

module.exports = new AIResponseSystem();