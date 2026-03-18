const databaseSystem = require("../systems/databaseSystem");
const logger = require("../utils/logger");

async function getGuild(guildId) {

    try {

        const result = await databaseSystem.query(
            "SELECT * FROM guilds WHERE id = $1",
            [guildId]
        );

        if (result.length === 0) {
            return null;
        }

        return result[0];

    } catch (error) {

        logger.error("Failed to fetch guild:", error);
        throw error;

    }
}

async function createGuild(guildId) {

    try {

        const result = await databaseSystem.query(
            "INSERT INTO guilds (id) VALUES ($1) RETURNING *",
            [guildId]
        );

        return result[0];

    } catch (error) {

        logger.error("Failed to create guild:", error);
        throw error;

    }
}

async function getOrCreateGuild(guildId) {

    let guild = await getGuild(guildId);

    if (!guild) {
        guild = await createGuild(guildId);
    }

    return guild;
}

async function updateGuildSetting(guildId, field, value) {

    try {

        const result = await databaseSystem.query(
            `UPDATE guilds SET ${field} = $1 WHERE id = $2 RETURNING *`,
            [value, guildId]
        );

        return result[0];

    } catch (error) {

        logger.error("Failed to update guild setting:", error);
        throw error;

    }
}

module.exports = {
    getGuild,
    createGuild,
    getOrCreateGuild,
    updateGuildSetting
};