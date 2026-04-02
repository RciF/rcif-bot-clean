const databaseManager = require("../utils/databaseManager");
const logger = require("./loggerSystem");

async function checkDatabaseHealth() {

    try {

        const result = await databaseManager.testConnection();

        return {
            status: "ok",
            time: result?.now || result?.time || result
        };

    } catch (error) {

        logger.error("DATABASE_HEALTH_CHECK_FAILED", {
            error: error.message
        });

        return {
            status: "error"
        };

    }
}

module.exports = {
    checkDatabaseHealth
};