const databaseSystem = require("../systems/databaseSystem");
const logger = require("../utils/logger");

async function getXP(userId, guildId) {

    try {

        const result = await databaseSystem.query(
            "SELECT * FROM xp WHERE user_id = $1 AND guild_id = $2",
            [userId, guildId]
        );

        if (!result.rows || result.rows.length === 0) {
            return null;
        }

        return result.rows[0];

    } catch (error) {

        logger.error("XP_FETCH_FAILED", { error: error.message });
        throw error;

    }
}

async function createXP(userId, guildId) {

    try {

        const result = await databaseSystem.query(
            `INSERT INTO xp (user_id, guild_id, xp, level)
             VALUES ($1, $2, 0, 1)
             ON CONFLICT (user_id, guild_id)
             DO NOTHING
             RETURNING *`,
            [userId, guildId]
        );

        if (!result.rows || result.rows.length === 0) {
            return await getXP(userId, guildId);
        }

        return result.rows[0];

    } catch (error) {

        logger.error("XP_CREATE_FAILED", { error: error.message });
        throw error;

    }
}

async function getOrCreateXP(userId, guildId) {

    let xp = await getXP(userId, guildId);

    if (!xp) {
        xp = await createXP(userId, guildId);
    }

    return xp;
}

async function addXP(userId, guildId, amount) {

    try {

        const result = await databaseSystem.query(
            `UPDATE xp
             SET xp = xp + $1
             WHERE user_id = $2 AND guild_id = $3
             RETURNING *`,
            [amount, userId, guildId]
        );

        if (!result.rows || result.rows.length === 0) {
            return null;
        }

        return result.rows[0];

    } catch (error) {

        logger.error("XP_ADD_FAILED", { error: error.message });
        throw error;

    }
}

async function updateLevel(userId, guildId, level) {

    try {

        const result = await databaseSystem.query(
            `UPDATE xp
             SET level = $1
             WHERE user_id = $2 AND guild_id = $3
             RETURNING *`,
            [level, userId, guildId]
        );

        if (!result.rows || result.rows.length === 0) {
            return null;
        }

        return result.rows[0];

    } catch (error) {

        logger.error("XP_LEVEL_UPDATE_FAILED", { error: error.message });
        throw error;

    }
}

async function setXP(userId, guildId, xp, level) {

    try {

        const result = await databaseSystem.query(
            `UPDATE xp
             SET xp = $1, level = $2
             WHERE user_id = $3 AND guild_id = $4
             RETURNING *`,
            [xp, level, userId, guildId]
        );

        if (!result.rows || result.rows.length === 0) {
            return null;
        }

        return result.rows[0];

    } catch (error) {

        logger.error("XP_SET_FAILED", { error: error.message });
        throw error;

    }
}

module.exports = {
    getXP,
    createXP,
    getOrCreateXP,
    addXP,
    updateLevel,
    setXP
};