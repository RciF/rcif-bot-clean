const relationshipRepository = require("../repositories/relationshipRepository");

class AISocialAwarenessSystem {
  constructor() {
    this.relationships = new Map(); // cache
    this.graph = new Map(); // social graph

    this.MAX_SCORE = 50;
    this.MIN_SCORE = -50;

    this.DECAY_RATE = 0.95;
    this.DECAY_DAYS = 3;

    // 🔥 ADVANCED GRAPH
    this.centralityCache = new Map();
    this.lastCentralityUpdate = 0;
    this.CENTRALITY_TTL = 1000 * 60 * 5; // 5 min
  }

  // =========================
  // CORE HELPERS
  // =========================

  buildKey(userA, userB) {
    if (!userA || !userB) return null;
    return [userA, userB].sort().join(":");
  }

  clampScore(score) {
    if (score > this.MAX_SCORE) return this.MAX_SCORE;
    if (score < this.MIN_SCORE) return this.MIN_SCORE;
    return score;
  }

  normalizeRelationship(data, userA, userB) {
    return {
      userA,
      userB,
      count: data?.count || 0,
      score: data?.score || 0,
      lastInteraction: data?.lastInteraction || null
    };
  }

  // =========================
  // GRAPH SYSTEM
  // =========================

  ensureNode(userId) {
    if (!this.graph.has(userId)) {
      this.graph.set(userId, new Map());
    }
  }

  updateGraphEdge(userA, userB, relationship) {
    this.ensureNode(userA);
    this.ensureNode(userB);

    this.graph.get(userA).set(userB, relationship);
    this.graph.get(userB).set(userA, relationship);

    // 🔥 invalidate centrality cache
    this.centralityCache.clear();
  }

  getUserNetwork(userId) {
    return this.graph.get(userId) || new Map();
  }

  getTopConnections(userId, limit = 5) {
    const network = this.getUserNetwork(userId);

    return Array.from(network.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  getNetworkStrength(userId) {
    const network = this.getUserNetwork(userId);

    let total = 0;
    for (const rel of network.values()) {
      total += rel.score;
    }

    return total;
  }

  // =========================
  // 🔥 ADVANCED GRAPH INTELLIGENCE
  // =========================

  getDegreeCentrality(userId) {
    const network = this.getUserNetwork(userId);
    return network.size;
  }

  getWeightedCentrality(userId) {
    const network = this.getUserNetwork(userId);

    let total = 0;
    for (const rel of network.values()) {
      total += Math.abs(rel.score);
    }

    return total;
  }

  getClosenessCentrality(userId) {
    const visited = new Set();
    const queue = [{ id: userId, dist: 0 }];

    let totalDist = 0;
    let count = 0;

    while (queue.length) {
      const { id, dist } = queue.shift();
      if (visited.has(id)) continue;

      visited.add(id);
      totalDist += dist;
      count++;

      const neighbors = this.getUserNetwork(id);
      for (const next of neighbors.keys()) {
        if (!visited.has(next)) {
          queue.push({ id: next, dist: dist + 1 });
        }
      }
    }

    if (count <= 1) return 0;

    return count / totalDist;
  }

  getUserInfluenceScore(userId) {
    const degree = this.getDegreeCentrality(userId);
    const weighted = this.getWeightedCentrality(userId);
    const closeness = this.getClosenessCentrality(userId);

    return (degree * 1.5) + (weighted * 0.5) + (closeness * 10);
  }

  getTopInfluencers(limit = 5) {
    const now = Date.now();

    if (
      this.centralityCache.size > 0 &&
      now - this.lastCentralityUpdate < this.CENTRALITY_TTL
    ) {
      return Array.from(this.centralityCache.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    }

    const results = [];

    for (const userId of this.graph.keys()) {
      const score = this.getUserInfluenceScore(userId);

      const data = { userId, score };
      results.push(data);
      this.centralityCache.set(userId, data);
    }

    this.lastCentralityUpdate = now;

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  getRelationshipPath(userA, userB) {
    if (userA === userB) return [userA];

    const visited = new Set();
    const queue = [[userA]];

    while (queue.length) {
      const path = queue.shift();
      const last = path[path.length - 1];

      if (last === userB) return path;

      if (visited.has(last)) continue;
      visited.add(last);

      const neighbors = this.getUserNetwork(last);

      for (const next of neighbors.keys()) {
        if (!visited.has(next)) {
          queue.push([...path, next]);
        }
      }
    }

    return null;
  }

  getCluster(userId, depth = 2) {
    const visited = new Set();
    const queue = [{ id: userId, level: 0 }];

    while (queue.length) {
      const { id, level } = queue.shift();
      if (visited.has(id) || level > depth) continue;

      visited.add(id);

      const neighbors = this.getUserNetwork(id);
      for (const next of neighbors.keys()) {
        queue.push({ id: next, level: level + 1 });
      }
    }

    return Array.from(visited);
  }

  // =========================
  // LOAD / SAVE
  // =========================

  async getOrLoadRelationship(userA, userB) {
    const key = this.buildKey(userA, userB);
    if (!key) return null;

    let existing = this.relationships.get(key);

    if (!existing) {
      const db = await relationshipRepository.getRelationship(userA, userB);
      existing = this.normalizeRelationship(db, userA, userB);
      this.relationships.set(key, existing);
    }

    this.updateGraphEdge(userA, userB, existing);

    return existing;
  }

  async saveRelationshipSafe(rel) {
    try {
      await relationshipRepository.saveRelationship(rel);
    } catch (err) {
      console.error("RELATIONSHIP_SAVE_ERROR", err?.message);
    }
  }

  // =========================
  // TRACKING
  // =========================

  async trackInteractionSimple(userA, userB, type) {
    if (!userA || !userB || userA === userB) return;

    try {
      const scoreMap = {
        message: 1,
        reply: 2,
        mention: 3,
        positive: 4,
        negative: -3
      };

      const score = scoreMap[type] || 0;

      const existing = await this.getOrLoadRelationship(userA, userB);
      if (!existing) return;

      existing.score = this.clampScore(existing.score + score);
      existing.count += 1;
      existing.lastInteraction = Date.now();

      const key = this.buildKey(userA, userB);
      this.relationships.set(key, existing);

      this.updateGraphEdge(userA, userB, existing);

      await this.saveRelationshipSafe(existing);

    } catch (err) {
      console.error("RELATIONSHIP_TRACK_SIMPLE_ERROR", err?.message);
    }
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
    const existing = await this.getOrLoadRelationship(userA, userB);
    if (!existing) return;

    existing.count += 1;
    existing.lastInteraction = data.timestamp;

    if (data.sentiment === "positive") {
      existing.score += 2 * data.weight;
    }

    if (data.sentiment === "negative") {
      existing.score -= 2 * data.weight;
    }

    existing.score = this.clampScore(existing.score);

    const key = this.buildKey(userA, userB);
    this.relationships.set(key, existing);

    this.updateGraphEdge(userA, userB, existing);

    await this.saveRelationshipSafe(existing);
  }

  // =========================
  // CONTEXT
  // =========================

  getSocialContext(userId) {
    if (!userId) return null;

    const relations = Array.from(this.relationships.values())
      .filter(r => r.userA === userId || r.userB === userId);

    const sorted = relations.sort((a, b) => b.score - a.score);

    return {
      closeFriends: sorted.filter(r => r.score >= 20).slice(0, 3),
      enemies: sorted.filter(r => r.score <= -20).slice(0, 3),
      neutral: sorted.filter(r => r.score > -20 && r.score < 20).slice(0, 3),

      networkStrength: this.getNetworkStrength(userId),
      topConnections: this.getTopConnections(userId, 5),

      // 🔥 new intelligence
      influenceScore: this.getUserInfluenceScore(userId),
      cluster: this.getCluster(userId, 2)
    };
  }

  async getRelationshipContext(userA, userB) {
    return await this.getOrLoadRelationship(userA, userB);
  }

  async getTopRelationships(userId, limit = 3) {
    try {
      const dbResults = await relationshipRepository.getTopRelationships(userId, limit);

      if (!Array.isArray(dbResults)) return [];

      return dbResults
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (err) {
      console.error("RELATIONSHIP_TOP_ERROR", err?.message);
      return [];
    }
  }

  // =========================
  // GRAPH ADVANCED
  // =========================

  getMutualConnections(userA, userB) {
    const netA = this.getUserNetwork(userA);
    const netB = this.getUserNetwork(userB);

    const mutual = [];

    for (const user of netA.keys()) {
      if (netB.has(user)) {
        mutual.push(user);
      }
    }

    return mutual;
  }

  getRelationshipStrength(userA, userB) {
    const key = this.buildKey(userA, userB);
    const rel = this.relationships.get(key);
    return rel?.score || 0;
  }

  // =========================
  // MAINTENANCE
  // =========================

  decayRelationships() {
    const now = Date.now();

    for (const [key, rel] of this.relationships.entries()) {
      if (!rel.lastInteraction) continue;

      const days = (now - rel.lastInteraction) / (1000 * 60 * 60 * 24);

      if (days >= this.DECAY_DAYS) {
        rel.score = this.clampScore(rel.score * this.DECAY_RATE);
        this.relationships.set(key, rel);

        this.updateGraphEdge(rel.userA, rel.userB, rel);

        this.saveRelationshipSafe(rel);
      }
    }
  }

  cleanupCache(limit = 1000) {
    if (this.relationships.size <= limit) return;

    const sorted = Array.from(this.relationships.entries())
      .sort((a, b) => (b[1].lastInteraction || 0) - (a[1].lastInteraction || 0))
      .slice(0, limit);

    this.relationships = new Map(sorted);

    this.graph.clear();
    for (const rel of this.relationships.values()) {
      this.updateGraphEdge(rel.userA, rel.userB, rel);
    }

    this.centralityCache.clear();
  }
}

module.exports = new AISocialAwarenessSystem();