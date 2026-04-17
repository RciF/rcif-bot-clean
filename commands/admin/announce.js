const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js")

const commandGuardSystem = require("../../systems/commandGuardSystem")
const logger = require("../../systems/loggerSystem")

// ══════════════════════════════════════
//  COLOR PALETTE
// ══════════════════════════════════════
const COLORS = {
  blue:   0x3b82f6,
  green:  0x22c55e,
  red:    0xef4444,
  yellow: 0xeab308,
  purple: 0x8b5cf6,
  orange: 0xf97316,
  pink:   0xec4899,
  cyan:   0x06b6d4,
  gold:   0xfbbf24,
  dark:   0x2b2d31
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("إعلان")
    .setDescription("إرسال إعلان رسمي بشكل Embed احترافي")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addChannelOption(option =>
      option
        .setName("القناة")
        .setDescription("القناة المستهدفة")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    )
    .addStringOption(option =>
      option
        .setName("العنوان")
        .setDescription("عنوان الإعلان")
        .setRequired(true)
        .setMaxLength(256)
    )
    .addStringOption(option =>
      option
        .setName("المحتوى")
        .setDescription("نص الإعلان (استخدم \\n للسطر الجديد)")
        .setRequired(true)
        .setMaxLength(4000)
    )
    .addStringOption(option =>
      option
        .setName("اللون")
        .setDescription("لون الـ embed")
        .setRequired(false)
        .addChoices(
          { name: "أزرق | Blue",     value: "blue"   },
          { name: "أخضر | Green",    value: "green"  },
          { name: "أحمر | Red",      value: "red"    },
          { name: "أصفر | Yellow",   value: "yellow" },
          { name: "بنفسجي | Purple", value: "purple" },
          { name: "برتقالي | Orange", value: "orange" },
          { name: "وردي | Pink",     value: "pink"   },
          { name: "سماوي | Cyan",    value: "cyan"   },
          { name: "ذهبي | Gold",     value: "gold"   },
          { name: "داكن | Dark",     value: "dark"   }
        )
    )
    .addStringOption(option =>
      option
        .setName("الصورة")
        .setDescription("رابط الصورة (اختياري)")
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName("صورة_مصغرة")
        .setDescription("رابط الصورة المصغرة في الزاوية (اختياري)")
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName("التذييل")
        .setDescription("نص التذييل أسفل الـ embed (اختياري)")
        .setRequired(false)
        .setMaxLength(2048)
    )
    .addStringOption(option =>
      option
        .setName("منشن")
        .setDescription("منشن قبل الإعلان (اختياري)")
        .setRequired(false)
        .addChoices(
          { name: "الكل | @everyone",   value: "everyone" },
          { name: "الموجودين | @here", value: "here"     },
          { name: "بدون منشن | None",   value: "none"     }
        )
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({
          content: "❌ هذا الأمر داخل السيرفر فقط",
          ephemeral: true
        })
      }

      const isAdmin = commandGuardSystem.requireAdmin(interaction)
      if (!isAdmin) {
        return interaction.reply({
          content: "❌ هذا الأمر للأدمن فقط",
          ephemeral: true
        })
      }

      await interaction.deferReply({ ephemeral: true })

      const channel   = interaction.options.getChannel("القناة")
      const title     = interaction.options.getString("العنوان")
      const content   = interaction.options.getString("المحتوى")
      const colorKey  = interaction.options.getString("اللون") || "blue"
      const imageUrl  = interaction.options.getString("الصورة")
      const thumbUrl  = interaction.options.getString("صورة_مصغرة")
      const footer    = interaction.options.getString("التذييل")
      const mention   = interaction.options.getString("منشن") || "none"

      // ── تحقق من صلاحيات البوت في القناة المستهدفة
      const botPerms = channel.permissionsFor(interaction.guild.members.me)
      if (!botPerms?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
        return interaction.editReply({
          content: `❌ البوت ما عنده صلاحيات إرسال الرسائل أو embeds في ${channel}`
        })
      }

      // ── تحويل \n النصي لسطر جديد حقيقي
      const parsedContent = content.replace(/\\n/g, "\n")

      // ── بناء الـ embed
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(parsedContent)
        .setColor(COLORS[colorKey] || COLORS.blue)
        .setTimestamp()

      if (imageUrl) {
        if (!isValidUrl(imageUrl)) {
          return interaction.editReply({ content: "❌ رابط الصورة غير صالح" })
        }
        embed.setImage(imageUrl)
      }

      if (thumbUrl) {
        if (!isValidUrl(thumbUrl)) {
          return interaction.editReply({ content: "❌ رابط الصورة المصغرة غير صالح" })
        }
        embed.setThumbnail(thumbUrl)
      }

      if (footer) {
        embed.setFooter({
          text: footer,
          iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
        })
      } else {
        embed.setFooter({
          text: interaction.guild.name,
          iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
        })
      }

      // ── بناء الـ content (المنشن)
      let messageContent = null
      let allowedMentions = { parse: [] }

      if (mention === "everyone") {
        messageContent = "@everyone"
        allowedMentions = { parse: ["everyone"] }
      } else if (mention === "here") {
        messageContent = "@here"
        allowedMentions = { parse: ["everyone"] }
      }

      // ── الإرسال
      const sentMsg = await channel.send({
        content: messageContent,
        embeds: [embed],
        allowedMentions
      })

      // ── رسالة تأكيد للأدمن
      const confirmEmbed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle("✅ تم إرسال الإعلان")
        .addFields(
          { name: "📢 القناة",  value: `${channel}`,              inline: true },
          { name: "🎨 اللون",   value: colorKey,                  inline: true },
          { name: "🔔 المنشن",  value: mention,                   inline: true },
          { name: "🔗 الرابط",  value: `[اضغط هنا](${sentMsg.url})` }
        )
        .setTimestamp()

      return interaction.editReply({ embeds: [confirmEmbed] })

    } catch (error) {
      logger.error("ANNOUNCE_COMMAND_FAILED", { error: error.message })

      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content: "❌ فشل إرسال الإعلان" }).catch(() => {})
      }
      return interaction.reply({
        content: "❌ فشل إرسال الإعلان",
        ephemeral: true
      }).catch(() => {})
    }
  }
}

// ══════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════
function isValidUrl(str) {
  try {
    const url = new URL(str)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}