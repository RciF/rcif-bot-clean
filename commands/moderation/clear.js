const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")
const discordLog = require("../../systems/discordLogSystem")

const MAX_BULK_DELETE  = 100
const MAX_MESSAGE_AGE  = 14 * 24 * 60 * 60 * 1000

module.exports = {
  data: new SlashCommandBuilder()
    .setName("مسح")
    .setDescription("مسح رسائل من القناة الحالية مع فلاتر متقدمة")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(option =>
      option.setName("العدد").setDescription("عدد الرسائل المراد مسحها (1 - 100)").setRequired(true).setMinValue(1).setMaxValue(100)
    )
    .addUserOption(option =>
      option.setName("العضو").setDescription("مسح رسائل عضو معين فقط (اختياري)").setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName("الفلتر")
        .setDescription("فلتر نوع الرسائل (اختياري)")
        .setRequired(false)
        .addChoices(
          { name: "🤖 رسائل البوتات فقط",               value: "bots"        },
          { name: "👤 رسائل البشر فقط",                  value: "humans"      },
          { name: "🔗 رسائل فيها روابط",                 value: "links"       },
          { name: "📎 رسائل فيها مرفقات (صور/ملفات)",   value: "attachments" },
          { name: "📌 رسائل فيها إمبد",                  value: "embeds"      },
          { name: "📢 رسائل فيها منشنات",                value: "mentions"    }
        )
    )
    .addStringOption(option =>
      option.setName("السبب").setDescription("سبب المسح (اختياري — يظهر في اللوق)").setRequired(false)
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const amount     = interaction.options.getInteger("العدد")
      const targetUser = interaction.options.getUser("العضو")
      const filter     = interaction.options.getString("الفلتر")
      const reason     = interaction.options.getString("السبب") || "بدون سبب"

      if (!interaction.channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ content: "❌ البوت ما عنده صلاحية **إدارة الرسائل** في هذي القناة.", ephemeral: true })
      }

      await interaction.deferReply({ ephemeral: true })

      let fetched
      try {
        fetched = await interaction.channel.messages.fetch({ limit: MAX_BULK_DELETE })
      } catch {
        return interaction.editReply({ content: "❌ ما قدرت أجلب الرسائل من القناة." })
      }

      const now = Date.now()
      let filtered = fetched.filter(msg => (now - msg.createdTimestamp) < MAX_MESSAGE_AGE)

      if (targetUser) filtered = filtered.filter(msg => msg.author.id === targetUser.id)

      if (filter) {
        switch (filter) {
          case "bots":        filtered = filtered.filter(msg => msg.author.bot); break
          case "humans":      filtered = filtered.filter(msg => !msg.author.bot); break
          case "links":       filtered = filtered.filter(msg => /https?:\/\/[^\s]+/i.test(msg.content)); break
          case "attachments": filtered = filtered.filter(msg => msg.attachments.size > 0); break
          case "embeds":      filtered = filtered.filter(msg => msg.embeds.length > 0); break
          case "mentions":    filtered = filtered.filter(msg => msg.mentions.users.size > 0 || msg.mentions.roles.size > 0 || msg.mentions.everyone); break
        }
      }

      const toDelete = [...filtered.values()].slice(0, amount)

      if (toDelete.length === 0) {
        return interaction.editReply({ content: "⚠️ ما لقيت رسائل تطابق الفلتر المطلوب أو كلها أقدم من 14 يوم." })
      }

      let deleted
      try {
        deleted = await interaction.channel.bulkDelete(toDelete, true)
      } catch (err) {
        console.error("[CLEAR ERROR] bulkDelete:", err.message)
        return interaction.editReply({ content: "❌ فشل حذف الرسائل. تأكد إن الرسائل ما تكون أقدم من 14 يوم." })
      }

      const deletedMessages     = [...deleted.values()]
      const botMessages         = deletedMessages.filter(msg => msg.author?.bot).length
      const humanMessages       = deletedMessages.filter(msg => msg.author && !msg.author.bot).length
      const attachmentMessages  = deletedMessages.filter(msg => msg.attachments?.size > 0).length
      const linkMessages        = deletedMessages.filter(msg => /https?:\/\/[^\s]+/i.test(msg.content || "")).length

      const authorCounts = {}
      deletedMessages.forEach(msg => {
        if (msg.author) {
          const key = msg.author.id
          authorCounts[key] = authorCounts[key] || { user: msg.author, count: 0 }
          authorCounts[key].count++
        }
      })
      const topAuthors = Object.values(authorCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map((a, i) => `${i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} ${a.user.username}: **${a.count}** رسالة`)
        .join("\n")

      const filterLabels = {
        bots: "🤖 رسائل البوتات", humans: "👤 رسائل البشر",
        links: "🔗 رسائل فيها روابط", attachments: "📎 رسائل فيها مرفقات",
        embeds: "📌 رسائل فيها إمبد", mentions: "📢 رسائل فيها منشنات"
      }

      const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle("🗑️ تم مسح الرسائل")
        .addFields(
          { name: "📊 الإجمالي", value: `**${deleted.size}** رسالة من أصل **${amount}** مطلوبة`, inline: false },
          { name: "👤 بشر",       value: `${humanMessages}`,      inline: true },
          { name: "🤖 بوتات",     value: `${botMessages}`,        inline: true },
          { name: "📎 مرفقات",    value: `${attachmentMessages}`, inline: true },
          { name: "🔗 روابط",     value: `${linkMessages}`,       inline: true }
        )

      if (targetUser) embed.addFields({ name: "🎯 فلتر العضو",  value: `${targetUser} (\`${targetUser.username}\`)`, inline: true })
      if (filter)     embed.addFields({ name: "🔍 فلتر النوع",  value: filterLabels[filter] || filter,               inline: true })
      if (topAuthors) embed.addFields({ name: "📋 أكثر الأعضاء", value: topAuthors,                                  inline: false })

      embed.addFields(
        { name: "📝 السبب",   value: reason,                                                          inline: false },
        { name: "👮 بواسطة",  value: `${interaction.user} (\`${interaction.user.username}\`)`,        inline: true  },
        { name: "📍 القناة",  value: `${interaction.channel}`,                                        inline: true  }
      )
      .setFooter({ text: "هذه الرسالة تختفي بعد 15 ثانية" })
      .setTimestamp()

      // ✅ LOG
      discordLog.logClear(interaction.guild, {
        moderator: interaction.user,
        channel:   interaction.channel,
        count:     deleted.size,
        filter:    filter ? (filterLabels[filter] || filter) : null
      }).catch(() => {})

      await interaction.editReply({ embeds: [embed] })

      try {
        const publicMsg = await interaction.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x22c55e)
              .setDescription(`🗑️ **${interaction.user.username}** مسح **${deleted.size}** رسالة من هذي القناة.`)
          ]
        })
        setTimeout(() => publicMsg.delete().catch(() => {}), 6000)
      } catch {}

    } catch (err) {
      console.error("[CLEAR ERROR]", err)

      if (interaction.deferred) {
        return interaction.editReply({ content: "❌ حدث خطأ أثناء مسح الرسائل." })
      }
      if (!interaction.replied) {
        return interaction.reply({ content: "❌ حدث خطأ أثناء مسح الرسائل.", ephemeral: true })
      }
    }
  },
}