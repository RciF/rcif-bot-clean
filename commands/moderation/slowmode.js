const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require("discord.js")

const SLOWMODE_OPTIONS = {
  "0":   0,
  "5s":  5,
  "10s": 10,
  "15s": 15,
  "30s": 30,
  "1m":  60,
  "2m":  120,
  "5m":  300,
  "10m": 600,
  "15m": 900,
  "30m": 1800,
  "1h":  3600,
  "2h":  7200,
  "6h":  21600
}

function formatSlowmode(seconds) {
  if (seconds === 0)   return "مغلق"
  if (seconds < 60)    return `${seconds} ثانية`
  if (seconds < 3600)  return `${Math.floor(seconds / 60)} دقيقة`
  return `${Math.floor(seconds / 3600)} ساعة`
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("بطيء")
    .setDescription("تفعيل أو تعطيل السلو مود في القناة")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption(option =>
      option
        .setName("المدة")
        .setDescription("مدة الانتظار بين كل رسالة")
        .setRequired(true)
        .addChoices(
          { name: "❌ إيقاف",           value: "0"   },
          { name: "⏱️ 5 ثواني",        value: "5s"  },
          { name: "⏱️ 10 ثواني",       value: "10s" },
          { name: "⏱️ 15 ثانية",       value: "15s" },
          { name: "⏱️ 30 ثانية",       value: "30s" },
          { name: "🕐 دقيقة",          value: "1m"  },
          { name: "🕐 دقيقتين",        value: "2m"  },
          { name: "🕐 5 دقائق",        value: "5m"  },
          { name: "🕐 10 دقائق",       value: "10m" },
          { name: "🕐 15 دقيقة",       value: "15m" },
          { name: "🕐 30 دقيقة",       value: "30m" },
          { name: "🕑 ساعة",           value: "1h"  },
          { name: "🕑 ساعتين",         value: "2h"  },
          { name: "🕑 6 ساعات (أقصى)", value: "6h"  }
        )
    )
    .addChannelOption(option =>
      option
        .setName("القناة")
        .setDescription("القناة المراد تعديلها (الحالية إذا ما حددت)")
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum)
    )
    .addStringOption(option =>
      option
        .setName("السبب")
        .setDescription("سبب تغيير السلو مود (اختياري)")
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر يُستخدم داخل السيرفر فقط.", ephemeral: true })
      }

      const durationKey   = interaction.options.getString("المدة")
      const targetChannel = interaction.options.getChannel("القناة") || interaction.channel
      const reason        = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

      if (!targetChannel.isTextBased() || targetChannel.isVoiceBased()) {
        return interaction.reply({ content: "❌ السلو مود يشتغل على القنوات النصية فقط.", ephemeral: true })
      }

      const botPermissions = targetChannel.permissionsFor(interaction.guild.members.me)
      if (!botPermissions || !botPermissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: "❌ البوت ما عنده صلاحية **إدارة القنوات** في هذي القناة.", ephemeral: true })
      }

      const seconds = SLOWMODE_OPTIONS[durationKey]
      if (seconds === undefined) {
        return interaction.reply({ content: "❌ مدة غير صحيحة.", ephemeral: true })
      }

      const oldSlowmode = targetChannel.rateLimitPerUser || 0
      const isDisabling = seconds === 0

      if (oldSlowmode === seconds) {
        if (isDisabling) {
          return interaction.reply({ content: "⚠️ السلو مود مغلق أصلاً في هذي القناة.", ephemeral: true })
        }
        return interaction.reply({ content: `⚠️ السلو مود بالفعل **${formatSlowmode(seconds)}** في هذي القناة.`, ephemeral: true })
      }

      await targetChannel.setRateLimitPerUser(seconds, `${reason} | بواسطة: ${interaction.user.username}`)

      const embed = new EmbedBuilder()
        .setTimestamp()
        .setFooter({ text: `بواسطة: ${interaction.user.username}` })

      if (isDisabling) {
        embed.setColor(0x22c55e)
        embed.setTitle("⚡ تم إيقاف السلو مود")
        embed.addFields(
          { name: "📍 القناة",  value: `${targetChannel}`,                                          inline: true },
          { name: "🕐 كان",     value: formatSlowmode(oldSlowmode),                                  inline: true },
          { name: "🔄 الآن",    value: "مغلق",                                                       inline: true },
          { name: "📝 السبب",   value: reason,                                                        inline: false },
          { name: "👮 بواسطة",  value: `${interaction.user} (\`${interaction.user.username}\`)`,     inline: true }
        )
      } else {
        embed.setColor(0xf59e0b)
        embed.setTitle("🐌 تم تفعيل السلو مود")
        embed.addFields(
          { name: "📍 القناة",  value: `${targetChannel}`,                                          inline: true },
          { name: "🕐 كان",     value: formatSlowmode(oldSlowmode),                                  inline: true },
          { name: "🆕 الآن",    value: formatSlowmode(seconds),                                      inline: true },
          { name: "📝 السبب",   value: reason,                                                        inline: false },
          { name: "👮 بواسطة",  value: `${interaction.user} (\`${interaction.user.username}\`)`,     inline: true }
        )
      }

      return interaction.reply({ embeds: [embed] })

    } catch (err) {
      console.error("[SLOWMODE ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء تعديل السلو مود.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء تعديل السلو مود.", ephemeral: true })
    }
  },
}