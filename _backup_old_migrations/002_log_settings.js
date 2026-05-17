module.exports = async function (db) {
  await db.query(`
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
      role_delete_channel TEXT,
      message_delete_bulk_channel TEXT,
      channel_update_channel TEXT,
      role_update_channel TEXT,
      voice_channel TEXT,
      guild_update_channel TEXT,
      emoji_channel TEXT,
      invite_channel TEXT,
      event_channel TEXT
    );
  `)

  const cols = [
    "message_delete_channel","message_update_channel","member_join_channel",
    "member_leave_channel","member_ban_channel","member_unban_channel",
    "member_update_channel","channel_create_channel","channel_delete_channel",
    "role_create_channel","role_delete_channel","message_delete_bulk_channel",
    "channel_update_channel","role_update_channel","voice_channel",
    "guild_update_channel","emoji_channel","invite_channel","event_channel"
  ]
  for (const c of cols) {
    await db.query(`ALTER TABLE log_settings ADD COLUMN IF NOT EXISTS ${c} TEXT;`)
  }
}