const databaseManager = require("../utils/databaseManager");
const logger = require("./loggerSystem");

/**
 * Core database query wrapper
 */
async function query(sql, params = []) {

    try {

        if (!sql) {
            throw new Error("SQL query is required");
        }

        if (!Array.isArray(params)) {
            params = [];
        }

        const result = await databaseManager.query(sql, params);

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

    if (!result.rows.length) {
        return null;
    }

    return result.rows[0];
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

module.exports = {
    query,
    queryOne,
    queryMany,
    execute,
    ping
};