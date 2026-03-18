let startTime = Date.now()

function getUptime() {

  const now = Date.now()
  const diff = Math.floor((now - startTime) / 1000)

  return diff
}

function getUptimeDetailed() {

  const total = getUptime()

  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60

  return {
    total,
    days,
    hours,
    minutes,
    seconds
  }
}

module.exports = {
  getUptime,
  getUptimeDetailed
}