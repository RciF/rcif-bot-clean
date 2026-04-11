const databaseSystem = require("../systems/databaseSystem");
const logger = require("../systems/loggerSystem");

// ✅ تم إضافة log_channel_id للقائمة المسموحة للتعديل
const ALLOWED_FIELDS = ["ai_enabled", "xp_enabled", "economy_enabled", "log_channel_id"];

async function getGuild(guildId) {
    try {
        const result = await databaseSystem.query(
            "SELECT * FROM guilds WHERE id = $1",
            [guildId]
        );

        if (!result?.rows?.length) {
            return null;
        }

        return result.rows[0];
    } catch (error) {
        logger.error("GUILD_GET_FAILED", { error: error.message });
        throw error;
    }
}

async function createGuild(guildId) {
    try {
        // العمود الجديد log_channel_id مدعوم تلقائياً هنا لأنه NULL افتراضياً في قاعدة البيانات
        const result = await databaseSystem.query(
            "INSERT INTO guilds (id) VALUES ($1) ON CONFLICT (id) DO NOTHING RETURNING *",
            [guildId]
        );

        if (!result?.rows?.length) {
            return await getGuild(guildId);
        }

        return result.rows[0] || null;
    } catch (error) {
        logger.error("GUILD_CREATE_FAILED", { error: error.message });
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
        // ✅ منع الـ SQL injection والتأكد من أن الحقل الجديد ضمن القائمة
        if (!ALLOWED_FIELDS.includes(field)) {
            logger.warn("GUILD_UPDATE_INVALID_FIELD", { field });
            return null;
        }

        const result = await databaseSystem.query(
            `UPDATE guilds SET ${field} = $1 WHERE id = $2 RETURNING *`,
            [value, guildId]
        );

        return result.rows[0] || null;
    } catch (error) {
        logger.error("GUILD_UPDATE_FAILED", { error: error.message });
        throw error;
    }
}

module.exports = {
    getGuild,
    createGuild,
    getOrCreateGuild,
    updateGuildSetting
};
