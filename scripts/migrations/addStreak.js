const databaseSystem = require("../../systems/databaseSystem");
const logger = require("../../systems/loggerSystem");

async function addStreakMigration() {
    try {
        // ✅ إضافة عمود streak إذا مو موجود
        await databaseSystem.query(`
            ALTER TABLE economy_users
            ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0
        `);

        // ✅ إضافة عمود streak_last_day — آخر يوم استلم فيه (للتحقق من الانقطاع)
        await databaseSystem.query(`
            ALTER TABLE economy_users
            ADD COLUMN IF NOT EXISTS streak_last_day BIGINT DEFAULT 0
        `);

        logger.info("MIGRATION_STREAK_SUCCESS");

    } catch (error) {
        logger.error("MIGRATION_STREAK_FAILED", { error: error.message });
        throw error;
    }
}

module.exports = addStreakMigration;