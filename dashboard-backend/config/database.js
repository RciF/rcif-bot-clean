/**
 * ═══════════════════════════════════════════════════════════
 *  Database Configuration
 *  PostgreSQL pool + transaction helper + query wrapper
 * ═══════════════════════════════════════════════════════════
 */

const { Pool } = require("pg")
const env = require("./env")

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.IS_PROD ? { rejectUnauthorized: false } : false,
  max: 20,                    // أقصى 20 اتصال متزامن
  idleTimeoutMillis: 30000,   // 30 ثانية قبل قفل الاتصال الخامل
  connectionTimeoutMillis: 5000, // 5 ثواني لمحاولة الاتصال
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
 *
 * @example
 *   await transaction(async (client) => {
 *     await client.query("INSERT INTO ...")
 *     await client.query("UPDATE ...")
 *   })
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
 * إنشاء الجداول الأساسية (لو ما كانت موجودة)
 */
async function initSchema() {
  console.log("🔄 Initializing database schema...")

  // ── الجداول الموجودة (نتركها كما هي للتوافق) ──
  await query(`CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    ai BOOLEAN DEFAULT true,
    xp BOOLEAN DEFAULT true,
    economy BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT NOW()
  )`)

  await query(`CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    plan_id TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'inactive',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`)

  await query(`CREATE TABLE IF NOT EXISTS guild_subscriptions (
    guild_id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    added_at TIMESTAMP DEFAULT NOW()
  )`)
  await query(`CREATE INDEX IF NOT EXISTS idx_guild_sub_owner ON guild_subscriptions(owner_id)`)

  // ── الجداول الجديدة ──

  // Audit Log — يسجل كل تعديل في الداش
  await query(`CREATE TABLE IF NOT EXISTS dashboard_audit_log (
    id SERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT,
    action TEXT NOT NULL,
    target TEXT,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`)
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_guild ON dashboard_audit_log(guild_id, created_at DESC)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_user ON dashboard_audit_log(user_id, created_at DESC)`)

  // Sessions (للـ JWT refresh tokens مستقبلاً)
  await query(`CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP DEFAULT NOW()
  )`)
  await query(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at)`)

  console.log("✅ Database schema ready")
}

module.exports = {
  pool,
  query,
  transaction,
  checkConnection,
  initSchema,
}
