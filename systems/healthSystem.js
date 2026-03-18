const { getUptime } = require("./uptimeSystem")

function formatMemory(bytes) {
  return Math.round(bytes / 1024 / 1024) + " MB"
}

function getHealth() {

  const memoryUsage = process.memoryUsage()

  return {
    status: "ok",

    uptime: getUptime(),

    memory: memoryUsage.rss,

    // ✅ NEW: تفاصيل إضافية بدون تغيير النظام
    memoryDetails: {
      rss: memoryUsage.rss,
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      formatted: {
        rss: formatMemory(memoryUsage.rss),
        heapUsed: formatMemory(memoryUsage.heapUsed),
        heapTotal: formatMemory(memoryUsage.heapTotal)
      }
    },

    // ✅ NEW: timestamp للمراقبة
    timestamp: Date.now()
  }

}

module.exports = {
  getHealth
}