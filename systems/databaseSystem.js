const databaseManager = require("../utils/databaseManager");
const logger = require("./loggerSystem");

/**
 * Core database query wrapper (Enhanced)
 */
async function query(sql, params = []) {
  try {

    if (!sql) {
      throw new Error("SQL query is required");
    }

    if (!Array.isArray(params)) {
      params = [];
    }

    const start = Date.now();

    const result = await databaseManager.query(sql, params);

    const duration = Date.now() - start;

    // ✅ NEW — slow + very slow detection
    if (duration > 300) {
      logger.warn("DATABASE_SLOW_QUERY", {
        duration,
        sql: sql.slice(0, 120)
      });
    }

    if (duration > 1000) {
      logger.error("DATABASE_VERY_SLOW_QUERY", {
        duration,
        sql: sql.slice(0, 200)
      });
    }

    if (!result) {
      return { rows: [] };
    }

    if (!Array.isArray(result.rows)) {
      result.rows = [];
    }

    return result;

  } catch (error) {

    logger.error("DATABASE_QUERY_FAILED", {
      error: error.message,
      sql: typeof sql === "string" ? sql.slice(0, 200) : "invalid",
      paramsCount: Array.isArray(params) ? params.length : 0
    });

    throw error;
  }
}

/**
 * Return first row or null
 */
async function queryOne(sql, params = []) {
  const result = await query(sql, params);
  return result.rows.length ? result.rows[0] : null;
}

/**
 * Return rows only
 */
async function queryMany(sql, params = []) {
  const result = await query(sql, params);
  return result.rows || [];
}

/**
 * Execute query without caring about result
 */
async function execute(sql, params = []) {
  await query(sql, params);
  return true;
}

/**
 * Transaction wrapper
 */
async function transaction(callback) {
  let client;

  try {

    client = await databaseManager.getClient();

    await client.query("BEGIN");

    const result = await callback(client);

    await client.query("COMMIT");

    return result;

  } catch (error) {

    if (client) {
      await client.query("ROLLBACK");
    }

    logger.error("DATABASE_TRANSACTION_FAILED", {
      error: error.message
    });

    throw error;

  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Batch execution
 */
async function batch(queries = []) {

  if (!Array.isArray(queries) || !queries.length) return [];

  return await transaction(async (client) => {

    const results = [];

    for (const q of queries) {

      if (!q?.sql) continue;

      const res = await client.query(q.sql, q.params || []);
      results.push(res.rows || []);
    }

    return results;
  });
}

/**
 * Health check
 */
async function ping() {
  try {
    await query("SELECT 1");
    return true;
  } catch (error) {
    logger.error("DATABASE_PING_FAILED", {
      error: error.message
    });
    return false;
  }
}

/**
 * Stats (basic)
 */
async function stats() {
  try {

    const res = await query("SELECT NOW() as time");

    return {
      connected: true,
      time: res.rows[0]?.time || null
    };

  } catch (error) {

    return {
      connected: false,
      error: error.message
    };
  }
}

module.exports = {
  query,
  queryOne,
  queryMany,
  execute,
  transaction,
  batch,
  ping,
  stats
};