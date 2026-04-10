const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js")
const { requireOwner } = require("../../systems/commandGuardSystem")
const database = require("../../systems/databaseSystem")
const fs = require("fs")
const path = require("path")
const os = require("os")

function formatUptime(seconds) {
  seconds = Math.floor(seconds)
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${days} يوم ${hours} ساعة ${minutes} دقيقة ${secs} ثانية`
}

function countFiles(dir) {
  let count = 0
  try {
    const items = fs.readdirSync(dir)
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.lstatSync(fullPath)
      if (stat.isDirectory() && !item.startsWith(".") && item !== "node_modules") {
        count += countFiles(fullPath)
      } else if (item.endsWith(".js")) {
        count++
      }
    }
  } catch {}
  return count
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

function getCommandsByFolder() {
  try {
    const commandsPath = path.join(__dirname, "../../commands")
    const result = {}
    const folders = fs.readdirSync(commandsPath)
    for (const folder of folders) {
      const folderPath = path.join(commandsPath, folder)
      if (!fs.lstatSync(folderPath).isDirectory()) continue
      const files = fs.readdirSync(folderPath).filter(f => f.endsWith(".js"))
      result[folder] = files.length
    }
    return result
  } catch {
    return {}
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("مطور")
    .setDescription("لوحة تحكم المطور (خاصة بمالك البوت)")
    .setDMPermission(false),

  async execute(interaction) {
    try {
      // ✅ تحقق: مالك البوت فقط
      const isOwner = await requireOwner(interaction)
      if (!isOwner) {
        return interaction.reply({
          content: "❌ هذا الأمر مخصص لمالك البوت فقط.",
          ephemeral: true
        })
      }

      await interaction.deferReply({ ephemeral: true })

      const client = interaction.client

      // ✅ إحصائيات Discord
      const totalServers = client.guilds.cache.size
      const totalUsers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0)
      const totalChannels = client.channels.cache.size
      const gatewayPing = client.ws.ping
      const apiPing = Date.now() - interaction.createdTimestamp

      // ✅ النظام
      const uptime = formatUptime(process.uptime())
      const memUsage = process.memoryUsage()
      const rss = (memUsage.rss / 1024 / 1024).toFixed(1)
      const heap = (memUsage.heapUsed / 1024 / 1024).toFixed(1)
      const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1)
      const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(1)
      const cpuCount = os.cpus().length
      const platform = `${os.platform()} ${os.arch()}`

      // ✅ الأوامر
      const totalCommands = countCommands()
      const commandsByFolder = getCommandsByFolder()
      const folderText = Object.entries(commandsByFolder)
        .map(([folder, count]) => {
          const emojis = {
            admin: "⚙️",
            moderation: "🛡️",
            economy: "💰",
            ai: "🤖"
          }
          return `${emojis[folder] || "📁"} **${folder}**: ${count} أمر`
        })
        .join("\n")

      // ✅ ملفات المشروع
      const totalFiles = countFiles(path.join(__dirname, "../../"))

      // ✅ قاعدة البيانات
      let dbStatus = "❌ غير متصل"
      let dbDetails = ""
      try {
        const dbPing = Date.now()
        await database.query("SELECT 1")
        const dbTime = Date.now() - dbPing

        const usersCount = await database.query("SELECT COUNT(*) as count FROM economy_users")
        const inventoryCount = await database.query("SELECT COUNT(*) as count FROM inventory")
        const warningsCount = await database.query("SELECT COUNT(*) as count FROM warnings")

        dbStatus = `✅ متصل (${dbTime}ms)`
        dbDetails = `👥 المستخدمون: **${usersCount.rows[0]?.count || 0}**\n`
        dbDetails += `📦 الممتلكات: **${inventoryCount.rows[0]?.count || 0}**\n`
        dbDetails += `⚠️ التحذيرات: **${warningsCount.rows[0]?.count || 0}**`
      } catch {
        dbStatus = "❌ غير متصل"
      }

      // ✅ أكبر 5 سيرفرات
      const topGuilds = client.guilds.cache
        .sort((a, b) => b.memberCount - a.memberCount)
        .first(5)
        .map((g, i) => {
          const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"]
          return `${medals[i]} **${g.name}** — ${g.memberCount} عضو`
        })
        .join("\n")

      // ✅ Embed الرئيسي
      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle("🛠️ لوحة تحكم المطور")
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          {
            name: "📊 إحصائيات Discord",
            value: `🌐 السيرفرات: **${totalServers}**\n👥 المستخدمون: **${totalUsers.toLocaleString("ar-SA")}**\n📡 القنوات: **${totalChannels}**`,
            inline: true
          },
          {
            name: "📡 الشبكة",
            value: `🏓 البوابة: **${gatewayPing}ms**\n⚡ الاستجابة: **${apiPing}ms**`,
            inline: true
          },
          {
            name: "⏱ وقت التشغيل",
            value: uptime,
            inline: true
          },
          {
            name: "💾 الذاكرة والنظام",
            value: `📊 RSS: **${rss} MB**\n📊 Heap: **${heap} MB**\n🖥️ النظام: **${platform}**\n🧮 المعالجات: **${cpuCount}**\n💽 الذاكرة: **${freeMem}/${totalMem} GB**`,
            inline: true
          },
          {
            name: "🤖 الأوامر",
            value: `📦 الإجمالي: **${totalCommands}** أمر\n📁 الملفات: **${totalFiles}** ملف\n\n${folderText}`,
            inline: true
          },
          {
            name: "🗄️ قاعدة البيانات",
            value: `${dbStatus}\n${dbDetails}`,
            inline: true
          },
          {
            name: "🏆 أكبر السيرفرات",
            value: topGuilds || "لا يوجد",
            inline: false
          }
        )
        .setFooter({ text: `Node ${process.version} | PID: ${process.pid}` })
        .setTimestamp()

      // ✅ أزرار
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("الداشبورد")
          .setStyle(ButtonStyle.Link)
          .setURL("https://rcif-dashboard.onrender.com")
          .setEmoji("🌐"),
        new ButtonBuilder()
          .setLabel("GitHub")
          .setStyle(ButtonStyle.Link)
          .setURL("https://github.com/RciF/rcif-bot-clean")
          .setEmoji("📂")
      )

      return interaction.editReply({ embeds: [embed], components: [row] })

    } catch (err) {
      console.error("[DEV PANEL ERROR]", err)

      if (interaction.deferred) {
        return interaction.editReply({ content: "❌ حدث خطأ في لوحة المطور." })
      }
      if (!interaction.replied) {
        return interaction.reply({ content: "❌ حدث خطأ في لوحة المطور.", ephemeral: true })
      }
    }
  },
}