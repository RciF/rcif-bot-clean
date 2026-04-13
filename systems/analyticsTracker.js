const analyticsRepository = require("../repositories/analyticsRepository")

async function trackCommand(commandName) {
  analyticsRepository.trackCommand(commandName).catch(() => {})
}

module.exports = {
  trackCommand
}