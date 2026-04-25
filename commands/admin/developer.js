// ══════════════════════════════════════════════════════════════════
//  /مطور — لوحة تحكم المطور (أمر بريفكس مخفي)
//  المسار: commands/admin/developer.js
//
//  ⚠️ هذا الملف ما يصدّر data — عشان commandHandler ما يسجّله كـ slash.
//   الأمر يُستدعى من events/messageCreate.js بأي من البريفكسات:
//   !مطور  أو  $مطور  أو  .مطور
//
//  النتيجة: لا يظهر في Discord إطلاقاً (مستحيل اكتشافه عبر الـ API).
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const ownerSystem = require("../../systems/ownerSystem")
const database = require("../../systems/databaseSystem")
const fs = require("fs")
const path = require("path")
const os = require("os")

// البريفكسات المقبولة لأمر المطور
const DEV_PREFIXES = ["!مطور", "$مطور", ".مطور"]

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

// ✅ بناء Embed الرئيسي
async function buildMainEmbed(client, message) {
  const totalServers  = client.guilds.cache.size
  const totalUsers    = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0)
  const totalChannels = client.channels.cache.size
  const gatewayPing   = client.ws.ping
  const apiPing       = Date.now() - message.createdTimestamp
  const uptime        = formatUptime(process.uptime())

  const memUsage    = process.memoryUsage()
  const rss         = (memUsage.rss / 1024 / 1024).toFixed(1)
  const heap        = (memUsage.heapUsed / 1024 / 1024).toFixed(1)
  const heapTotal   = (memUsage.heapTotal / 1024 / 1024).toFixed(1)
  const heapPercent = ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(0)
  const totalMem    = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1)
  const freeMem     = (os.freemem() / 1024 / 1024 / 1024).toFixed(1)
  const cpuCount    = os.cpus().length
  const platform    = `${os.platform()} ${os.arch()}`

  const commandsByFolder = getCommandsByFolder()
  const totalCommands = Object.values(commandsByFolder).reduce((a, b) => a + b, 0)
  const folderText = Object.entries(commandsByFolder)
    .map(([folder, count]) => {
      const emojis = { admin: "⚙️", moderation: "🛡️", economy: "💰", ai: "🤖", roles: "🎭", tickets: "🎫", protection: "🔒", stats: "📊", xp: "⭐", events: "🎉" }
      return `${emojis[folder] || "📁"} **${folder}**: ${count}`
    })
    .join("\n")

  const totalFiles = countFiles(path.join(__dirname, "../../"))

  // قاعدة البيانات
  let dbStatus = "❌ غير متصل"
  let dbDetails = ""
  try {
    const dbStart = Date.now()
    await database.query("SELECT 1")
    const dbPing = Date.now() - dbStart

    const [users, items, warns, subs] = await Promise.all([
      database.query("SELECT COUNT(*) as c FROM economy_users"),
      database.query("SELECT COUNT(*) as c FROM inventory"),
      database.query("SELECT COUNT(*) as c FROM warnings"),
      database.query("SELECT COUNT(*) as c FROM subscriptions WHERE status = 'active'")
    ])

    dbStatus = `✅ متصل (${dbPing}ms)`
    dbDetails = `👥 المستخدمون: **${users.rows[0]?.c || 0}**\n`
    dbDetails += `📦 الممتلكات: **${items.rows[0]?.c || 0}**\n`
    dbDetails += `⚠️ التحذيرات: **${warns.rows[0]?.c || 0}**\n`
    dbDetails += `👑 الاشتراكات: **${subs.rows[0]?.c || 0}**`
  } catch {
    dbStatus = "🔴 غير متصل"
  }

  // أكبر 5 سيرفرات
  const topGuilds = client.guilds.cache
    .sort((a, b) => b.memberCount - a.memberCount)
    .first(5)
    .map((g, i) => {
      const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"]
      return `${medals[i]} **${g.name}** — ${g.memberCount.toLocaleString("ar-SA")} عضو`
    })
    .join("\n")

  // ✨ مؤشر صحة الذاكرة
  const heapEmoji = heapPercent < 60 ? "🟢" : heapPercent < 80 ? "🟡" : "🔴"

  return new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle("🛠️ لوحة تحكم المطور")
    .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      {
        name: "📊 Discord",
        value: `🌐 السيرفرات: **${totalServers}**\n👥 المستخدمون: **${totalUsers.toLocaleString("ar-SA")}**\n📡 القنوات: **${totalChannels}**`,
        inline: true
      },
      {
        name: "📡 الشبكة",
        value: `🏓 البوابة: **${gatewayPing}ms**\n⚡ الاستجابة: **${apiPing}ms**`,
        inline: true
      },
      {
        name: "⏱ التشغيل",
        value: uptime,
        inline: true
      },
      {
        name: "💾 النظام",
        value: `📊 RSS: **${rss} MB**\n${heapEmoji} Heap: **${heap}/${heapTotal} MB** (${heapPercent}%)\n🖥️ **${platform}**\n🧮 المعالجات: **${cpuCount}** | 💽 **${freeMem}/${totalMem} GB**`,
        inline: false
      },
      {
        name: `🤖 الأوامر (${totalCommands})`,
        value: `${folderText}\n📁 إجمالي الملفات: **${totalFiles}**`,
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
}

// ✅ Embed الاستخدام
async function buildUsageEmbed(client) {
  const embed = new EmbedBuilder()
    .setColor(0x3b82f6)
    .setTitle("📈 إحصائيات الاستخدام")
    .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setTimestamp()

  try {
    const topCommands = await database.query(
      "SELECT command, count FROM analytics ORDER BY count DESC LIMIT 10"
    )
    const totalUsage = await database.query(
      "SELECT SUM(count) as total FROM analytics"
    )

    const total = parseInt(totalUsage.rows[0]?.total || 0)
    embed.setDescription(`📊 إجمالي الأوامر المستخدمة: **${total.toLocaleString("ar-SA")}**`)

    if (topCommands.rows.length > 0) {
      const medals = ["🥇", "🥈", "🥉"]
      const commandsList = topCommands.rows
        .map((r, i) => {
          const rank = i < 3 ? medals[i] : `\`#${i + 1}\``
          const percentage = total > 0 ? ((r.count / total) * 100).toFixed(1) : 0
          return `${rank} \`/${r.command}\` — **${r.count}** مرة (${percentage}%)`
        })
        .join("\n")

      embed.addFields({ name: "🏆 أكثر الأوامر استخداماً", value: commandsList, inline: false })
    }

    const economyStats = await database.query(
      "SELECT COUNT(*) as users, SUM(coins) as total_coins FROM economy_users WHERE coins > 0"
    )
    const totalCoins  = parseInt(economyStats.rows[0]?.total_coins || 0)
    const activeUsers = parseInt(economyStats.rows[0]?.users || 0)

    const richest = await database.query(
      "SELECT user_id, coins FROM economy_users ORDER BY coins DESC LIMIT 1"
    )

    let economyText = `👥 لاعبين نشطين: **${activeUsers}**\n💰 إجمالي الكوينز: **${totalCoins.toLocaleString("ar-SA")}**`

    if (richest.rows[0]) {
      economyText += `\n👑 أغنى لاعب: <@${richest.rows[0].user_id}> — **${richest.rows[0].coins.toLocaleString("ar-SA")}** كوين`
    }

    embed.addFields({ name: "💰 إحصائيات الاقتصاد", value: economyText, inline: false })

  } catch (err) {
    embed.setDescription("❌ ما قدرت أجلب إحصائيات الاستخدام.")
  }

  return embed
}

// ✅ Embed السيرفرات
async function buildServersEmbed(client) {
  const guilds = client.guilds.cache
    .sort((a, b) => b.memberCount - a.memberCount)
    .first(15)

  const embed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle("🌐 السيرفرات")
    .setDescription(`إجمالي: **${client.guilds.cache.size}** سيرفر`)
    .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setTimestamp()

  let serverList = ""
  guilds.forEach((g, i) => {
    const medals = ["🥇", "🥈", "🥉"]
    const rank = i < 3 ? medals[i] : `\`#${i + 1}\``
    serverList += `${rank} **${g.name}**\n    👥 ${g.memberCount.toLocaleString("ar-SA")} عضو | 📡 ${g.channels.cache.size} قناة\n\n`
  })

  embed.addFields({ name: "📊 الترتيب حسب الأعضاء", value: serverList || "لا يوجد", inline: false })

  return embed
}

// ✅ الأزرار
function buildButtons(activePage) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("dev_main")
      .setLabel("الرئيسية")
      .setStyle(activePage === "main" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setEmoji("🛠️"),
    new ButtonBuilder()
      .setCustomId("dev_usage")
      .setLabel("الاستخدام")
      .setStyle(activePage === "usage" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setEmoji("📈"),
    new ButtonBuilder()
      .setCustomId("dev_servers")
      .setLabel("السيرفرات")
      .setStyle(activePage === "servers" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setEmoji("🌐"),
    new ButtonBuilder()
      .setCustomId("dev_refresh")
      .setLabel("تحديث")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🔄"),
    new ButtonBuilder()
      .setLabel("الداشبورد")
      .setStyle(ButtonStyle.Link)
      .setURL("https://rcif-dashboard.onrender.com")
      .setEmoji("🔗"),
  )
}

// ══════════════════════════════════════════════════════════════════
//  المعالج الرئيسي للأمر البريفكس
//  يُستدعى من events/messageCreate.js
// ══════════════════════════════════════════════════════════════════
async function handleDeveloperCommand(message, client) {
  try {
    // ✅ فحص: المالك فقط
    if (!ownerSystem.isOwner(message.author.id)) {
      // ما نرد ولا نسوي شي — كأن الأمر ما موجود (الإخفاء التام)
      return
    }

    const mainEmbed = await buildMainEmbed(client, message)
    const buttons   = buildButtons("main")

    const response = await message.reply({
      embeds: [mainEmbed],
      components: [buttons],
      allowedMentions: { repliedUser: false }
    })

    // ✅ collector للأزرار (5 دقائق)
    const collector = response.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 300000
    })

    collector.on("collect", async (i) => {
      try {
        let embed
        let page

        switch (i.customId) {
          case "dev_main":
            embed = await buildMainEmbed(client, message)
            page = "main"
            break
          case "dev_usage":
            embed = await buildUsageEmbed(client)
            page = "usage"
            break
          case "dev_servers":
            embed = await buildServersEmbed(client)
            page = "servers"
            break
          case "dev_refresh":
            embed = await buildMainEmbed(client, message)
            page = "main"
            break
          default:
            return
        }

        await i.update({
          embeds: [embed],
          components: [buildButtons(page)]
        })
      } catch (err) {
        console.error("[DEV BUTTON ERROR]", err)
      }
    })

    collector.on("end", async () => {
      try {
        await response.edit({ components: [] })
      } catch {}
    })

  } catch (err) {
    console.error("[DEV PANEL ERROR]", err)
    try {
      await message.reply({ content: "❌ حدث خطأ في لوحة المطور." })
    } catch {}
  }
}

// ══════════════════════════════════════════════════════════════════
//  EXPORTS
//  ⚠️ ما نصدّر data — هذا يخلّي commandHandler يتجاهل الملف
//   ويمنع تسجيله كـ slash command.
// ══════════════════════════════════════════════════════════════════
module.exports = {
  DEV_PREFIXES,
  handleDeveloperCommand
}