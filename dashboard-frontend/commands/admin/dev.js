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

  return Math.round(100 - (idle / total) * 100)
}

let cachedCommandCount = null

function countCommands() {
  try {
    if (cachedCommandCount !== null) return cachedCommandCount

    const commandsPath = path.join(__dirname, "../../commands")

    let count = 0

    const folders = fs.readdirSync(commandsPath)

    for (const folder of folders) {
      const folderPath = path.join(commandsPath, folder)

      if (!fs.lstatSync(folderPath).isDirectory()) continue

      const files = fs.readdirSync(folderPath).filter(f => f.endsWith(".js"))

      count += files.length
    }

    cachedCommandCount = count
    return count
  } catch (e) {
    console.error("COUNT_COMMANDS_ERROR", e)
    return 0
  }
}

module.exports = {

  data: new SlashCommandBuilder()
    .setName("dev")
    .setDescription("لوحة المطور"),

  async execute(interaction) {
    try {
      const isOwner = await requireOwner(interaction)

      if (!isOwner) {
        return interaction.reply({
          content: "❌ هذا الأمر مخصص لمالك البوت فقط",
          ephemeral: true,
        })
      }

      const uptime = formatUptime(process.uptime())

      const servers = interaction.client.guilds.cache.size
      const channels = interaction.client.channels.cache.size

      const users = interaction.client.guilds.cache.reduce(
        (acc, g) => acc + (g.memberCount || 0),
        0
      )

      const gatewayPing = interaction.client.ws.ping
      const apiPing = Date.now() - interaction.createdTimestamp

      const cpu = getCPUUsage()
      const commands = countCommands()

      await interaction.reply({
        content:
`🛠 لوحة المطور

📊 Discord
السيرفرات: ${servers}
المستخدمون (تقريبي): ${users}
القنوات: ${channels}

📡 الشبكة
بينق البوابة: ${gatewayPing} ms
بينق الاستجابة: ${apiPing} ms

⏱ وقت التشغيل
${uptime}

🧠 المعالج
الاستخدام: ${cpu} %

🤖 البوت
عدد الأوامر: ${commands}`,
        ephemeral: true
      })

    } catch (error) {
      console.error("DEV_COMMAND_ERROR", error)
      await interaction.reply({
        content: "❌ حصل خطأ في لوحة المطور",
        ephemeral: true
      })
    }
  }

}