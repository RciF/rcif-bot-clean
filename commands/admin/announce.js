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

const COLOR_CHOICES = [
  { name: "أزرق | Blue",      value: "blue"   },
  { name: "أخضر | Green",     value: "green"  },
  { name: "أحمر | Red",       value: "red"    },
  { name: "أصفر | Yellow",    value: "yellow" },
  { name: "بنفسجي | Purple",  value: "purple" },
  { name: "برتقالي | Orange", value: "orange" },
  { name: "وردي | Pink",      value: "pink"   },
  { name: "سماوي | Cyan",     value: "cyan"   },
  { name: "ذهبي | Gold",      value: "gold"   },
  { name: "داكن | Dark",      value: "dark"   }
]

module.exports = {
  data: new SlashCommandBuilder()
    .setName("إعلان")
    .setDescription("إرسال وإدارة الإعلانات الرسمية")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)

    // ══════════════════════════════════════
    //  إرسال
    // ══════════════════════════════════════
    .addSubcommand(sub =>
      sub
        .setName("إرسال")
        .setDescription("إرسال إعلان جديد بشكل Embed احترافي")
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
            .addChoices(...COLOR_CHOICES)
        )
        .addStringOption(option =>
          option
            .setName("الصورة")
            .setDescription("رابط الصورة الكبيرة (اختياري)")
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
        )
    )

    // ══════════════════════════════════════
    //  تعديل
    // ══════════════════════════════════════
    .addSubcommand(sub =>
      sub
        .setName("تعديل")
        .setDescription("تعديل إعلان أرسله البوت سابقاً")
        .addChannelOption(option =>
          option
            .setName("القناة")
            .setDescription("قناة الإعلان الأصلية")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addStringOption(option =>
          option
            .setName("معرف_الرسالة")
            .setDescription("Message ID للإعلان المراد تعديله")
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("العنوان")
            .setDescription("العنوان الجديد (اختياري)")
            .setRequired(false)
            .setMaxLength(256)
        )
        .addStringOption(option =>
          option
            .setName("المحتوى")
            .setDescription("النص الجديد (استخدم \\n للسطر الجديد)")
            .setRequired(false)
            .setMaxLength(4000)
        )
        .addStringOption(option =>
          option
            .setName("اللون")
            .setDescription("لون جديد (اختياري)")
            .setRequired(false)
            .addChoices(...COLOR_CHOICES)
        )
        .addStringOption(option =>
          option
            .setName("الصورة")
            .setDescription("رابط صورة جديد (اكتب \"إزالة\" لحذف الحالية)")
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("صورة_مصغرة")
            .setDescription("رابط صورة مصغرة جديد (اكتب \"إزالة\" لحذف الحالية)")
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("التذييل")
            .setDescription("تذييل جديد (اكتب \"إزالة\" لحذف الحالي)")
            .setRequired(false)
            .setMaxLength(2048)
        )
    )

    // ══════════════════════════════════════
    //  حذف
    // ══════════════════════════════════════
    .addSubcommand(sub =>
      sub
        .setName("حذف")
        .setDescription("حذف إعلان أرسله البوت")
        .addChannelOption(option =>
          option
            .setName("القناة")
            .setDescription("قناة الإعلان")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addStringOption(option =>
          option
            .setName("معرف_الرسالة")
            .setDescription("Message ID للإعلان المراد حذفه")
            .setRequired(true)
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

      const sub = interaction.options.getSubcommand()

      switch (sub) {
        case "إرسال": return await handleSend(interaction)
        case "تعديل": return await handleEdit(interaction)
        case "حذف":   return await handleDelete(interaction)
      }

    } catch (error) {
      logger.error("ANNOUNCE_COMMAND_FAILED", { error: error.message })

      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content: "❌ فشل تنفيذ الأمر" }).catch(() => {})
      }
      return interaction.reply({
        content: "❌ فشل تنفيذ الأمر",
        ephemeral: true
      }).catch(() => {})
    }
  }
}

// ══════════════════════════════════════
//  HANDLER: إرسال
// ══════════════════════════════════════
async function handleSend(interaction) {
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

  // ── تحقق من الروابط
  if (imageUrl && !isValidUrl(imageUrl)) {
    return interaction.editReply({ content: "❌ رابط الصورة غير صالح" })
  }
  if (thumbUrl && !isValidUrl(thumbUrl)) {
    return interaction.editReply({ content: "❌ رابط الصورة المصغرة غير صالح" })
  }

  // ── تحويل \n النصي لسطر جديد حقيقي
  const parsedContent = content.replace(/\\n/g, "\n")

  // ── بناء الـ embed
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(parsedContent)
    .setColor(COLORS[colorKey] || COLORS.blue)
    .setTimestamp()

  if (imageUrl) embed.setImage(imageUrl)
  if (thumbUrl) embed.setThumbnail(thumbUrl)

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
      { name: "📢 القناة",       value: `${channel}`,              inline: true },
      { name: "🎨 اللون",        value: colorKey,                  inline: true },
      { name: "🔔 المنشن",       value: mention,                   inline: true },
      { name: "🆔 معرف الرسالة", value: `\`${sentMsg.id}\``,       inline: false },
      { name: "🔗 الرابط",       value: `[اضغط هنا](${sentMsg.url})` }
    )
    .setFooter({ text: "احفظ معرف الرسالة لتعديلها لاحقاً بـ /إعلان تعديل" })
    .setTimestamp()

  return interaction.editReply({ embeds: [confirmEmbed] })
}

// ══════════════════════════════════════
//  HANDLER: تعديل
// ══════════════════════════════════════
async function handleEdit(interaction) {
  await interaction.deferReply({ ephemeral: true })

  const channel    = interaction.options.getChannel("القناة")
  const messageId  = interaction.options.getString("معرف_الرسالة").trim()
  const newTitle   = interaction.options.getString("العنوان")
  const newContent = interaction.options.getString("المحتوى")
  const newColor   = interaction.options.getString("اللون")
  const newImage   = interaction.options.getString("الصورة")
  const newThumb   = interaction.options.getString("صورة_مصغرة")
  const newFooter  = interaction.options.getString("التذييل")

  // ── تحقق إن في خيار واحد على الأقل
  if (!newTitle && !newContent && !newColor && !newImage && !newThumb && !newFooter) {
    return interaction.editReply({
      content: "❌ حدد خيار واحد على الأقل للتعديل"
    })
  }

  // ── جلب الرسالة
  let targetMsg
  try {
    targetMsg = await channel.messages.fetch(messageId)
  } catch {
    return interaction.editReply({
      content: `❌ ما لقيت رسالة بهذا المعرف في ${channel}`
    })
  }

  // ── تحقق إن الرسالة من البوت
  if (targetMsg.author.id !== interaction.client.user.id) {
    return interaction.editReply({
      content: "❌ الرسالة هذي مو من البوت، ما أقدر أعدلها"
    })
  }

  // ── تحقق إن فيها embed
  if (!targetMsg.embeds || targetMsg.embeds.length === 0) {
    return interaction.editReply({
      content: "❌ الرسالة هذي ما فيها embed للتعديل"
    })
  }

  // ── تحقق من الروابط الجديدة
  if (newImage && newImage !== "إزالة" && !isValidUrl(newImage)) {
    return interaction.editReply({ content: "❌ رابط الصورة الجديدة غير صالح" })
  }
  if (newThumb && newThumb !== "إزالة" && !isValidUrl(newThumb)) {
    return interaction.editReply({ content: "❌ رابط الصورة المصغرة الجديدة غير صالح" })
  }

  // ── بناء embed جديد من الـ embed القديم
  const oldEmbed = targetMsg.embeds[0]
  const newEmbed = EmbedBuilder.from(oldEmbed)

  if (newTitle)   newEmbed.setTitle(newTitle)
  if (newContent) newEmbed.setDescription(newContent.replace(/\\n/g, "\n"))
  if (newColor)   newEmbed.setColor(COLORS[newColor] || COLORS.blue)

  if (newImage) {
    if (newImage === "إزالة") newEmbed.setImage(null)
    else newEmbed.setImage(newImage)
  }

  if (newThumb) {
    if (newThumb === "إزالة") newEmbed.setThumbnail(null)
    else newEmbed.setThumbnail(newThumb)
  }

  if (newFooter) {
    if (newFooter === "إزالة") {
      newEmbed.setFooter({
        text: interaction.guild.name,
        iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
      })
    } else {
      newEmbed.setFooter({
        text: newFooter,
        iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
      })
    }
  }

  newEmbed.setTimestamp()

  // ── التعديل
  try {
    await targetMsg.edit({ embeds: [newEmbed] })
  } catch (err) {
    return interaction.editReply({
      content: `❌ فشل التعديل: ${err.message}`
    })
  }

  // ── التأكيد
  const changedFields = []
  if (newTitle)   changedFields.push("العنوان")
  if (newContent) changedFields.push("المحتوى")
  if (newColor)   changedFields.push("اللون")
  if (newImage)   changedFields.push(newImage === "إزالة" ? "الصورة (حُذفت)" : "الصورة")
  if (newThumb)   changedFields.push(newThumb === "إزالة" ? "الصورة المصغرة (حُذفت)" : "الصورة المصغرة")
  if (newFooter)  changedFields.push(newFooter === "إزالة" ? "التذييل (حُذف)" : "التذييل")

  const confirmEmbed = new EmbedBuilder()
    .setColor(0xeab308)
    .setTitle("✏️ تم تعديل الإعلان")
    .addFields(
      { name: "📢 القناة",       value: `${channel}`,                 inline: true },
      { name: "🆔 معرف الرسالة", value: `\`${targetMsg.id}\``,        inline: true },
      { name: "📝 الحقول المعدّلة", value: changedFields.join("، ") },
      { name: "🔗 الرابط",       value: `[اضغط هنا](${targetMsg.url})` }
    )
    .setTimestamp()

  return interaction.editReply({ embeds: [confirmEmbed] })
}

// ══════════════════════════════════════
//  HANDLER: حذف
// ══════════════════════════════════════
async function handleDelete(interaction) {
  await interaction.deferReply({ ephemeral: true })

  const channel   = interaction.options.getChannel("القناة")
  const messageId = interaction.options.getString("معرف_الرسالة").trim()

  // ── جلب الرسالة
  let targetMsg
  try {
    targetMsg = await channel.messages.fetch(messageId)
  } catch {
    return interaction.editReply({
      content: `❌ ما لقيت رسالة بهذا المعرف في ${channel}`
    })
  }

  // ── تحقق إن الرسالة من البوت
  if (targetMsg.author.id !== interaction.client.user.id) {
    return interaction.editReply({
      content: "❌ الرسالة هذي مو من البوت، ما أقدر أحذفها"
    })
  }

  // ── الحذف
  try {
    await targetMsg.delete()
  } catch (err) {
    return interaction.editReply({
      content: `❌ فشل الحذف: ${err.message}`
    })
  }

  const confirmEmbed = new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle("🗑️ تم حذف الإعلان")
    .addFields(
      { name: "📢 القناة",       value: `${channel}`,         inline: true },
      { name: "🆔 معرف الرسالة", value: `\`${messageId}\``,   inline: true }
    )
    .setTimestamp()

  return interaction.editReply({ embeds: [confirmEmbed] })
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