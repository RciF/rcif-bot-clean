const databaseSystem = require("../systems/databaseSystem")
const logger = require("../systems/loggerSystem")

function normalizeUser(user) {

    if (!user) return null

    if (!Array.isArray(user.inventory)) {
        user.inventory = []
    }

    if (typeof user.coins !== "number") {
        user.coins = 0
    }

    if (typeof user.last_daily !== "number") {
        user.last_daily = 0
    }

    if (typeof user.last_work !== "number") {
        user.last_work = 0
    }

    return user
}

async function getUser(userId) {

    try {

        if (!userId) return null

        const result = await databaseSystem.query(
            `
            SELECT
                user_id,
                coins,
                last_daily,
                last_work,
                inventory
            FROM economy_users
            WHERE user_id = $1
            `,
            [String(userId)]
        )

        if (!result?.rows?.length) return null

        return normalizeUser(result.rows[0])

    } catch (error) {

        logger.error("ECONOMY_GET_USER_FAILED", {
            error: error.message
        })

        return null
    }

}

async function createUser(userId) {

    try {

        if (!userId) return null

        const result = await databaseSystem.query(
            `
            INSERT INTO economy_users
            (user_id, coins, last_daily, last_work, inventory)
            VALUES ($1, 0, 0, 0, $2)
            RETURNING
                user_id,
                coins,
                last_daily,
                last_work,
                inventory
            `,
            [String(userId), []]
        )

        if (!result?.rows?.length) return null

        return normalizeUser(result.rows[0])

    } catch (error) {

        logger.error("ECONOMY_CREATE_USER_FAILED", {
            error: error.message
        })

        return null
    }

}

async function updateUser(userId, data) {

    try {

        if (!userId || !data) return null

        const coins = typeof data.coins === "number" ? data.coins : 0
        const lastDaily = typeof data.last_daily === "number" ? data.last_daily : 0
        const lastWork = typeof data.last_work === "number" ? data.last_work : 0
        const inventory = Array.isArray(data.inventory) ? data.inventory : []

        const result = await databaseSystem.query(
            `
            UPDATE economy_users
            SET coins = $2,
                last_daily = $3,
                last_work = $4,
                inventory = $5
            WHERE user_id = $1
            RETURNING
                user_id,
                coins,
                last_daily,
                last_work,
                inventory
            `,
            [
                String(userId),
                coins,
                lastDaily,
                lastWork,
                inventory
            ]
        )

        if (!result?.rows?.length) return null

        return normalizeUser(result.rows[0])

    } catch (error) {

        logger.error("ECONOMY_UPDATE_USER_FAILED", {
            error: error.message
        })

        return null
    }

}

async function addCoins(userId, amount) {

    try {

        if (!userId || typeof amount !== "number") return null

        const result = await databaseSystem.query(
            `
            UPDATE economy_users
            SET coins = coins + $2
            WHERE user_id = $1
            RETURNING
                user_id,
                coins,
                last_daily,
                last_work,
                inventory
            `,
            [String(userId), amount]
        )

        if (!result?.rows?.length) return null

        return normalizeUser(result.rows[0])

    } catch (error) {

        logger.error("ECONOMY_ADD_COINS_FAILED", {
            error: error.message
        })

        return null
    }

}

async function removeCoins(userId, amount) {

    try {

        if (!userId || typeof amount !== "number") return null

        const result = await databaseSystem.query(
            `
            UPDATE economy_users
            SET coins = GREATEST(coins - $2, 0)
            WHERE user_id = $1
            RETURNING
                user_id,
                coins,
                last_daily,
                last_work,
                inventory
            `,
            [String(userId), amount]
        )

        if (!result?.rows?.length) return null

        return normalizeUser(result.rows[0])

    } catch (error) {

        logger.error("ECONOMY_REMOVE_COINS_FAILED", {
            error: error.message
        })

        return null
    }

}

async function getTopUsers(limit = 10) {

    try {

        const result = await databaseSystem.query(
            `
            SELECT
                user_id,
                coins
            FROM economy_users
            ORDER BY coins DESC
            LIMIT $1
            `,
            [limit]
        )

        if (!result?.rows) return []

        return result.rows

    } catch (error) {

        logger.error("ECONOMY_GET_TOP_USERS_FAILED", {
            error: error.message
        })

        return []
    }

}

module.exports = {
    getUser,
    createUser,
    updateUser,
    addCoins,
    removeCoins,
    getTopUsers
}