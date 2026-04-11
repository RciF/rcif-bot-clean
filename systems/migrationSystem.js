const databaseSystem = require("./databaseSystem")
const logger = require("./loggerSystem")

async function runMigrations() {

    logger.info("RUNNING_DATABASE_MIGRATIONS")

    try {

        // USERS
        await databaseSystem.query(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                coins INTEGER DEFAULT 0,
                xp INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (id, guild_id)
            );
        `)

        // GUILDS
        await databaseSystem.query(`
            CREATE TABLE IF NOT EXISTS guilds (
                id TEXT PRIMARY KEY,
                ai_enabled BOOLEAN DEFAULT true,
                xp_enabled BOOLEAN DEFAULT true,
                economy_enabled BOOLEAN DEFAULT true
            );
        `)

        // XP SYSTEM
        await databaseSystem.query(`
            CREATE TABLE IF NOT EXISTS xp (
                user_id TEXT,
                guild_id TEXT,
                xp INTEGER DEFAULT 0,
                level INTEGER DEFAULT 0,
                PRIMARY KEY (user_id, guild_id)
            );
        `)

        // ANALYTICS
        await databaseSystem.query(`
            CREATE TABLE IF NOT EXISTS analytics (
                command TEXT PRIMARY KEY,
                count INTEGER DEFAULT 0
            );
        `)

        // INVENTORY
        await databaseSystem.query(`
            CREATE TABLE IF NOT EXISTS inventory (
                user_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                item_id TEXT NOT NULL,
                quantity INTEGER DEFAULT 1,
                PRIMARY KEY (user_id, guild_id, item_id)
            );
        `)

        // WARNINGS
        await databaseSystem.query(`
            CREATE TABLE IF NOT EXISTS warnings (
                id SERIAL PRIMARY KEY,
                guild_id TEXT,
                user_id TEXT,
                moderator_id TEXT,
                reason TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `)

        // AI MEMORY
        await databaseSystem.query(`
            CREATE TABLE IF NOT EXISTS memories (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL,
                type TEXT NOT NULL,
                memory TEXT NOT NULL,
                created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
            );
        `)

        // ECONOMY USERS
        await databaseSystem.query(`
            CREATE TABLE IF NOT EXISTS economy_users (
                user_id TEXT PRIMARY KEY,
                coins INTEGER DEFAULT 0,
                last_daily BIGINT DEFAULT 0,
                last_work BIGINT DEFAULT 0,
                inventory JSONB DEFAULT '[]'
            );
        `)

        // RELATIONSHIPS
        await databaseSystem.query(`
            CREATE TABLE IF NOT EXISTS relationships (
                user_a TEXT NOT NULL,
                user_b TEXT NOT NULL,
                count INTEGER DEFAULT 0,
                score INTEGER DEFAULT 0,
                last_interaction BIGINT,
                PRIMARY KEY (user_a, user_b)
            );
        `)

        // SUBSCRIPTIONS
        await databaseSystem.query(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL UNIQUE,
                plan_id TEXT NOT NULL DEFAULT 'free',
                status TEXT NOT NULL DEFAULT 'inactive',
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `)

        // GUILD SUBSCRIPTIONS
        await databaseSystem.query(`
            CREATE TABLE IF NOT EXISTS guild_subscriptions (
                guild_id TEXT PRIMARY KEY,
                owner_id TEXT NOT NULL,
                added_at TIMESTAMP DEFAULT NOW()
            );
        `)

        await databaseSystem.query(`
            CREATE INDEX IF NOT EXISTS idx_guild_sub_owner
            ON guild_subscriptions (owner_id);
        `)

        // AI KNOWLEDGE
        try {
            await databaseSystem.query(`CREATE EXTENSION IF NOT EXISTS vector;`)

            await databaseSystem.query(`
                CREATE TABLE IF NOT EXISTS ai_knowledge (
                    id SERIAL PRIMARY KEY,
                    user_id TEXT,
                    content TEXT NOT NULL,
                    source TEXT,
                    embedding vector(1536),
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `)
        } catch (vectorErr) {
            logger.warn("VECTOR_EXTENSION_UNAVAILABLE", {
                error: vectorErr.message
            })

            await databaseSystem.query(`
                CREATE TABLE IF NOT EXISTS ai_knowledge (
                    id SERIAL PRIMARY KEY,
                    user_id TEXT,
                    content TEXT NOT NULL,
                    source TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `)
        }

        // LOG SETTINGS — كل حدث له قناة مستقلة
        await databaseSystem.query(`
            CREATE TABLE IF NOT EXISTS log_settings (
                guild_id TEXT PRIMARY KEY,
                enabled BOOLEAN DEFAULT false,
                message_delete_channel TEXT,
                message_update_channel TEXT,
                member_join_channel TEXT,
                member_leave_channel TEXT,
                member_ban_channel TEXT,
                member_unban_channel TEXT,
                member_update_channel TEXT,
                channel_create_channel TEXT,
                channel_delete_channel TEXT,
                role_create_channel TEXT,
                role_delete_channel TEXT
            );
        `)

        // Migration: لو الجدول القديم موجود، نضيف الأعمدة الجديدة
        const newColumns = [
            "message_delete_channel", "message_update_channel",
            "member_join_channel", "member_leave_channel",
            "member_ban_channel", "member_unban_channel",
            "member_update_channel", "channel_create_channel",
            "channel_delete_channel", "role_create_channel",
            "role_delete_channel"
        ]

        for (const col of newColumns) {
            try {
                await databaseSystem.query(`ALTER TABLE log_settings ADD COLUMN IF NOT EXISTS ${col} TEXT;`)
            } catch (e) {
                // column already exists — ignore
            }
        }

        logger.success("DATABASE_MIGRATIONS_COMPLETED")

    } catch (error) {

        logger.error("DATABASE_MIGRATION_FAILED", {
            error: error.message
        })

        throw error

    }

}

module.exports = {
    runMigrations
}