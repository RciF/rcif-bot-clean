const databaseSystem = require("./databaseSystem");
const logger = require("./loggerSystem");

async function getDatabaseStats() {

    try {

        const users = await databaseSystem.query("SELECT COUNT(*) FROM users");
        const guilds = await databaseSystem.query("SELECT COUNT(*) FROM guilds");
        const xp = await databaseSystem.query("SELECT COUNT(*) FROM xp");
        const warnings = await databaseSystem.query("SELECT COUNT(*) FROM warnings");

        return {
            users: users.rows[0]?.count || 0,
            guilds: guilds.rows[0]?.count || 0,
            xpRecords: xp.rows[0]?.count || 0,
            warnings: warnings.rows[0]?.count || 0
        };

    } catch (error) {

        logger.error("DATABASE_STATS_FAILED", {
            error: error.message
        });

        return null;

    }
}

module.exports = {
    getDatabaseStats
};