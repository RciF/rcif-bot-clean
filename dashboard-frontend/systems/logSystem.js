function log(action, data = {}) {

  const time = new Date().toISOString()

  console.log(`[${time}] ${action}`, data)

}

module.exports = {
  log
}