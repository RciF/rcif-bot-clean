const databaseManager = require("../utils/databaseManager");
const logger = require("../utils/logger");

async function checkDatabaseHealth() {

    try {

        const result = await databaseManager.testConnection();

        return {
            status: "ok",
            time: result.now
        };

    } catch (error) {

        logger.error("Database health check failed:", error);

        return {
            status: "error"
        };

    }
}

module.exports = {
    checkDatabaseHealth
};