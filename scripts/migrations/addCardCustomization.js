const databaseSystem = require("../../systems/databaseSystem");
const logger = require("../../systems/loggerSystem");

async function addCardCustomizationMigration() {
  try {

    // ✅ جدول تخصيص البطاقة
    await databaseSystem.query(`
      CREATE TABLE IF NOT EXISTS card_customization (
        user_id        TEXT PRIMARY KEY,
        background_url TEXT,
        theme_color    TEXT DEFAULT 'amber',
        avatar_url     TEXT,
        badge_style    TEXT DEFAULT 'default',
        updated_at     TIMESTAMP DEFAULT NOW()
      )
    `)

    // ✅ جدول Premium الشخصي
    await databaseSystem.query(`
      CREATE TABLE IF NOT EXISTS user_premium (
        user_id      TEXT PRIMARY KEY,
        plan         TEXT DEFAULT 'monthly',
        activated_at TIMESTAMP DEFAULT NOW(),
        expires_at   TIMESTAMP,
        activated_by TEXT,
        notes        TEXT
      )
    `)

    // ✅ Index للأداء
    await databaseSystem.query(`
      CREATE INDEX IF NOT EXISTS idx_user_premium_expires
      ON user_premium (user_id, expires_at)
    `)

    logger.info("MIGRATION_CARD_CUSTOMIZATION_SUCCESS")

  } catch (error) {
    logger.error("MIGRATION_CARD_CUSTOMIZATION_FAILED", { error: error.message })
    throw error
  }
}

module.exports = addCardCustomizationMigration
