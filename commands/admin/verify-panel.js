const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js")

const commandGuardSystem = require("../../systems/commandGuardSystem")
const logger = require("../../systems/loggerSystem")

const COLORS = {
  blue:   0x3b82f6,
  green:  0x22c55e,
  red:    0xef4444,
  yellow: 0xeab308,
  purple: 0x8b5cf6,
  cyan:   0x06b6d4,
  gold:   0xfbbf24
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("تحقق_لوحة")
    .setDescription("إنشاء لوحة تحقق بزر تعطي رتبة عضو للمستخدم")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addChannelOption(option =>
      option
        .setName("القناة")
        .setDescription("القناة التي ترسل فيها اللوحة")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .addRoleOption(option =>
      option
        .setName("رتبة_عضو")
        .setDescription("الرتبة التي تُعطى بعد التحقق")
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName("رتبة_جديد")
        .setDescription("الرتبة التي تُسحب بعد التحقق (اختياري)")
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName("العنوان")
        .setDescription("عنوان اللوحة")
        .setRequired(false)
        .setMaxLength(256)
    )
    .addStringOption(option =>
      option
        .setName("المحتوى")
        .setDescription("نص اللوحة (استخدم \\n للسطر الجديد)")
        .setRequired(false)
        .setMaxLength(4000)
    )
    .addStringOption(option =>
      option
        .setName("نص_الزر")
        .setDescription("النص المكتوب على الزر")
        .setRequired(false)
        .setMaxLength(80)
    )
    .addStringOption(option =>
      option
        .setName("اللون")
        .setDescription("لون الـ embed")
        .setRequired(false)
        .addChoices(
          { name: "أزرق | Blue",    value: "blue"   },
          { name: "أخضر | Green",   value: "green"  },
          { name: "أحمر | Red",     value: "red"    },
          { name: "أصفر | Yellow",  value: "yellow" },
          { name: "بنفسجي | Purple", value: "purple" },
          { name: "سماوي | Cyan",   value: "cyan"   },
          { name: "ذهبي | Gold",    value: "gold"   }
        )
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const isAdmin = commandGuardSystem.requireAdmin(interaction)
      if (!isAdmin) {
        return interaction.reply({ content: "❌ هذا الأمر للأدمن فقط", ephemeral: true })
      }

      await interaction.deferReply({ ephemeral: true })

      const channel    = interaction.options.getChannel("القناة")
      const memberRole = interaction.options.getRole("رتبة_عضو")
      const newRole    = interaction.options.getRole("رتبة_جديد")
      const title      = interaction.options.getString("العنوان") || "✅ تحقق من حسابك"
      const content    = interaction.options.getString("المحتوى") || getDefaultContent()
      const btnLabel   = interaction.options.getString("نص_الزر") || "✅ اضغط للتحقق"
      const colorKey   = interaction.options.getString("اللون") || "green"

      // تحقق من صلاحيات البوت في القناة
      const botPerms = channel.permissionsFor(interaction.guild.members.me)
      if (!botPerms?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
        return interaction.editReply({
          content: `❌ البوت ما عنده صلاحيات في ${channel}`
        })
      }

      // تحقق إن رتبة البوت أعلى من الرتب المطلوبة
      const botMember = interaction.guild.members.me
      if (memberRole.position >= botMember.roles.highest.position) {
        return interaction.editReply({
          content: `❌ رتبة **${memberRole.name}** أعلى من رتبة البوت — ارفع البوت أولاً`
        })
      }

      if (newRole && newRole.position >= botMember.roles.highest.position) {
        return interaction.editReply({
          content: `❌ رتبة **${newRole.name}** أعلى من رتبة البوت — ارفع البوت أولاً`
        })
      }

      // بناء الـ embed
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(content.replace(/\\n/g, "\n"))
        .setColor(COLORS[colorKey] || COLORS.green)
        .setFooter({
          text: interaction.guild.name,
          iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
        })
        .setTimestamp()

      // بناء الزر
      // customId يحمل: verify_panel:memberRoleId:newRoleId
      const customId = `verify_panel:${memberRole.id}:${newRole?.id || "none"}`

      const button = new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(btnLabel)
        .setStyle(ButtonStyle.Success)
        .setEmoji("✅")

      const row = new ActionRowBuilder().addComponents(button)

      // إرسال اللوحة
      const sentMsg = await channel.send({
        embeds: [embed],
        components: [row]
      })

      // رسالة تأكيد
      const confirmEmbed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle("✅ تم إنشاء لوحة التحقق")
        .addFields(
          { name: "📢 القناة",       value: `${channel}`,           inline: true },
          { name: "🏷️ رتبة عضو",     value: `${memberRole}`,        inline: true },
          { name: "🆔 الرسالة",      value: `\`${sentMsg.id}\``,    inline: true },
          { name: "🔗 الرابط",       value: `[اضغط هنا](${sentMsg.url})` }
        )

      if (newRole) {
        confirmEmbed.addFields({ name: "🏷️ رتبة جديد (تُسحب)", value: `${newRole}`, inline: true })
      }

      confirmEmbed.setTimestamp()

      return interaction.editReply({ embeds: [confirmEmbed] })

    } catch (error) {
      logger.error("VERIFY_PANEL_COMMAND_FAILED", { error: error.message })

      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content: "❌ فشل إنشاء اللوحة" }).catch(() => {})
      }
      return interaction.reply({ content: "❌ فشل إنشاء اللوحة", ephemeral: true }).catch(() => {})
    }
  }
}

// ══════════════════════════════════════
//  BUTTON HANDLER
// ══════════════════════════════════════

module.exports.handleVerifyPanelButton = async function (interaction) {
  try {
    // customId: verify_panel:memberRoleId:newRoleId
    const parts = interaction.customId.split(":")
    if (parts[0] !== "verify_panel") return false

    const memberRoleId = parts[1]
    const newRoleId    = parts[2]

    const guild  = interaction.guild
    const member = interaction.member

    const memberRole = guild.roles.cache.get(memberRoleId)
    if (!memberRole) {
      return interaction.reply({
        content: "❌ رتبة العضو غير موجودة — تواصل مع الإدارة",
        ephemeral: true
      })
    }

    // تحقق إن عنده الرتبة بالفعل
    if (member.roles.cache.has(memberRole.id)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x3b82f6)
            .setTitle("ℹ️ أنت موثّق بالفعل")
            .setDescription("لديك صلاحية الوصول لكل قنوات السيرفر.")
            .setTimestamp()
        ],
        ephemeral: true
      })
    }

    // إعطاء رتبة عضو
    try {
      await member.roles.add(memberRole, "Verification Panel")
    } catch (err) {
      return interaction.reply({
        content: "❌ البوت ما يقدر يعطي الرتبة — تأكد من صلاحياته",
        ephemeral: true
      })
    }

    // سحب رتبة جديد لو موجودة
    if (newRoleId && newRoleId !== "none") {
      const newRole = guild.roles.cache.get(newRoleId)
      if (newRole && member.roles.cache.has(newRole.id)) {
        try {
          await member.roles.remove(newRole, "Verification — remove new role")
        } catch {}
      }
    }

    // رد ترحيب
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle("✅ تم التحقق بنجاح!")
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
          .setDescription(`مرحباً **${interaction.user.username}**! 🎉\nتم منحك صلاحية الوصول للسيرفر.`)
          .setFooter({ text: "أهلاً بك في العائلة 💙" })
          .setTimestamp()
      ],
      ephemeral: true
    })

  } catch (err) {
    logger.error("VERIFY_PANEL_BUTTON_ERROR", { error: err.message })

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ حدث خطأ أثناء التحقق",
        ephemeral: true
      }).catch(() => {})
    }
    return true
  }
}

// ══════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════

function getDefaultContent() {
  return "أهلاً وسهلاً في السيرفر! 🎉\n\n" +
         "لضمان سلامة المجتمع، نحتاج منك تأكيد أنك شخص حقيقي.\n\n" +
         "**اضغط الزر أدناه للتحقق والحصول على صلاحية الوصول الكاملة للسيرفر.**"
}