const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, version } = require("discord.js")
const database = require("../../systems/databaseSystem")

function formatUptime(seconds) {
  seconds = Math.floor(seconds)
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const parts = []
  if (days > 0) parts.push(`${days} يوم`)
  if (hours > 0) parts.push(`${hours} ساعة`)
  if (minutes > 0) parts.push(`${minutes} دقيقة`)
  if (secs > 0 && days === 0) parts.push(`${secs} ثانية`)

  return parts.join(" و ") || "0 ثانية"
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("بوت")
    .setDescription("عرض معلومات وإحصائيات البوت")
    .setDMPermission(false),

  helpMeta: {
    category: "info",
    aliases: ["botinfo", "stats", "بوت"],
    description: "عرض معلومات وإحصائيات البوت (سيرفرات، مستخدمين، اتصال، أداء)",
    options: [],
    requirements: {
      botRoleHierarchy: false,
      userPermissions: [],
      subscriptionTier: "free"
    },
    cooldown: 0,
    relatedCommands: ["السيرفر"],
    examples: ["/بوت"],
    notes: [
      "يعرض ping البوابة + ping API + ping قاعدة البيانات",
      "يعرض أكثر 3 أوامر استخداماً",
      "أزرار سريعة: دعوة البوت + الداشبورد + الاشتراكات"
    ]
  },

  async execute(interaction) {
    try {
      const client = interaction.client
      const startTime = Date.now()

      await interaction.deferReply()
      const apiPing = Date.now() - startTime
      const gatewayPing = client.ws.ping

      const totalServers = client.guilds.cache.size
      const totalUsers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0)
      const totalChannels = client.channels.cache.size
      const uptime = formatUptime(process.uptime())
      const commandCount = client.commands?.size || 0
      const memMB = (process.memoryUsage().rss / 1024 / 1024).toFixed(1)

      let pingEmoji, pingColor
      if (gatewayPing < 100) {
        pingEmoji = "🟢"
        pingColor = 0x22c55e
      } else if (gatewayPing < 200) {
        pingEmoji = "🟡"
        pingColor = 0xf59e0b
      } else {
        pingEmoji = "🔴"
        pingColor = 0xef4444
      }

      // ✅ FIX: الجدول الصحيح هو guilds (وليس guild_settings)
      // نستخدم guildSystem لجلب الإعدادات بدل query مباشر
      let systemsText = ""
      try {
        const guildId = interaction.guild.id

        const result = await database.query(
          "SELECT ai_enabled, xp_enabled, economy_enabled FROM guilds WHERE id = $1",
          [guildId]
        )
        const row = result.rows[0]

        const settings = row
          ? {
              ai:      row.ai_enabled      !== false,
              xp:      row.xp_enabled      !== false,
              economy: row.economy_enabled !== false
            }
          : { ai: true, xp: true, economy: true }

        systemsText = [
          `${settings.ai      ? "🟢" : "🔴"} الذكاء الاصطناعي — ${settings.ai      ? "شغال" : "متوقف"}`,
          `${settings.xp      ? "🟢" : "🔴"} نظام XP — ${settings.xp               ? "شغال" : "متوقف"}`,
          `${settings.economy ? "🟢" : "🔴"} نظام الاقتصاد — ${settings.economy    ? "شغال" : "متوقف"}`
        ].join("\n")

      } catch {
        systemsText = "🟢 الذكاء الاصطناعي — شغال\n🟢 نظام XP — شغال\n🟢 نظام الاقتصاد — شغال"
      }

      // ✅ عداد الأوامر المستخدمة
      let totalCommandsUsed = 0
      try {
        const analyticsResult = await database.query(
          "SELECT SUM(count) as total FROM analytics"
        )
        totalCommandsUsed = parseInt(analyticsResult.rows[0]?.total || 0)
      } catch {}

      // ✅ أكثر 3 أوامر استخداماً
      let topCommandsText = ""
      try {
        const topResult = await database.query(
          "SELECT command, count FROM analytics ORDER BY count DESC LIMIT 3"
        )
        if (topResult.rows.length > 0) {
          const medals = ["🥇", "🥈", "🥉"]
          topCommandsText = topResult.rows
            .map((r, i) => `${medals[i]} \`/${r.command}\` — ${r.count} مرة`)
            .join("\n")
        }
      } catch {}

      // ✅ حالة قاعدة البيانات
      let dbStatus = "❌ غير متصل"
      try {
        const dbStart = Date.now()
        await database.query("SELECT 1")
        const dbPing = Date.now() - dbStart
        dbStatus = `🟢 متصل (${dbPing}ms)`
      } catch {
        dbStatus = "🔴 غير متصل"
      }

      const createdTimestamp = Math.floor(client.user.createdAt.getTime() / 1000)

      const embed = new EmbedBuilder()
        .setColor(pingColor)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL({ dynamic: true }) })
        .setTitle("📊 معلومات البوت")
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setDescription("بوت متكامل للإدارة والاقتصاد والذكاء الاصطناعي 🤖")
        .addFields(
          {
            name: "📡 الاتصال",
            value: `${pingEmoji} البوابة: **${gatewayPing}ms**\n⚡ الاستجابة: **${apiPing}ms**\n🗄️ قاعدة البيانات: ${dbStatus}`,
            inline: true
          },
          {
            name: "📊 الإحصائيات",
            value: `🌐 السيرفرات: **${totalServers}**\n👥 المستخدمون: **${totalUsers.toLocaleString("ar-SA")}**\n📡 القنوات: **${totalChannels}**`,
            inline: true
          },
          {
            name: "🤖 البوت",
            value: `⚡ الأوامر: **${commandCount}**\n⏱ التشغيل: **${uptime}**\n💾 الذاكرة: **${memMB} MB**`,
            inline: true
          },
          {
            name: "⚙️ حالة الأنظمة",
            value: systemsText,
            inline: false
          }
        )

      if (totalCommandsUsed > 0) {
        let usageText = `📈 إجمالي الاستخدام: **${totalCommandsUsed.toLocaleString("ar-SA")}** أمر`
        if (topCommandsText) {
          usageText += `\n\n${topCommandsText}`
        }
        embed.addFields({ name: "🏆 الأوامر الأكثر استخداماً", value: usageText, inline: false })
      }

      embed.addFields(
        { name: "📦 الإصدار", value: `discord.js **v${version}**\nNode **${process.version}**`, inline: true },
        { name: "📅 تاريخ الإنشاء", value: `<t:${createdTimestamp}:D>\n(<t:${createdTimestamp}:R>)`, inline: true }
      )

      embed.setFooter({ text: `طلب من: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      embed.setTimestamp()

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("دعوة البوت")
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`)
          .setEmoji("🤖"),
        new ButtonBuilder()
          .setLabel("الداشبورد")
          .setStyle(ButtonStyle.Link)
          .setURL("https://rcif-dashboard.onrender.com")
          .setEmoji("🌐"),
        new ButtonBuilder()
          .setLabel("الاشتراكات")
          .setStyle(ButtonStyle.Link)
          .setURL("https://rcif-dashboard.onrender.com")
          .setEmoji("💎")
      )

      return interaction.editReply({ embeds: [embed], components: [row] })

    } catch (err) {
      console.error("[BOT INFO ERROR]", err)

      if (interaction.deferred) {
        return interaction.editReply({ content: "❌ حدث خطأ في عرض معلومات البوت." })
      }
      if (!interaction.replied) {
        return interaction.reply({ content: "❌ حدث خطأ في عرض معلومات البوت.", ephemeral: true })
      }
    }
  },
}