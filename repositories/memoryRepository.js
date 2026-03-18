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

  async createMemory(memory) {

    try {

      if (!memory) return null;
      if (!memory.userId) return null;
      if (!memory.type) return null;
      if (!memory.memory) return null;

      const query = `
        INSERT INTO memories (user_id, type, memory, created_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id, user_id, type, memory, created_at
      `;

      const values = [
        String(memory.userId),
        String(memory.type),
        this.sanitize(memory.memory),
        memory.createdAt ? Number(memory.createdAt) : Date.now() // ✅ FIX
      ];

      const result = await databaseSystem.query(query, values);
      const rows = this.normalizeRows(result);

      if (!rows.length) return null;

      return rows[0];

    } catch (error) {

      logger.error("MEMORY_REPOSITORY_CREATE_FAILED", {
        error: error.message
      });

      return null;

    }

  }

  async getUserMemories(userId, limit = 50) {

    try {

      if (!userId) return [];

      const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);

      const query = `
        SELECT
          id,
          user_id,
          type,
          memory,
          created_at
        FROM memories
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await databaseSystem.query(query, [
        String(userId),
        safeLimit
      ]);

      return this.normalizeRows(result);

    } catch (error) {

      logger.error("MEMORY_REPOSITORY_GET_USER_MEMORIES_FAILED", {
        error: error.message
      });

      return [];

    }

  }

  async getServerMemories(limit = 20) {

    try {

      const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 200);

      const query = `
        SELECT
          id,
          user_id,
          type,
          memory,
          created_at
        FROM memories
        WHERE type = 'server'
        ORDER BY created_at DESC
        LIMIT $1
      `;

      const result = await databaseSystem.query(query, [safeLimit]);

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

      const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);

      const query = `
        SELECT
          id,
          user_id,
          type,
          memory,
          created_at
        FROM memories
        WHERE type = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await databaseSystem.query(query, [
        String(type),
        safeLimit
      ]);

      return this.normalizeRows(result);

    } catch (error) {

      logger.error("MEMORY_REPOSITORY_GET_BY_TYPE_FAILED", {
        error: error.message
      });

      return [];

    }

  }

  async removeOldestUserMemory(userId) {

    try {

      if (!userId) return false;

      const query = `
        DELETE FROM memories
        WHERE id = (
          SELECT id
          FROM memories
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
          SELECT id
          FROM memories
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

}

module.exports = new MemoryRepository();