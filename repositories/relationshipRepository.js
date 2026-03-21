const database = require("../systems/databaseSystem");

class RelationshipRepository {

  async getRelationship(userA, userB) {
    const result = await database.query(
      `SELECT * FROM relationships WHERE user_a = $1 AND user_b = $2 LIMIT 1`,
      [userA, userB]
    );

    return result?.rows?.[0] || null;
  }

  async saveRelationship(data) {
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
        data.userA,
        data.userB,
        data.count,
        data.score,
        data.lastInteraction
      ]
    );
  }

  async getTopRelationships(userId, limit = 3) {
    const result = await database.query(
      `
      SELECT * FROM relationships
      WHERE user_a = $1
      ORDER BY score DESC
      LIMIT $2
      `,
      [userId, limit]
    );

    return result?.rows || [];
  }

}

module.exports = new RelationshipRepository();