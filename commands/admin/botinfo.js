const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, version } = require("discord.js")

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

  async execute(interaction) {
    try {
      const client = interaction.client
      const startTime = Date.now()

      // ✅ حساب البينق
      await interaction.deferReply()
      const apiPing = Date.now() - startTime
      const gatewayPing = client.ws.ping

      // ✅ إحصائيات
      const totalServers = client.guilds.cache.size
      const totalUsers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0)
      const totalChannels = client.channels.cache.size
      const uptime = formatUptime(process.uptime())

      // ✅ الذاكرة
      const memUsage = process.memoryUsage()
      const memMB = (memUsage.rss / 1024 / 1024).toFixed(1)

      // ✅ عدد الأوامر
      const commandCount = client.commands?.size || 0

      // ✅ تحديد حالة البينق
      let pingStatus, pingColor
      if (gatewayPing < 100) {
        pingStatus = "🟢 ممتاز"
        pingColor = 0x22c55e
      } else if (gatewayPing < 200) {
        pingStatus = "🟡 جيد"
        pingColor = 0xf59e0b
      } else {
        pingStatus = "🔴 بطيء"
        pingColor = 0xef4444
      }

      // ✅ تاريخ إنشاء البوت
      const createdAt = client.user.createdAt
      const createdTimestamp = Math.floor(createdAt.getTime() / 1000)

      // ✅ Embed
      const embed = new EmbedBuilder()
        .setColor(pingColor)
        .setTitle(`🤖 ${client.user.username}`)
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setDescription("بوت متكامل للإدارة والاقتصاد والذكاء الاصطناعي")
        .addFields(
          { name: "📡 البينق", value: `**البوابة:** ${gatewayPing}ms\n**الاستجابة:** ${apiPing}ms\n**الحالة:** ${pingStatus}`, inline: true },
          { name: "⏱ وقت التشغيل", value: uptime, inline: true },
          { name: "💾 الذاكرة", value: `${memMB} MB`, inline: true },
          { name: "🌐 السيرفرات", value: `**${totalServers}**`, inline: true },
          { name: "👥 المستخدمون", value: `**${totalUsers.toLocaleString("ar-SA")}**`, inline: true },
          { name: "📡 القنوات", value: `**${totalChannels}**`, inline: true },
          { name: "⚡ الأوامر", value: `**${commandCount}** أمر`, inline: true },
          { name: "📦 الإصدار", value: `discord.js **v${version}**\nNode **${process.version}**`, inline: true },
          { name: "📅 تاريخ الإنشاء", value: `<t:${createdTimestamp}:D>`, inline: true }
        )
        .setFooter({ text: `طلب من: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp()

      // ✅ أزرار
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("الداشبورد")
          .setStyle(ButtonStyle.Link)
          .setURL("https://rcif-dashboard.onrender.com")
          .setEmoji("🌐"),
        new ButtonBuilder()
          .setLabel("ادعم المشروع")
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