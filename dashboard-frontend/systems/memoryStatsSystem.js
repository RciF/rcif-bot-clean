function getMemoryStats() {

  const memory = process.memoryUsage()

  return {
    rss: memory.rss,
    heapTotal: memory.heapTotal,
    heapUsed: memory.heapUsed,
    external: memory.external
  }

}

module.exports = {
  getMemoryStats
}