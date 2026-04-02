const databaseSystem = require("../systems/databaseSystem");
const logger = require("../systems/loggerSystem");

async function getInventory(userId, guildId) {
    try {
        const result = await databaseSystem.query(
            "SELECT * FROM inventory WHERE user_id = $1 AND guild_id = $2",
            [userId, guildId]
        );

        return result.rows || [];

    } catch (error) {
        logger.error("INVENTORY_GET_FAILED", {
            error: error.message
        });
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

        return result.rows[0] || null;

    } catch (error) {
        logger.error("INVENTORY_ADD_FAILED", {
            error: error.message
        });
        throw error;
    }
}

async function removeItem(userId, guildId, itemId, quantity = 1) {
    try {

        const existing = await databaseSystem.query(
            "SELECT quantity FROM inventory WHERE user_id = $1 AND guild_id = $2 AND item_id = $3",
            [userId, guildId, itemId]
        );

        if (!existing.rows.length) return null;

        const currentQty = existing.rows[0].quantity;

        if (currentQty <= quantity) {
            await databaseSystem.query(
                "DELETE FROM inventory WHERE user_id = $1 AND guild_id = $2 AND item_id = $3",
                [userId, guildId, itemId]
            );
        } else {
            await databaseSystem.query(
                "UPDATE inventory SET quantity = quantity - $1 WHERE user_id = $2 AND guild_id = $3 AND item_id = $4",
                [quantity, userId, guildId, itemId]
            );
        }

        return true;

    } catch (error) {
        logger.error("INVENTORY_REMOVE_FAILED", {
            error: error.message
        });
        throw error;
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
        logger.error("INVENTORY_CLEAR_FAILED", {
            error: error.message
        });
        throw error;
    }
}

module.exports = {
    getInventory,
    addItem,
    removeItem,
    clearInventory
};