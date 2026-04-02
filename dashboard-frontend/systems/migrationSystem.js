const databaseSystem = require("./databaseSystem")
const logger = require("./loggerSystem")

async function runMigrations() {

    logger.info("RUNNING_DATABASE_MIGRATIONS")

    try {

        // USERS
        await databaseSystem.query(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                coins INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `)

        // 🔧 FIX OLD DATABASE (rename balance → coins if exists)
        await databaseSystem.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='users' AND column_name='balance'
                ) THEN
                    ALTER TABLE users RENAME COLUMN balance TO coins;
                END IF;
            END
            $$;
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
                user_id TEXT,
                item_id TEXT,
                quantity INTEGER DEFAULT 1,
                PRIMARY KEY (user_id, item_id)
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
                created_at TIMESTAMP DEFAULT NOW()
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

        // AI KNOWLEDGE VECTOR EXTENSION
        await databaseSystem.query(`
            CREATE EXTENSION IF NOT EXISTS vector;
        `)

        // AI KNOWLEDGE TABLE
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