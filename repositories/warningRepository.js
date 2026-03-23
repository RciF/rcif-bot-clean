const databaseSystem = require("../systems/databaseSystem");
const logger = require("../systems/loggerSystem");

async function addWarning(guildId, userId, moderatorId, reason) {

    try {

        const result = await databaseSystem.query(
            `INSERT INTO warnings (guild_id, user_id, moderator_id, reason)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [guildId, userId, moderatorId, reason]
        );

        return result.rows[0] || null;

    } catch (error) {

        logger.error("WARNING_ADD_FAILED", {
            error: error.message
        });
        throw error;

    }
}

async function getWarnings(guildId, userId) {

    try {

        const result = await databaseSystem.query(
            `SELECT * FROM warnings
             WHERE guild_id = $1 AND user_id = $2
             ORDER BY created_at DESC`,
            [guildId, userId]
        );

        return result.rows || [];

    } catch (error) {

        logger.error("WARNING_FETCH_FAILED", {
            error: error.message
        });
        throw error;

    }
}

async function clearWarnings(guildId, userId) {

    try {

        await databaseSystem.query(
            `DELETE FROM warnings
             WHERE guild_id = $1 AND user_id = $2`,
            [guildId, userId]
        );

    } catch (error) {

        logger.error("WARNING_CLEAR_FAILED", {
            error: error.message
        });
        throw error;

    }
}

module.exports = {
    addWarning,
    getWarnings,
    clearWarnings
};