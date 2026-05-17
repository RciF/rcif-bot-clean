// ══════════════════════════════════════════════════════════════════
//  Migration 015 — Backend Tables
//
//  جداول يستخدمها Backend والـ Dashboard:
//   • subscriptions       — اشتراكات المستخدمين (free/silver/gold/diamond)
//   • payment_requests    — طلبات الدفع اليدوية (تحويل بنكي)
//   • guild_subscriptions — ربط السيرفر بالمشترك (سيرفر = اشتراك)
//   • user_sessions       — JWT sessions (للداش)
//   • dashboard_audit_log — سجل تعديلات الداش
// ══════════════════════════════════════════════════════════════════

module.exports = async function (db) {
  // ─────────────────────────────────────────
  //  subscriptions — اشتراكات المستخدمين
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      plan_id TEXT NOT NULL DEFAULT 'free',
      status TEXT NOT NULL DEFAULT 'inactive',
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `)

  // ─────────────────────────────────────────
  //  payment_requests — طلبات الدفع
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS payment_requests (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      ref_number TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      reviewed_at TIMESTAMP
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_payment_status
    ON payment_requests (status, created_at DESC);
  `)

  // ─────────────────────────────────────────
  //  guild_subscriptions — ربط السيرفر
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS guild_subscriptions (
      guild_id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      added_at TIMESTAMP DEFAULT NOW()
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_guild_sub_owner
    ON guild_subscriptions (owner_id);
  `)

  // ─────────────────────────────────────────
  //  user_sessions — JWT sessions
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      user_agent TEXT,
      ip_address TEXT,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      last_used_at TIMESTAMP DEFAULT NOW()
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user
    ON user_sessions (user_id);
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_expires
    ON user_sessions (expires_at);
  `)

  // ─────────────────────────────────────────
  //  dashboard_audit_log — سجل تعديلات الداش
  // ─────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS dashboard_audit_log (
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
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_guild
    ON dashboard_audit_log (guild_id, created_at DESC);
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_user
    ON dashboard_audit_log (user_id, created_at DESC);
  `)
}