class SocialGraphRepository {
  constructor() {
    this.storage = new Map();
  }

  buildKey(userA, userB) {
    return `${userA}:${userB}`;
  }

  getRelationship(userA, userB) {
    const key = this.buildKey(userA, userB);
    return this.storage.get(key) || null;
  }

  saveRelationship(userA, userB, data) {
    const key = this.buildKey(userA, userB);
    this.storage.set(key, data);
  }

  updateRelationship(userA, userB, updateFn) {
    const existing = this.getRelationship(userA, userB) || {
      count: 0,
      score: 0,
      lastInteraction: null
    };

    const updated = updateFn(existing);
    this.saveRelationship(userA, userB, updated);

    return updated;
  }

  getAll() {
    return Array.from(this.storage.entries());
  }
}

module.exports = new SocialGraphRepository();