const { Pool } = require("pg");
const logger = require("../systems/loggerSystem");

let pool = null;
let dbConfig = null;

/**
 * يقرأ الإعدادات من المتغيرات المنفصلة DB_HOST/DB_USER/...
 * مع fallback لـ DATABASE_URL.
 */
function resolveConfig(connectionString) {
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

/**
 * يبني pool جديد. يُستدعى عند الـ init وعند الحاجة لإعادة بناء.
 */
function buildPool() {
    const newPool = new Pool({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        ssl: { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 5000,
        connectionTimeoutMillis: 10000,
        keepAlive: false,
        application_name: "lyn-bot"
    });

    newPool.on("error", (err) => {
        logger.error("DATABASE_POOL_ERROR", {
            error: err.message
        });
        // ما نسوي شي إضافي - الـ pool يدير نفسه
    });

    return newPool;
}

function initDatabase(connectionString) {

    if (pool) {
        return pool;
    }

    dbConfig = resolveConfig(connectionString);
    pool = buildPool();

    logger.info("DATABASE_POOL_INITIALIZED", {
        host: dbConfig.host,
        user: dbConfig.user,
        database: dbConfig.database,
        port: dbConfig.port,
        source: dbConfig.source
    });

    return pool;
}

/**
 * تنفيذ query - مع إعادة محاولة واحدة لو فشل بسبب auth/connection
 */
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
        const isAuthError = /password authentication failed|SASL/i.test(error.message);
        const isConnError = /ECONNRESET|ETIMEDOUT|Connection terminated/i.test(error.message);

        // لو الخطأ auth أو connection، نعيد بناء الـ pool ونحاول مرة وحدة
        if (isAuthError || isConnError) {
            logger.warn("DATABASE_REBUILDING_POOL", { reason: error.message });

            try {
                const oldPool = pool;
                pool = buildPool();
                // نقفل القديم بالخلفية
                oldPool.end().catch(() => {});

                // نحاول الـ query مرة أخيرة على pool الجديد
                const retryResult = await pool.query(text, params);
                return retryResult;
            } catch (retryError) {
                logger.error("DATABASE_QUERY_FAILED", {
                    error: retryError.message,
                    sql: typeof text === "string" ? text.slice(0, 200) : "invalid"
                });
                throw retryError;
            }
        }

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