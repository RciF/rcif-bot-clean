module.exports = async function (db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS welcome_settings (
      guild_id TEXT PRIMARY KEY,
      welcome_channel_id TEXT,
      goodbye_channel_id TEXT,
      welcome_message TEXT,
      goodbye_message TEXT,
      enabled BOOLEAN DEFAULT true
    );
  `)
}