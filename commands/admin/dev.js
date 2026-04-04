const { SlashCommandBuilder } = require("discord.js")
const { requireOwner } = require("../../systems/commandGuardSystem")
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

function getMemoryUsage() {
  const used = process.memoryUsage()
  return {
    rss: (used.rss / 1024 / 1024).toFixed(1),
    heap: (used.heapUsed / 1024 / 1024).toFixed(1),
  }
}

function countCommands() {
  try {
    const commandsPath = path.join(__dirname, "../../commands")
    let count = 0
    const folders = fs.readdirSync(commandsPath)
    for (const folder of folders) {
      const folderPath = path.join(commandsPath, folder)
      if (!fs.lstatSync(folderPath).isDirectory()) continue
      const files = fs.readdirSync(folderPath).filter(f => f.endsWith(".js"))
      count += files.length
    }
    return count
  } catch {
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
      const client = interaction.client
      const servers = client.guilds.cache.size
      const channels = client.channels.cache.size
      const users = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0)
      const gatewayPing = client.ws.ping
      const apiPing = Date.now() - interaction.createdTimestamp
      const memory = getMemoryUsage()
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

💾 الذاكرة
RSS: ${memory.rss} MB
Heap: ${memory.heap} MB

🤖 البوت
عدد الأوامر: ${commands}`,
        ephemeral: true
      })

    } catch (error) {
      console.error("[dev] Error:", error)
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ حصل خطأ في لوحة المطور",
          ephemeral: true
        })
      }
    }
  }
}