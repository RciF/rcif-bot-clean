const databaseManager = require("../utils/databaseManager");
const logger = require("./loggerSystem");

/**
 * Normalize result
 */
function normalizeResult(result) {
  if (!result) return { rows: [] };
  if (!Array.isArray(result.rows)) result.rows = [];
  return result;
}

/**
 * Core query
 */
async function query(sql, params = [], options = {}) {
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

    // 🔥 slow query tracking
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

    return normalizeResult(result);

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
 * Return single row
 */
async function queryOne(sql, params = []) {
  const result = await query(sql, params);
  return result.rows[0] || null;
}

/**
 * Return multiple rows
 */
async function queryMany(sql, params = []) {
  const result = await query(sql, params);
  return result.rows;
}

/**
 * Execute without caring result
 */
async function execute(sql, params = []) {
  await query(sql, params);
  return true;
}

/**
 * Transaction (SAFE)
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
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        logger.error("DATABASE_ROLLBACK_FAILED", {
          error: rollbackError.message
        });
      }
    }

    logger.error("DATABASE_TRANSACTION_FAILED", {
      error: error.message
    });

    throw error;

  } finally {

    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        logger.error("DATABASE_RELEASE_FAILED", {
          error: releaseError.message
        });
      }
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
 * Basic stats
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
  query, queryOne, queryMany, execute, transaction, batch, ping, stats
};