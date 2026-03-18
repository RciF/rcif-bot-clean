const { getUptime } = require("./uptimeSystem")

function formatBytes(bytes) {
  return Math.round(bytes / 1024 / 1024) + " MB"
}

function getStatus(client) {

  const memoryUsage = process.memoryUsage()

  return {
    bot: client.user ? client.user.tag : "not ready",
    guilds: client.guilds.cache.size,
    users: client.users.cache.size,
    uptime: getUptime(),
    memory: memoryUsage.rss,

    // ✅ NEW: تفاصيل إضافية بدون كسر النظام
    memoryFormatted: formatBytes(memoryUsage.rss),

    stats: {
      guilds: client.guilds.cache.size,
      users: client.users.cache.size,
      channels: client.channels?.cache?.size || 0
    },

    ready: !!client.user,

    timestamp: Date.now()
  }

}

module.exports = {
  getStatus
}