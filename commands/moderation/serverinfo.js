const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")

const VERIFICATION_LEVELS = {
  0: "❌ لا يوجد",
  1: "📧 إيميل مؤكد",
  2: "⏱️ عضو منذ 5 دقائق",
  3: "👤 عضو منذ 10 دقائق",
  4: "📱 هاتف مؤكد"
}

const BOOST_LEVELS = {
  0: "لا يوجد",
  1: "المستوى 1",
  2: "المستوى 2",
  3: "المستوى 3"
}

const CONTENT_FILTER = {
  0: "❌ معطّل",
  1: "🔍 الأعضاء بدون رتب",
  2: "🔍 جميع الأعضاء"
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("السيرفر")
    .setDescription("عرض معلومات تفصيلية عن السيرفر")
    .setDMPermission(false),

  helpMeta: {
    category: "info",
    aliases: ["serverinfo", "guildinfo", "السيرفر"],
    description: "عرض معلومات تفصيلية عن السيرفر (الأعضاء، القنوات، البوست، الميزات)",
    options: [],
    requirements: {
      botRoleHierarchy: false,
      userPermissions: [],
      subscriptionTier: "free"
    },
    cooldown: 0,
    relatedCommands: ["معلومات", "إحصائيات"],
    examples: ["/السيرفر"],
    notes: [
      "يعرض مستوى التحقق، فلتر المحتوى، وميزات السيرفر",
      "يعرض البانر لو موجود",
      "متاح للجميع"
    ]
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({
          content: "❌ هذا الأمر داخل السيرفر فقط",
          ephemeral: true
        })
      }

      await interaction.deferReply()

      const guild = await interaction.guild.fetch()
      await guild.members.fetch()

      const totalMembers  = guild.memberCount
      const humans        = guild.members.cache.filter(m => !m.user.bot).size
      const bots          = guild.members.cache.filter(m => m.user.bot).size

      const { ChannelType } = require("discord.js")
      const channels      = guild.channels.cache
      const textChannels  = channels.filter(c => c.type === ChannelType.GuildText).size
      const voiceChannels = channels.filter(c => c.type === ChannelType.GuildVoice).size
      const categories    = channels.filter(c => c.type === ChannelType.GuildCategory).size
      const forums        = channels.filter(c => c.type === ChannelType.GuildForum).size

      const createdTimestamp = Math.floor(guild.createdAt.getTime() / 1000)

      const owner = await guild.fetchOwner().catch(() => null)
      const ownerText = owner ? `${owner.user} (\`${owner.user.username}\`)` : "غير معروف"

      const boostCount = guild.premiumSubscriptionCount || 0
      const boostLevel = guild.premiumTier
      const boostEmoji = boostCount >= 14 ? "💜" : boostCount >= 7 ? "💙" : boostCount >= 2 ? "💚" : "🩶"

      const rolesCount = guild.roles.cache.filter(r => r.id !== guild.id).size

      const emojisCount   = guild.emojis.cache.size
      const animatedEmoji = guild.emojis.cache.filter(e => e.animated).size
      const staticEmoji   = emojisCount - animatedEmoji

      const featureEmojis = {
        COMMUNITY:              "🌐 مجتمع",
        PARTNERED:              "🤝 بارتنر",
        VERIFIED:               "✅ موثّق",
        DISCOVERABLE:           "🔍 قابل للاكتشاف",
        VANITY_URL:             "🔗 رابط مخصص",
        ANIMATED_ICON:          "🖼️ أيقونة متحركة",
        ANIMATED_BANNER:        "🎨 بانر متحرك",
        BANNER:                 "🎨 بانر",
        WELCOME_SCREEN_ENABLED: "👋 شاشة ترحيب",
        MONETIZATION_ENABLED:   "💰 ربح مالي",
      }
      const features = guild.features
        .filter(f => featureEmojis[f])
        .map(f => featureEmojis[f])

      const embedColor = guild.roles.cache
        .filter(r => r.color && r.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .first()?.color || 0x5865f2

      const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`🏠 ${guild.name}`)
        .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
        .addFields(
          {
            name: "👑 المالك",
            value: ownerText,
            inline: true
          },
          {
            name: "🆔 معرّف السيرفر",
            value: `\`${guild.id}\``,
            inline: true
          },
          {
            name: "📅 تاريخ الإنشاء",
            value: `<t:${createdTimestamp}:D>\n<t:${createdTimestamp}:R>`,
            inline: true
          },
          {
            name: `👥 الأعضاء (${totalMembers})`,
            value: `👤 بشر: **${humans}**\n🤖 بوتات: **${bots}**`,
            inline: false
          },
          {
            name: `📡 القنوات (${channels.size})`,
            value: `💬 نصية: **${textChannels}** | 🔊 صوتية: **${voiceChannels}**\n📁 فئات: **${categories}** | 💬 منتديات: **${forums}**`,
            inline: false
          },
          {
            name: "🚀 البوست",
            value: `${boostEmoji} **${BOOST_LEVELS[boostLevel] || "لا يوجد"}** — ${boostCount} بوست`,
            inline: true
          },
          {
            name: "🎭 الرتب",
            value: `**${rolesCount}** رتبة`,
            inline: true
          },
          {
            name: "😀 الإيموجي",
            value: `**${emojisCount}** (${animatedEmoji} متحركة | ${staticEmoji} ثابتة)`,
            inline: true
          },
          {
            name: "🔒 مستوى التحقق",
            value: VERIFICATION_LEVELS[guild.verificationLevel] || "غير معروف",
            inline: true
          },
          {
            name: "🔍 فلتر المحتوى",
            value: CONTENT_FILTER[guild.explicitContentFilter] || "غير معروف",
            inline: true
          }
        )

      if (features.length > 0) {
        embed.addFields({
          name: "⭐ ميزات السيرفر",
          value: features.join(" | "),
          inline: false
        })
      }

      const bannerURL = guild.bannerURL({ size: 1024 })
      if (bannerURL) embed.setImage(bannerURL)

      embed
        .setFooter({
          text: `طلب من: ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp()

      return interaction.editReply({ embeds: [embed] })

    } catch (error) {
      console.error("[SERVERINFO ERROR]", error)

      if (interaction.deferred) {
        return interaction.editReply({ content: "❌ حصل خطأ في عرض معلومات السيرفر" })
      }
      return interaction.reply({
        content: "❌ حصل خطأ في عرض معلومات السيرفر",
        ephemeral: true
      })
    }
  },
}