const { Pool } = require("pg");
const logger = require("../systems/loggerSystem");

let pool = null;

/**
 * يحاول قراءة المتغيرات المنفصلة DB_HOST/DB_USER/...
 * وإذا ما لقيها يفكّك DATABASE_URL.
 *
 * المتغيرات المنفصلة أأمن مع Supabase Pooler لأن pg
 * أحياناً يخسر الباسوورد عند reconnect لو جاي من URL.
 */
function resolveConfig(connectionString) {
    // أولاً جرّب المتغيرات المنفصلة
    const sepHost = process.env.DB_HOST;
    const sepUser = process.env.DB_USER;
    const sepPass = process.env.DB_PASSWORD;

    if (sepHost && sepUser && sepPass) {
        return {
            host: sepHost,
            port: parseInt(process.env.DB_PORT || "5432", 10),
            user: sepUser,
            password: String(sepPass),
            database: process.env.DB_NAME || "postgres",
            source: "env_vars"
        };
    }

    // fallback: فكّك DATABASE_URL
    if (!connectionString) {
        throw new Error("DATABASE_CONNECTION_STRING_MISSING");
    }

    try {
        const url = new URL(connectionString);
        return {
            user: decodeURIComponent(url.username),
            password: String(decodeURIComponent(url.password)),
            host: url.hostname,
            port: parseInt(url.port || "5432", 10),
            database: url.pathname.replace(/^\//, "") || "postgres",
            source: "url"
        };
    } catch (err) {
        logger.error("DATABASE_URL_PARSE_FAILED", { error: err.message });
        throw err;
    }
}

function initDatabase(connectionString) {

    if (pool) {
        return pool;
    }

    const config = resolveConfig(connectionString);

    pool = new Pool({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 10000,
        keepAlive: true,
        application_name: "lyn-bot"
    });

    pool.on("error", (err) => {
        logger.error("DATABASE_POOL_ERROR", {
            error: err.message
        });
    });

    logger.info("DATABASE_POOL_INITIALIZED", {
        host: config.host,
        user: config.user,
        database: config.database,
        port: config.port,
        source: config.source
    });

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