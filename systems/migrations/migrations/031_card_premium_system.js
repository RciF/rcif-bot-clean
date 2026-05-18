// ══════════════════════════════════════════════════════════════════
//  Migration 031 — Card Premium System
//  المسار: systems/migrations/migrations/031_card_premium_system.js
//
//  نظام تخصيص البطاقة الأسطوري — 3 فئات (basic/advanced/legendary)
//
//  4 جداول جديدة:
//   1. card_subscriptions          : اشتراكات تخصيص البطاقة (منفصل عن البوت)
//   2. card_subscription_requests  : طلبات الاشتراك المنتظرة المراجعة
//   3. card_settings               : إعدادات البطاقة لكل مستخدم (موسّع)
//   4. card_subscription_logs      : سجل الأحداث (تمديد/هدية/ترقية)
//
//  ⚠️ آمن للسيرفرات القديمة:
//      - CREATE TABLE IF NOT EXISTS لا يكسر شي
//      - الجدول القديم card_customization يبقى موجود (للتوافق)
//
//  ✅ ترحيل البيانات القديمة:
//      - أي مستخدم في user_premium القديم → ينتقل لـ card_subscriptions كـ 'advanced'
//      - أي مستخدم في card_customization → ينتقل لـ card_settings
// ══════════════════════════════════════════════════════════════════

module.exports = async function (db) {
  // ──────────────────────────────────────────────────────────
  //  1. card_subscriptions
  //  اشتراك مستخدم واحد لـ tier واحد فقط (active)
  // ──────────────────────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS card_subscriptions (
      id            SERIAL PRIMARY KEY,
      user_id       TEXT NOT NULL UNIQUE,
      tier          TEXT NOT NULL DEFAULT 'basic',
      status        TEXT NOT NULL DEFAULT 'active',
      duration      TEXT,
      started_at    TIMESTAMP DEFAULT NOW(),
      expires_at    TIMESTAMP NOT NULL,
      is_gift       BOOLEAN DEFAULT FALSE,
      gifted_by     TEXT,
      gift_reason   TEXT,
      auto_renew    BOOLEAN DEFAULT FALSE,
      created_at    TIMESTAMP DEFAULT NOW(),
      updated_at    TIMESTAMP DEFAULT NOW()
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_card_subs_status
    ON card_subscriptions (status, expires_at);
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_card_subs_user
    ON card_subscriptions (user_id);
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_card_subs_tier
    ON card_subscriptions (tier, status);
  `)

  // ──────────────────────────────────────────────────────────
  //  2. card_subscription_requests
  //  طلبات شراء/تجديد الاشتراك بانتظار موافقة الأدمن
  // ──────────────────────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS card_subscription_requests (
      id                 SERIAL PRIMARY KEY,
      user_id            TEXT NOT NULL,
      username           TEXT,
      avatar_url         TEXT,
      tier               TEXT NOT NULL,
      duration           TEXT NOT NULL DEFAULT 'monthly',
      amount             NUMERIC(10,2) NOT NULL,
      currency           TEXT DEFAULT 'USD',
      payment_method     TEXT DEFAULT 'bank_transfer',
      payment_proof_url  TEXT,
      ref_number         TEXT,
      user_notes         TEXT,
      status             TEXT NOT NULL DEFAULT 'pending',
      admin_note         TEXT,
      reviewed_by        TEXT,
      reviewed_at        TIMESTAMP,
      created_at         TIMESTAMP DEFAULT NOW()
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_card_requests_status
    ON card_subscription_requests (status, created_at DESC);
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_card_requests_user
    ON card_subscription_requests (user_id, created_at DESC);
  `)

  // ──────────────────────────────────────────────────────────
  //  3. card_settings
  //  إعدادات البطاقة لكل مستخدم (موسّع من card_customization القديم)
  //
  //  الفرق عن card_customization القديم:
  //   - background_id  : ID خلفية من المكتبة (مثل 'gaming_1')
  //   - custom_background_url : رابط الخلفية المرفوعة
  //   - theme_id       : ID ثيم من المكتبة (مثل 'sunset')
  //   - custom_colors  : JSONB ألوان مخصصة (accent, bg, text)
  //   - badges         : JSONB array من الـ badge IDs المفعّلة
  //   - effects        : JSONB object من التأثيرات (glow, gradient, etc)
  //   - border_style   : ID نمط الإطار
  // ──────────────────────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS card_settings (
      user_id                TEXT PRIMARY KEY,
      background_id          TEXT DEFAULT 'default',
      custom_background_url  TEXT,
      theme_id               TEXT DEFAULT 'amber',
      custom_colors          JSONB DEFAULT '{}'::jsonb,
      badges                 JSONB DEFAULT '[]'::jsonb,
      effects                JSONB DEFAULT '{}'::jsonb,
      border_style           TEXT DEFAULT 'default',
      avatar_url             TEXT,
      updated_at             TIMESTAMP DEFAULT NOW()
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_card_settings_user
    ON card_settings (user_id);
  `)

  // ──────────────────────────────────────────────────────────
  //  4. card_subscription_logs
  //  سجل كل أحداث الاشتراك (للأدمن + للإشعارات)
  //
  //  action types:
  //   - 'created'   : اشتراك جديد
  //   - 'renewed'   : تجديد
  //   - 'extended'  : تمديد يدوي من الأدمن
  //   - 'gifted'    : هدية من الأدمن
  //   - 'upgraded'  : ترقية فئة
  //   - 'downgraded': تخفيض فئة
  //   - 'cancelled' : إلغاء
  //   - 'expired'   : انتهاء طبيعي
  //   - 'reactivated': إعادة تفعيل
  // ──────────────────────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS card_subscription_logs (
      id                  SERIAL PRIMARY KEY,
      user_id             TEXT NOT NULL,
      action              TEXT NOT NULL,
      days_added          INTEGER,
      old_tier            TEXT,
      new_tier            TEXT,
      old_expires_at      TIMESTAMP,
      new_expires_at      TIMESTAMP,
      reason              TEXT,
      admin_id            TEXT,
      metadata            JSONB DEFAULT '{}'::jsonb,
      notification_sent   BOOLEAN DEFAULT FALSE,
      notification_sent_at TIMESTAMP,
      created_at          TIMESTAMP DEFAULT NOW()
    );
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_card_logs_user
    ON card_subscription_logs (user_id, created_at DESC);
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_card_logs_action
    ON card_subscription_logs (action, created_at DESC);
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_card_logs_pending_notifications
    ON card_subscription_logs (notification_sent, created_at)
    WHERE notification_sent = FALSE;
  `)

  // ──────────────────────────────────────────────────────────
  //  5. ترحيل البيانات القديمة من user_premium → card_subscriptions
  //  أي مستخدم Premium قديم يصير 'advanced' (الفئة الوسطى)
  // ──────────────────────────────────────────────────────────
  await db.query(`
    INSERT INTO card_subscriptions (user_id, tier, status, started_at, expires_at, gift_reason)
    SELECT
      up.user_id,
      'advanced' AS tier,
      CASE
        WHEN up.expires_at IS NULL OR up.expires_at > NOW() THEN 'active'
        ELSE 'expired'
      END AS status,
      COALESCE(up.activated_at, NOW()) AS started_at,
      COALESCE(up.expires_at, NOW() + INTERVAL '30 days') AS expires_at,
      'Migrated from legacy user_premium' AS gift_reason
    FROM user_premium up
    WHERE NOT EXISTS (
      SELECT 1 FROM card_subscriptions cs WHERE cs.user_id = up.user_id
    );
  `)

  // ──────────────────────────────────────────────────────────
  //  6. ترحيل البيانات القديمة من card_customization → card_settings
  //  نحافظ على theme_color → theme_id و background_url → custom_background_url
  // ──────────────────────────────────────────────────────────
  await db.query(`
    INSERT INTO card_settings (
      user_id,
      theme_id,
      custom_background_url,
      avatar_url,
      updated_at
    )
    SELECT
      cc.user_id,
      COALESCE(cc.theme_color, 'amber') AS theme_id,
      cc.background_url AS custom_background_url,
      cc.avatar_url,
      COALESCE(cc.updated_at, NOW()) AS updated_at
    FROM card_customization cc
    WHERE NOT EXISTS (
      SELECT 1 FROM card_settings cs WHERE cs.user_id = cc.user_id
    );
  `)

  // ──────────────────────────────────────────────────────────
  //  7. سجل migration للترحيلات اللي صارت
  // ──────────────────────────────────────────────────────────
  const migratedSubs = await db.query(`
    SELECT COUNT(*) AS cnt FROM card_subscriptions
    WHERE gift_reason = 'Migrated from legacy user_premium'
  `)
  const migratedSettings = await db.query(`SELECT COUNT(*) AS cnt FROM card_settings`)

  console.log(`   ✓ Migrated ${migratedSubs.rows[0]?.cnt || 0} legacy premium users → card_subscriptions`)
  console.log(`   ✓ Migrated ${migratedSettings.rows[0]?.cnt || 0} customization records → card_settings`)
}