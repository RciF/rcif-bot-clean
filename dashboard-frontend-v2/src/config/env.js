/**
 * Environment configuration
 * All environment variables centralized here
 */

export const env = {
  // API
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000',

  // Discord OAuth
  DISCORD_CLIENT_ID: import.meta.env.VITE_DISCORD_CLIENT_ID || '',
  DISCORD_REDIRECT_URI:
    import.meta.env.VITE_DISCORD_REDIRECT_URI ||
    `${window.location.origin}/auth/callback`,

  // Bot info
  BOT_NAME: import.meta.env.VITE_BOT_NAME || 'Lyn',
  BOT_INVITE_URL: import.meta.env.VITE_BOT_INVITE_URL || '',

  // Feature flags
  ENABLE_DARK_MODE: import.meta.env.VITE_ENABLE_DARK_MODE !== 'false',
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',

  // Mode
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
};

export const DISCORD_OAUTH_URL = (() => {
  if (!env.DISCORD_CLIENT_ID) return '';
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    redirect_uri: env.DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds email',
  });
  return `https://discord.com/api/oauth2/authorize?${params}`;
})();
