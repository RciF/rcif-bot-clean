const databaseSystem = require("../systems/databaseSystem");
const logger = require("../utils/logger");

async function trackCommand(command) {

    try {

        const result = await databaseSystem.query(
            `INSERT INTO analytics (command, count)
             VALUES ($1, 1)
             ON CONFLICT (command)
             DO UPDATE SET count = analytics.count + 1
             RETURNING *`,
            [command]
        );

        return result[0];

    } catch (error) {

        logger.error("Failed to track command:", error);
        throw error;

    }
}

async function getAnalytics() {

    try {

        const result = await databaseSystem.query(
            "SELECT * FROM analytics ORDER BY count DESC"
        );

        return result;

    } catch (error) {

        logger.error("Failed to fetch analytics:", error);
        throw error;

    }
}

module.exports = {
    trackCommand,
    getAnalytics
};