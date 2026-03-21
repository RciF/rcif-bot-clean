const relationshipRepository = require("../repositories/relationshipRepository");

class AISocialAwarenessSystem {
  constructor() {
    this.relationships = new Map(); // cache layer
  }

  buildKey(userA, userB) {
    return `${userA}:${userB}`;
  }

  async trackInteraction(message) {
    if (!message || !message.author) return;

    const userA = message.author.id;
    let userB = null;

    if (message.reference && message.mentions?.repliedUser) {
      userB = message.mentions.repliedUser.id;
    }

    if (!userB && message.mentions?.users?.size > 0) {
      userB = message.mentions.users.first().id;
    }

    if (!userB || userA === userB) return;

    const interaction = this.analyzeInteraction(message);

    await this.updateRelationship(userA, userB, interaction);
  }

  analyzeInteraction(message) {
    const content = (message.content || "").toLowerCase();

    let sentiment = "neutral";
    let weight = 1;

    if (content.includes("شكرا") || content.includes("thanks")) {
      sentiment = "positive";
      weight = 2;
    }

    if (content.includes("غبي") || content.includes("stupid")) {
      sentiment = "negative";
      weight = 2;
    }

    if (content.includes("احبك")) {
      sentiment = "positive";
      weight = 3;
    }

    if (content.includes("اكرهك")) {
      sentiment = "negative";
      weight = 3;
    }

    return {
      sentiment,
      weight,
      timestamp: Date.now()
    };
  }

  async updateRelationship(userA, userB, data) {
    const key = this.buildKey(userA, userB);

    let existing = this.relationships.get(key);

    if (!existing) {
      existing = await relationshipRepository.getRelationship(userA, userB);

      if (!existing) {
        existing = {
          userA,
          userB,
          count: 0,
          score: 0,
          lastInteraction: null
        };
      }
    }

    existing.count += 1;
    existing.lastInteraction = data.timestamp;

    if (data.sentiment === "positive") {
      existing.score += 2 * data.weight;
    }

    if (data.sentiment === "negative") {
      existing.score -= 2 * data.weight;
    }

    if (existing.score > 50) existing.score = 50;
    if (existing.score < -50) existing.score = -50;

    this.relationships.set(key, existing);

    await relationshipRepository.saveRelationship(existing);
  }

  async getRelationshipContext(userA, userB) {
    const key = this.buildKey(userA, userB);

    let relationship = this.relationships.get(key);

    if (!relationship) {
      relationship = await relationshipRepository.getRelationship(userA, userB);
      if (relationship) {
        this.relationships.set(key, relationship);
      }
    }

    return relationship || null;
  }

  async getTopRelationships(userId, limit = 3) {
    const dbResults = await relationshipRepository.getTopRelationships(userId, limit);

    return dbResults.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

module.exports = new AISocialAwarenessSystem();