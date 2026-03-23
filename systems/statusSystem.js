const { getUptime } = require("./uptimeSystem")

function formatBytes(bytes) {
  return Math.round(bytes / 1024 / 1024) + " MB"
}

function getStatus(client) {

  const memoryUsage = process.memoryUsage()

  const guilds = client?.guilds?.cache?.size || 0
  const users = client?.users?.cache?.size || 0

  return {
    bot: client?.user ? client.user.tag : "not ready",
    guilds,
    users,
    uptime: getUptime(),
    memory: memoryUsage.rss,

    // ✅ NEW: تفاصيل إضافية بدون كسر النظام
    memoryFormatted: formatBytes(memoryUsage.rss),

    stats: {
      guilds,
      users,
      channels: client?.channels?.cache?.size || 0
    },

    ready: !!client?.user,

    timestamp: Date.now()
  }

}

module.exports = {
  getStatus
}