const { sendLog, LOG_COLORS } = require('../../utils/logSender')
const logger = require('../../systems/loggerSystem')

module.exports = {
  name: 'channelUpdate',
  async execute(oldChannel, newChannel, client) {
    try {
      if (!newChannel.guild) return
      if (oldChannel.name === newChannel.name) return
      await sendLog(client, newChannel.guild.id, 'channel_update', {
        title: '✏️ تعديل قناة',
        color: LOG_COLORS.update,
        fields: [
          { name: '📌 القناة', value: `${newChannel.name}`, inline: true },
          { name: '📝 الاسم القديم', value: oldChannel.name, inline: true },
          { name: '📝 الاسم الجديد', value: newChannel.name, inline: true }
        ],
        footer: `معرف القناة: ${newChannel.id}`
      })
    } catch (err) {
      logger.error('LOG_CHANNEL_UPDATE_FAILED', { error: err.message })
    }
  }
}