const database = require("../systems/databaseSystem");

class RelationshipRepository {

  normalizeUsers(userA, userB) {
    if (!userA || !userB) return [userA, userB];
    return [userA, userB].sort();
  }

  mapRow(row) {
    if (!row) return null;

    return {
      userA: row.user_a,
      userB: row.user_b,
      count: Number(row.count) || 0,
      score: Number(row.score) || 0,
      lastInteraction: row.last_interaction || null
    };
  }

  async getRelationship(userA, userB) {
    const [a, b] = this.normalizeUsers(userA, userB);

    try {
      const result = await database.query(
        `SELECT * FROM relationships 
         WHERE user_a = $1 AND user_b = $2 
         LIMIT 1`,
        [a, b]
      );

      return this.mapRow(result?.rows?.[0]);

    } catch (err) {
      console.error("RELATIONSHIP_GET_ERROR", err?.message);
      return null;
    }
  }

  async saveRelationship(data) {
    const [a, b] = this.normalizeUsers(data.userA, data.userB);

    try {
      await database.query(
        `
        INSERT INTO relationships (user_a, user_b, count, score, last_interaction)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_a, user_b)
        DO UPDATE SET
          count = EXCLUDED.count,
          score = EXCLUDED.score,
          last_interaction = EXCLUDED.last_interaction
        `,
        [
          a,
          b,
          data.count,
          data.score,
          data.lastInteraction
        ]
      );
    } catch (err) {
      console.error("RELATIONSHIP_SAVE_ERROR", err?.message);
    }
  }

  async bulkSaveRelationships(relations = []) {
    if (!Array.isArray(relations) || relations.length === 0) return;

    const values = [];
    const params = [];
    let index = 1;

    for (const rel of relations) {
      const [a, b] = this.normalizeUsers(rel.userA, rel.userB);

      values.push(`($${index++}, $${index++}, $${index++}, $${index++}, $${index++})`);

      params.push(
        a,
        b,
        rel.count || 0,
        rel.score || 0,
        rel.lastInteraction || null
      );
    }

    try {
      await database.query(
        `
        INSERT INTO relationships (user_a, user_b, count, score, last_interaction)
        VALUES ${values.join(",")}
        ON CONFLICT (user_a, user_b)
        DO UPDATE SET
          count = EXCLUDED.count,
          score = EXCLUDED.score,
          last_interaction = EXCLUDED.last_interaction
        `,
        params
      );
    } catch (err) {
      console.error("RELATIONSHIP_BULK_SAVE_ERROR", err?.message);
    }
  }

  async getTopRelationships(userId, limit = 3) {
    try {
      const result = await database.query(
        `
        SELECT * FROM relationships
        WHERE user_a = $1 OR user_b = $1
        ORDER BY score DESC
        LIMIT $2
        `,
        [userId, limit]
      );

      if (!Array.isArray(result?.rows)) return [];

      return result.rows.map(row => this.mapRow(row));

    } catch (err) {
      console.error("RELATIONSHIP_TOP_ERROR", err?.message);
      return [];
    }
  }

  async getAllRelationships(userId) {
    try {
      const result = await database.query(
        `
        SELECT * FROM relationships
        WHERE user_a = $1 OR user_b = $1
        `,
        [userId]
      );

      if (!Array.isArray(result?.rows)) return [];

      return result.rows.map(row => this.mapRow(row));

    } catch (err) {
      console.error("RELATIONSHIP_ALL_ERROR", err?.message);
      return [];
    }
  }

  async deleteRelationship(userA, userB) {
    const [a, b] = this.normalizeUsers(userA, userB);

    try {
      await database.query(
        `DELETE FROM relationships WHERE user_a = $1 AND user_b = $2`,
        [a, b]
      );
    } catch (err) {
      console.error("RELATIONSHIP_DELETE_ERROR", err?.message);
    }
  }

  async deleteAllUserRelationships(userId) {
    try {
      await database.query(
        `DELETE FROM relationships WHERE user_a = $1 OR user_b = $1`,
        [userId]
      );
    } catch (err) {
      console.error("RELATIONSHIP_DELETE_ALL_ERROR", err?.message);
    }
  }

}

module.exports = new RelationshipRepository();