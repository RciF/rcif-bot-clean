const databaseSystem = require("../systems/databaseSystem");
const logger = require("../systems/loggerSystem");

class KnowledgeRepository {

  normalizeRows(result) {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result.rows)) return result.rows;
    return [];
  }

  sanitize(text) {
    if (!text) return "";
    return String(text)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2000);
  }

  safeLimit(limit, def = 5, max = 100) {
    return Math.min(Math.max(parseInt(limit) || def, 1), max);
  }

  formatEmbedding(embedding) {
    if (!embedding) return null;
    if (Array.isArray(embedding)) {
      return `[${embedding.join(",")}]`;
    }
    return embedding;
  }

  async existsSimilar(content) {
    try {
      const query = `
        SELECT id FROM ai_knowledge
        WHERE LOWER(content) = $1
        LIMIT 1;
      `;

      const result = await databaseSystem.query(query, [
        this.sanitize(content).toLowerCase()
      ]);

      const rows = this.normalizeRows(result);
      return rows.length > 0;

    } catch (error) {
      logger.error("KNOWLEDGE_REPOSITORY_EXISTS_FAILED", {
        error: error.message
      });
      return false;
    }
  }

  async createKnowledge(data) {
    try {

      if (!data?.content) return null;

      const content = this.sanitize(data.content);
      if (!content) return null;

      const exists = await this.existsSimilar(content);
      if (exists) return null;

      const query = `
        INSERT INTO ai_knowledge
        (user_id, content, source, embedding, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id, user_id, content, source, created_at;
      `;

      const values = [
        data.userId ? String(data.userId) : null,
        content,
        data.source ? String(data.source) : "unknown",
        this.formatEmbedding(data.embedding)
      ];

      const result = await databaseSystem.query(query, values);
      const rows = this.normalizeRows(result);

      return rows[0] || null;

    } catch (error) {

      logger.error("KNOWLEDGE_REPOSITORY_CREATE_FAILED", {
        error: error.message
      });

      return null;
    }
  }

  async bulkCreate(list = []) {
    try {

      if (!Array.isArray(list) || !list.length) return [];

      const values = [];
      const placeholders = [];

      let index = 0;

      for (const item of list) {

        const clean = this.sanitize(item.content);
        if (!clean) continue;

        const base = index * 4;

        placeholders.push(`($${base+1}, $${base+2}, $${base+3}, $${base+4}, NOW())`);

        values.push(
          item.userId ? String(item.userId) : null,
          clean,
          item.source || "bulk",
          this.formatEmbedding(item.embedding)
        );

        index++;
      }

      if (!placeholders.length) return [];

      const query = `
        INSERT INTO ai_knowledge
        (user_id, content, source, embedding, created_at)
        VALUES ${placeholders.join(",")}
        RETURNING id;
      `;

      const result = await databaseSystem.query(query, values);
      return this.normalizeRows(result);

    } catch (error) {

      logger.error("KNOWLEDGE_REPOSITORY_BULK_CREATE_FAILED", {
        error: error.message
      });

      return [];
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

      const values = [`%${this.sanitize(content)}%`];

      const result = await databaseSystem.query(query, values);
      const rows = this.normalizeRows(result);

      return rows[0] || null;

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

      const query = `
        SELECT id, user_id, content, source, created_at
        FROM ai_knowledge
        WHERE content ILIKE $1
        ORDER BY created_at DESC
        LIMIT $2;
      `;

      const result = await databaseSystem.query(query, [
        `%${this.sanitize(queryText)}%`,
        this.safeLimit(limit)
      ]);

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

      const vector = this.formatEmbedding(embedding);

      const query = `
        SELECT
          id,
          user_id,
          content,
          source,
          created_at,
          1 - (embedding <-> $1) AS similarity
        FROM ai_knowledge
        WHERE embedding IS NOT NULL
        ORDER BY embedding <-> $1
        LIMIT $2;
      `;

      const result = await databaseSystem.query(query, [
        vector,
        this.safeLimit(limit)
      ]);

      return this.normalizeRows(result);

    } catch (error) {

      logger.error("KNOWLEDGE_REPOSITORY_VECTOR_SEARCH_FAILED", {
        error: error.message
      });

      return [];
    }
  }

  async countKnowledge() {
    try {

      const query = `
        SELECT COUNT(*) as count
        FROM ai_knowledge;
      `;

      const result = await databaseSystem.query(query);
      const rows = this.normalizeRows(result);

      return Number(rows[0]?.count || 0);

    } catch (error) {

      logger.error("KNOWLEDGE_REPOSITORY_COUNT_FAILED", {
        error: error.message
      });

      return 0;
    }
  }

  async getRecentKnowledge(limit = 10) {
    try {

      const query = `
        SELECT id, user_id, content, source, created_at
        FROM ai_knowledge
        ORDER BY created_at DESC
        LIMIT $1;
      `;

      const result = await databaseSystem.query(query, [
        this.safeLimit(limit, 10)
      ]);

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

  async clearAllKnowledge() {
    try {

      await databaseSystem.query(`DELETE FROM ai_knowledge;`);
      return true;

    } catch (error) {

      logger.error("KNOWLEDGE_REPOSITORY_CLEAR_FAILED", {
        error: error.message
      });

      return false;
    }
  }

}

module.exports = new KnowledgeRepository();