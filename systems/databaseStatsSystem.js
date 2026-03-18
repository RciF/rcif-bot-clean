const databaseSystem = require("./databaseSystem");
const logger = require("../utils/logger");

async function getDatabaseStats() {

    try {

        const users = await databaseSystem.query("SELECT COUNT(*) FROM users");
        const guilds = await databaseSystem.query("SELECT COUNT(*) FROM guilds");
        const xp = await databaseSystem.query("SELECT COUNT(*) FROM xp");
        const warnings = await databaseSystem.query("SELECT COUNT(*) FROM warnings");

        return {
            users: users[0].count,
            guilds: guilds[0].count,
            xpRecords: xp[0].count,
            warnings: warnings[0].count
        };

    } catch (error) {

        logger.error("Database stats failed:", error);

        return null;

    }
}

module.exports = {
    getDatabaseStats
};