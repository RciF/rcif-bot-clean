const { SlashCommandBuilder } = require("discord.js")
const { requireOwner } = require("../../systems/commandGuardSystem")
const os = require("os")
const fs = require("fs")
const path = require("path")

function formatUptime(seconds) {

  seconds = Math.floor(seconds)

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  return `${days} يوم ${hours} ساعة ${minutes} دقيقة ${secs} ثانية`
}

function getCPUUsage() {

  const cpus = os.cpus()

  let idle = 0
  let total = 0

  for (const cpu of cpus) {
    for (const type in cpu.times) {
      total += cpu.times[type]
    }
    idle += cpu.times.idle
  }

  const usage = 100 - Math.floor((idle / total) * 100)

  return usage
}

function countCommands() {

  const commandsPath = path.join(__dirname, "../../commands")

  let count = 0

  const folders = fs.readdirSync(commandsPath)

  for (const folder of folders) {

    const folderPath = path.join(commandsPath, folder)

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith(".js"))

    count += files.length
  }

  return count
}

module.exports = {

  data: new SlashCommandBuilder()
    .setName("dev")
    .setDescription("لوحة المطور"),

  async execute(interaction) {

    if (!requireOwner(interaction)) return

    const uptime = formatUptime(process.uptime())

    const servers = interaction.client.guilds.cache.size
    const users = interaction.client.users.cache.size
    const channels = interaction.client.channels.cache.size

    const gatewayPing = interaction.client.ws.ping
    const apiPing = Date.now() - interaction.createdTimestamp

    const cpu = getCPUUsage()

    const commands = countCommands()

    await interaction.reply(
`🛠 لوحة المطور

📊 Discord
السيرفرات: ${servers}
المستخدمون: ${users}
القنوات: ${channels}

📡 الشبكة
بينق البوابة: ${gatewayPing} ms
بينق الاستجابة: ${apiPing} ms

⏱ وقت التشغيل
${uptime}

🧠 المعالج
الاستخدام: ${cpu} %

🤖 البوت
عدد الأوامر: ${commands}`
    )

  }

}