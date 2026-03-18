const databaseSystem = require("../systems/databaseSystem");
const logger = require("../utils/logger");

async function getInventory(userId, guildId) {
    try {
        const result = await databaseSystem.query(
            "SELECT * FROM inventory WHERE user_id = $1 AND guild_id = $2",
            [userId, guildId]
        );

        return result || [];

    } catch (error) {
        logger.error("Failed to fetch inventory:", error);
        throw error;
    }
}

async function addItem(userId, guildId, itemId, quantity = 1) {
    try {
        const result = await databaseSystem.query(
            `INSERT INTO inventory (user_id, guild_id, item_id, quantity)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, guild_id, item_id)
             DO UPDATE SET quantity = inventory.quantity + $4
             RETURNING *`,
            [userId, guildId, itemId, quantity]
        );

        return result[0];

    } catch (error) {
        logger.error("Failed to add item:", error);
        throw error;
    }
}

async function removeItem(userId, guildId, itemId, quantity = 1) {
    const client = await databaseSystem.getClient();

    try {
        await client.query("BEGIN");

        const existing = await client.query(
            "SELECT quantity FROM inventory WHERE user_id = $1 AND guild_id = $2 AND item_id = $3",
            [userId, guildId, itemId]
        );

        if (!existing.rows.length) {
            await client.query("ROLLBACK");
            return null;
        }

        const currentQty = existing.rows[0].quantity;

        if (currentQty <= quantity) {
            await client.query(
                "DELETE FROM inventory WHERE user_id = $1 AND guild_id = $2 AND item_id = $3",
                [userId, guildId, itemId]
            );
        } else {
            await client.query(
                "UPDATE inventory SET quantity = quantity - $1 WHERE user_id = $2 AND guild_id = $3 AND item_id = $4",
                [quantity, userId, guildId, itemId]
            );
        }

        await client.query("COMMIT");
        return true;

    } catch (error) {
        await client.query("ROLLBACK");
        logger.error("Failed to remove item:", error);
        throw error;
    } finally {
        client.release();
    }
}

async function clearInventory(userId, guildId) {
    try {
        await databaseSystem.query(
            "DELETE FROM inventory WHERE user_id = $1 AND guild_id = $2",
            [userId, guildId]
        );

        return true;

    } catch (error) {
        logger.error("Failed to clear inventory:", error);
        throw error;
    }
}

module.exports = {
    getInventory,
    addItem,
    removeItem,
    clearInventory
};