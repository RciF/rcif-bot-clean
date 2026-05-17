module.exports = async function (db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS protection_settings (
      guild_id TEXT PRIMARY KEY,
      antispam_enabled BOOLEAN DEFAULT false,
      antispam_max_messages INTEGER DEFAULT 5,
      antispam_interval_ms INTEGER DEFAULT 3000,
      antispam_action TEXT DEFAULT 'mute',
      antispam_mute_duration INTEGER DEFAULT 300000,
      antiraid_enabled BOOLEAN DEFAULT false,
      antiraid_join_threshold INTEGER DEFAULT 10,
      antiraid_join_interval_ms INTEGER DEFAULT 10000,
      antiraid_action TEXT DEFAULT 'lockdown',
      antinuke_enabled BOOLEAN DEFAULT false,
      antinuke_channel_delete_threshold INTEGER DEFAULT 3,
      antinuke_role_delete_threshold INTEGER DEFAULT 3,
      antinuke_ban_threshold INTEGER DEFAULT 3,
      antinuke_interval_ms INTEGER DEFAULT 10000,
      antinuke_action TEXT DEFAULT 'ban',
      log_channel_id TEXT,
      whitelist_users JSONB DEFAULT '[]'::jsonb,
      whitelist_roles JSONB DEFAULT '[]'::jsonb,
      is_locked BOOLEAN DEFAULT false,
      lockdown_started_at TIMESTAMP,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `)
}