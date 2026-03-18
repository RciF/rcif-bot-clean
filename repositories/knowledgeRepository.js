const databaseSystem = require("../systems/databaseSystem");
const logger = require("../systems/loggerSystem");

class KnowledgeRepository {

  normalizeRows(result) {

    if (!result) return [];

    if (Array.isArray(result)) return result;

    if (Array.isArray(result.rows)) return result.rows;

    return [];
  }

  formatEmbedding(embedding) {

    if (!embedding) return null;

    if (Array.isArray(embedding)) {
      return `[${embedding.join(",")}]`; // ✅ FIX
    }

    return embedding;
  }

  async createKnowledge(data) {

    try {

      if (!data) return null;
      if (!data.content) return null;

      const query = `
        INSERT INTO ai_knowledge
        (user_id, content, source, embedding, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id, user_id, content, source, created_at;
      `;

      const values = [
        data.userId ? String(data.userId) : null,
        String(data.content),
        data.source ? String(data.source) : "unknown",
        this.formatEmbedding(data.embedding) // ✅ FIX
      ];

      const result = await databaseSystem.query(query, values);
      const rows = this.normalizeRows(result);

      if (!rows.length) return null;

      return rows[0];

    } catch (error) {

      logger.error("KNOWLEDGE_REPOSITORY_CREATE_FAILED", {
        error: error.message
      });

      return null;

    }

  }

  async findSimilarContent(content) {

    try {

      if (!content) return null;

      const query = `
        SELECT id, content
        FROM ai_knowledge
        WHERE content ILIKE $1
        LIMIT 1;
      `;

      const values = [`%${content}%`];

      const result = await databaseSystem.query(query, values);

      const rows = this.normalizeRows(result);

      if (!rows.length) return null;

      return rows[0];

    } catch (error) {

      logger.error("KNOWLEDGE_REPOSITORY_SIMILAR_SEARCH_FAILED", {
        error: error.message
      });

      return null;

    }

  }

  async searchKnowledge(queryText, limit = 5) {

    try {

      if (!queryText) return [];

      const safeLimit = Math.min(Math.max(parseInt(limit) || 5, 1), 50);

      const query = `
        SELECT
          id,
          user_id,
          content,
          source,
          created_at
        FROM ai_knowledge
        WHERE content ILIKE $1
        ORDER BY created_at DESC
        LIMIT $2;
      `;

      const values = [`%${queryText}%`, safeLimit];

      const result = await databaseSystem.query(query, values);

      return this.normalizeRows(result);

    } catch (error) {

      logger.error("KNOWLEDGE_REPOSITORY_SEARCH_FAILED", {
        error: error.message
      });

      return [];

    }

  }

  async searchKnowledgeByEmbedding(embedding, limit = 5) {

    try {

      if (!embedding) return [];

      const safeLimit = Math.min(Math.max(parseInt(limit) || 5, 1), 50);

      const vector = this.formatEmbedding(embedding); // ✅ FIX

      const query = `
        SELECT
          id,
          user_id,
          content,
          source,
          created_at,
          embedding <-> $1 AS distance
        FROM ai_knowledge
        WHERE embedding IS NOT NULL
        ORDER BY embedding <-> $1
        LIMIT $2;
      `;

      const values = [vector, safeLimit];

      const result = await databaseSystem.query(query, values);

      return this.normalizeRows(result);

    } catch (error) {

      logger.error("KNOWLEDGE_REPOSITORY_VECTOR_SEARCH_FAILED", {
        error: error.message
      });

      return [];

    }

  }

  async getRecentKnowledge(limit = 10) {

    try {

      const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

      const query = `
        SELECT
          id,
          user_id,
          content,
          source,
          created_at
        FROM ai_knowledge
        ORDER BY created_at DESC
        LIMIT $1;
      `;

      const result = await databaseSystem.query(query, [safeLimit]);

      return this.normalizeRows(result);

    } catch (error) {

      logger.error("KNOWLEDGE_REPOSITORY_GET_RECENT_FAILED", {
        error: error.message
      });

      return [];

    }

  }

  async deleteKnowledge(id) {

    try {

      if (!id) return false;

      const query = `
        DELETE FROM ai_knowledge
        WHERE id = $1;
      `;

      await databaseSystem.query(query, [id]);

      return true;

    } catch (error) {

      logger.error("KNOWLEDGE_REPOSITORY_DELETE_FAILED", {
        error: error.message
      });

      return false;

    }

  }

}

module.exports = new KnowledgeRepository();