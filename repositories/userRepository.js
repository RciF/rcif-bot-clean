const databaseSystem = require("../systems/databaseSystem");
const logger = require("../utils/logger");

async function getUser(userId, guildId) {
    try {
        const result = await databaseSystem.query(
            "SELECT * FROM users WHERE id = $1 AND guild_id = $2",
            [userId, guildId]
        );

        if (!result || result.length === 0) {
            return null;
        }

        return result[0];

    } catch (error) {
        logger.error("Failed to fetch user:", error);
        throw error;
    }
}

async function createUser(userId, guildId) {
    try {
        const result = await databaseSystem.query(
            `INSERT INTO users (id, guild_id, coins, xp)
             VALUES ($1, $2, 0, 0)
             ON CONFLICT (id, guild_id) DO NOTHING
             RETURNING *`,
            [userId, guildId]
        );

        if (!result || result.length === 0) {
            return await getUser(userId, guildId);
        }

        return result[0];

    } catch (error) {
        logger.error("Failed to create user:", error);
        throw error;
    }
}

async function getOrCreateUser(userId, guildId) {
    let user = await getUser(userId, guildId);

    if (!user) {
        user = await createUser(userId, guildId);
    }

    return user;
}

async function updateCoins(userId, guildId, newAmount) {
    try {
        const result = await databaseSystem.query(
            "UPDATE users SET coins = $1 WHERE id = $2 AND guild_id = $3 RETURNING *",
            [newAmount, userId, guildId]
        );

        return result[0];

    } catch (error) {
        logger.error("Failed to update coins:", error);
        throw error;
    }
}

async function addCoins(userId, guildId, amount) {
    const client = await databaseSystem.getClient();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `UPDATE users 
             SET coins = coins + $1 
             WHERE id = $2 AND guild_id = $3 
             RETURNING *`,
            [amount, userId, guildId]
        );

        await client.query("COMMIT");

        return result.rows[0];

    } catch (error) {
        await client.query("ROLLBACK");
        logger.error("Failed to add coins:", error);
        throw error;
    } finally {
        client.release();
    }
}

async function updateXP(userId, guildId, newXP) {
    try {
        const result = await databaseSystem.query(
            "UPDATE users SET xp = $1 WHERE id = $2 AND guild_id = $3 RETURNING *",
            [newXP, userId, guildId]
        );

        return result[0];

    } catch (error) {
        logger.error("Failed to update XP:", error);
        throw error;
    }
}

async function addXP(userId, guildId, amount) {
    const client = await databaseSystem.getClient();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `UPDATE users 
             SET xp = xp + $1 
             WHERE id = $2 AND guild_id = $3 
             RETURNING *`,
            [amount, userId, guildId]
        );

        await client.query("COMMIT");

        return result.rows[0];

    } catch (error) {
        await client.query("ROLLBACK");
        logger.error("Failed to add XP:", error);
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    getUser,
    createUser,
    getOrCreateUser,
    updateCoins,
    addCoins,
    updateXP,
    addXP
};