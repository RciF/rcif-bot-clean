const analyticsRepository = require("../repositories/analyticsRepository")

async function trackCommand(commandName) {
  await analyticsRepository.trackCommand(commandName)
}

module.exports = {
  trackCommand
}