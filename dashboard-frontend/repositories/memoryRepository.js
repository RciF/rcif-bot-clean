const databaseSystem = require("../systems/databaseSystem");
const logger = require("../systems/loggerSystem");

class MemoryRepository {

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
      .slice(0, 500);
  }

  safeLimit(limit, def = 50) {
    return Math.min(Math.max(parseInt(limit) || def, 1), 200);
  }

  // ✅ NEW — prevent duplicate insert (lightweight)
  async existsSimilar(userId, memoryText) {
    try {
      const query = `
        SELECT id FROM memories
        WHERE user_id = $1
        AND LOWER(memory) = $2
        LIMIT 1
      `;
      const result = await databaseSystem.query(query, [
        String(userId),
        memoryText.toLowerCase()
      ]);

      const rows = this.normalizeRows(result);
      return rows.length > 0;

    } catch (error) {
      logger.error("MEMORY_REPOSITORY_EXISTS_FAILED", {
        error: error.message
      });
      return false;
    }
  }

  async createMemory(memory) {
    try {

      if (!memory?.userId || !memory?.type || !memory?.memory) return null;

      const cleanMemory = this.sanitize(memory.memory);
      if (!cleanMemory) return null;

      // ✅ NEW — duplicate protection
      const exists = await this.existsSimilar(memory.userId, cleanMemory);
      if (exists) return null;

      const query = `
        INSERT INTO memories (user_id, type, memory, created_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id, user_id, type, memory, created_at
      `;

      const values = [
        String(memory.userId),
        String(memory.type),
        cleanMemory,
        memory.createdAt ? Number(memory.createdAt) : Date.now()
      ];

      const result = await databaseSystem.query(query, values);
      const rows = this.normalizeRows(result);

      return rows[0] || null;

    } catch (error) {

      logger.error("MEMORY_REPOSITORY_CREATE_FAILED", {
        error: error.message
      });

      return null;
    }
  }

  async bulkCreate(memories = []) {
    try {

      if (!Array.isArray(memories) || !memories.length) return [];

      const values = [];
      const placeholders = [];

      memories.forEach((m, i) => {
        const base = i * 4;

        const clean = this.sanitize(m.memory);
        if (!clean) return;

        placeholders.push(`($${base+1}, $${base+2}, $${base+3}, $${base+4})`);

        values.push(
          String(m.userId),
          String(m.type),
          clean,
          m.createdAt ? Number(m.createdAt) : Date.now()
        );
      });

      if (!placeholders.length) return [];

      const query = `
        INSERT INTO memories (user_id, type, memory, created_at)
        VALUES ${placeholders.join(",")}
        RETURNING id
      `;

      const result = await databaseSystem.query(query, values);
      return this.normalizeRows(result);

    } catch (error) {

      logger.error("MEMORY_REPOSITORY_BULK_CREATE_FAILED", {
        error: error.message
      });

      return [];
    }
  }

  async getUserMemories(userId, limit = 50) {
    try {

      if (!userId) return [];

      const query = `
        SELECT id, user_id, type, memory, created_at
        FROM memories
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await databaseSystem.query(query, [
        String(userId),
        this.safeLimit(limit)
      ]);

      return this.normalizeRows(result);

    } catch (error) {

      logger.error("MEMORY_REPOSITORY_GET_USER_MEMORIES_FAILED", {
        error: error.message
      });

      return [];
    }
  }

  async searchUserMemories(userId, keyword, limit = 20) {
    try {

      if (!userId || !keyword) return [];

      const query = `
        SELECT id, user_id, type, memory, created_at
        FROM memories
        WHERE user_id = $1
        AND LOWER(memory) LIKE $2
        ORDER BY created_at DESC
        LIMIT $3
      `;

      const result = await databaseSystem.query(query, [
        String(userId),
        `%${keyword.toLowerCase()}%`,
        this.safeLimit(limit, 20)
      ]);

      return this.normalizeRows(result);

    } catch (error) {

      logger.error("MEMORY_REPOSITORY_SEARCH_FAILED", {
        error: error.message
      });

      return [];
    }
  }

  async getServerMemories(limit = 20) {
    try {

      const query = `
        SELECT id, user_id, type, memory, created_at
        FROM memories
        WHERE type = 'server'
        ORDER BY created_at DESC
        LIMIT $1
      `;

      const result = await databaseSystem.query(query, [
        this.safeLimit(limit, 20)
      ]);

      return this.normalizeRows(result);

    } catch (error) {

      logger.error("MEMORY_REPOSITORY_GET_SERVER_MEMORIES_FAILED", {
        error: error.message
      });

      return [];
    }
  }

  async getMemoriesByType(type, limit = 50) {
    try {

      if (!type) return [];

      const query = `
        SELECT id, user_id, type, memory, created_at
        FROM memories
        WHERE type = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await databaseSystem.query(query, [
        String(type),
        this.safeLimit(limit)
      ]);

      return this.normalizeRows(result);

    } catch (error) {

      logger.error("MEMORY_REPOSITORY_GET_BY_TYPE_FAILED", {
        error: error.message
      });

      return [];
    }
  }

  async countUserMemories(userId) {
    try {

      const query = `
        SELECT COUNT(*) as count
        FROM memories
        WHERE user_id = $1
      `;

      const result = await databaseSystem.query(query, [String(userId)]);
      const rows = this.normalizeRows(result);

      return Number(rows[0]?.count || 0);

    } catch (error) {

      logger.error("MEMORY_REPOSITORY_COUNT_FAILED", {
        error: error.message
      });

      return 0;
    }
  }

  async removeOldestUserMemory(userId) {
    try {

      if (!userId) return false;

      const query = `
        DELETE FROM memories
        WHERE id = (
          SELECT id FROM memories
          WHERE user_id = $1
          ORDER BY created_at ASC
          LIMIT 1
        )
      `;

      await databaseSystem.query(query, [String(userId)]);
      return true;

    } catch (error) {

      logger.error("MEMORY_REPOSITORY_REMOVE_OLDEST_USER_MEMORY_FAILED", {
        error: error.message
      });

      return false;
    }
  }

  async removeOldestServerMemory() {
    try {

      const query = `
        DELETE FROM memories
        WHERE id = (
          SELECT id FROM memories
          WHERE type = 'server'
          ORDER BY created_at ASC
          LIMIT 1
        )
      `;

      await databaseSystem.query(query);
      return true;

    } catch (error) {

      logger.error("MEMORY_REPOSITORY_REMOVE_OLDEST_SERVER_MEMORY_FAILED", {
        error: error.message
      });

      return false;
    }
  }

  async deleteMemory(memoryId) {
    try {

      if (!memoryId) return false;

      const query = `
        DELETE FROM memories
        WHERE id = $1
      `;

      await databaseSystem.query(query, [memoryId]);
      return true;

    } catch (error) {

      logger.error("MEMORY_REPOSITORY_DELETE_MEMORY_FAILED", {
        error: error.message
      });

      return false;
    }
  }

  async clearUserMemories(userId) {
    try {

      if (!userId) return false;

      const query = `
        DELETE FROM memories
        WHERE user_id = $1
      `;

      await databaseSystem.query(query, [String(userId)]);
      return true;

    } catch (error) {

      logger.error("MEMORY_REPOSITORY_CLEAR_USER_FAILED", {
        error: error.message
      });

      return false;
    }
  }

}

module.exports = new MemoryRepository();