const { Pool } = require("pg");
const logger = require("../systems/loggerSystem");

let pool = null;

function initDatabase(connectionString) {

    if (!connectionString) {
        throw new Error("DATABASE_CONNECTION_STRING_MISSING");
    }

    if (pool) {
        return pool;
    }

    pool = new Pool({
        connectionString,
        max: 15,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
    });

    pool.on("error", (err) => {
        logger.error("DATABASE_POOL_ERROR", {
            error: err.message
        });
    });

    logger.info("DATABASE_POOL_INITIALIZED");

    return pool;
}

async function query(text, params = []) {

    if (!pool) {
        throw new Error("DATABASE_NOT_INITIALIZED");
    }

    const start = Date.now();

    try {

        const result = await pool.query(text, params);

        const duration = Date.now() - start;

        // 🔥 slow query tracking
        if (duration > 300) {
            logger.warn("DATABASE_SLOW_QUERY", {
                duration,
                sql: typeof text === "string" ? text.slice(0, 120) : "invalid"
            });
        }

        return result;

    } catch (error) {

        logger.error("DATABASE_QUERY_FAILED", {
            error: error.message,
            sql: typeof text === "string" ? text.slice(0, 200) : "invalid"
        });

        throw error;
    }

}

async function getClient() {

    if (!pool) {
        throw new Error("DATABASE_NOT_INITIALIZED");
    }

    return await pool.connect();
}

async function testConnection() {

    if (!pool) {
        throw new Error("DATABASE_NOT_INITIALIZED");
    }

    try {

        const result = await pool.query("SELECT NOW()");
        return result.rows[0];

    } catch (error) {

        logger.error("DATABASE_CONNECTION_TEST_FAILED", {
            error: error.message
        });

        throw error;

    }

}

async function stats() {

    if (!pool) {
        return { initialized: false };
    }

    return {
        initialized: true,
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
    };
}

async function close() {

    if (!pool) return;

    try {

        await pool.end();
        pool = null;

        logger.info("DATABASE_POOL_CLOSED");

    } catch (error) {

        logger.error("DATABASE_CLOSE_FAILED", {
            error: error.message
        });

        throw error;

    }

}

function getPool() {
    return pool;
}

module.exports = {
    initDatabase,
    query,
    getClient,
    testConnection,
    stats,
    close,
    getPool
};