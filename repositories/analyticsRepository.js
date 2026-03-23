const databaseSystem = require("../systems/databaseSystem");
const logger = require("../systems/loggerSystem");

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

        return result.rows[0] || null;

    } catch (error) {

        logger.error("ANALYTICS_TRACK_FAILED", {
            error: error.message
        });
        throw error;

    }
}

async function getAnalytics() {

    try {

        const result = await databaseSystem.query(
            "SELECT * FROM analytics ORDER BY count DESC"
        );

        return result.rows || [];

    } catch (error) {

        logger.error("ANALYTICS_FETCH_FAILED", {
            error: error.message
        });
        throw error;

    }
}

module.exports = {
    trackCommand,
    getAnalytics
};