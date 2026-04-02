function formatBytes(bytes) {
  return Math.round(bytes / 1024 / 1024) + " MB"
}

function getMetrics() {

  const memory = process.memoryUsage()
  const cpu = process.cpuUsage()

  return {
    rss: memory.rss,
    heapTotal: memory.heapTotal,
    heapUsed: memory.heapUsed,
    external: memory.external,
    uptime: process.uptime(),
    cpuUsage: cpu,

    // ✅ NEW: معلومات محسنة بدون تغيير الأساسي
    memoryFormatted: {
      rss: formatBytes(memory.rss),
      heapTotal: formatBytes(memory.heapTotal),
      heapUsed: formatBytes(memory.heapUsed),
      external: formatBytes(memory.external)
    },

    cpuUsageMs: {
      user: Math.round(cpu.user / 1000),
      system: Math.round(cpu.system / 1000)
    },

    timestamp: Date.now()
  }

}

module.exports = {
  getMetrics
}