/**
 * ═══════════════════════════════════════════════════════════
 *  Database Configuration
 *  PostgreSQL pool + transaction helper + query wrapper
 *
 *  ⚠️ Schema authority الآن في البوت (systems/migrations/)
 *     initSchema() صار no-op — لا تضيف جداول هنا.
 * ═══════════════════════════════════════════════════════════
 */

const { Pool } = require("pg")
const env = require("./env")

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.IS_PROD ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

pool.on("error", (err) => {
  console.error("❌ Unexpected PG pool error:", err.message)
})

pool.on("connect", () => {
  if (!env.IS_PROD) console.log("🔗 New PG connection established")
})

/**
 * Helper: تنفيذ query بسيط
 */
async function query(text, params = []) {
  const start = Date.now()
  try {
    const result = await pool.query(text, params)
    const duration = Date.now() - start
    if (duration > 1000) {
      console.warn(`⚠️  Slow query (${duration}ms): ${text.slice(0, 80)}...`)
    }
    return result
  } catch (err) {
    console.error("❌ Query error:", err.message)
    console.error("   Query:", text.slice(0, 120))
    throw err
  }
}

/**
 * Helper: transaction wrapper
 */
async function transaction(fn) {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const result = await fn(client)
    await client.query("COMMIT")
    return result
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

/**
 * Helper: فحص الاتصال
 */
async function checkConnection() {
  try {
    const r = await pool.query("SELECT NOW() as time")
    return { connected: true, time: r.rows[0].time }
  } catch (err) {
    return { connected: false, error: err.message }
  }
}

/**
 * DEPRECATED — Schema authority انتقل للبوت.
 * هذي الدالة باقية للتوافق فقط.
 */
async function initSchema() {
  console.log("ℹ️  initSchema skipped — schema is managed by the bot")
  return
}

module.exports = {
  pool,
  query,
  transaction,
  checkConnection,
  initSchema,
}