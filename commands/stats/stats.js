const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js")

const commandGuardSystem = require("../../systems/commandGuardSystem")
const statsSystem = require("../../systems/statsSystem")

// ═══════════════════════════════════════════════════════════
//  أمر /إحصائيات
// ═══════════════════════════════════════════════════════════

module.exports = {
  data: new SlashCommandBuilder()
    .setName("إحصائيات")
    .setDescription("إعداد قنوات إحصائيات السيرفر التلقائية")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // ─── إعداد تلقائي (كل الإحصائيات دفعة واحدة) ───
    .addSubcommand(sub =>
      sub
        .setName("تلقائي")
        .setDescription("إنشاء كل قنوات الإحصائيات تلقائياً في كاتيقوري جديدة")
        .addBooleanOption(o =>
          o.setName("شامل")
            .setDescription("تضمين إحصائيات إضافية (متصل / بوتات / بشر)")
            .setRequired(false)
        )
    )

    // ─── إضافة إحصائية واحدة ───
    .addSubcommand(sub =>
      sub
        .setName("إضافة")
        .setDescription("إضافة قناة إحصائية واحدة")
        .addStringOption(o =>
          o.setName("النوع")
            .setDescription("نوع الإحصائية")
            .setRequired(true)
            .addChoices(
              { name: "👥 إجمالي الأعضاء", value: "total_members" },
              { name: "🟢 الأعضاء المتصلين", value: "online_members" },
              { name: "👤 البشر فقط", value: "human_members" },
              { name: "🤖 البوتات", value: "bot_members" },
              { name: "💬 القنوات النصية", value: "text_channels" },
              { name: "🔊 القنوات الصوتية", value: "voice_channels" },
              { name: "📡 كل القنوات", value: "total_channels" },
              { name: "🏷️ الرتب", value: "roles_count" },
              { name: "🚀 عدد البوستات", value: "boost_count" },
              { name: "💜 مستوى البوست", value: "boost_level" }
            )
        )
        .addChannelOption(o =>
          o.setName("الكاتيقوري")
            .setDescription("الكاتيقوري التي ستوضع فيها القناة (اختياري)")
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildCategory)
        )
    )

    // ─── حذف إحصائية ───
    .addSubcommand(sub =>
      sub
        .setName("حذف")
        .setDescription("حذف قناة إحصائية")
        .addStringOption(o =>
          o.setName("النوع")
            .setDescription("نوع الإحصائية")
            .setRequired(true)
            .addChoices(
              { name: "👥 إجمالي الأعضاء", value: "total_members" },
              { name: "🟢 الأعضاء المتصلين", value: "online_members" },
              { name: "👤 البشر فقط", value: "human_members" },
              { name: "🤖 البوتات", value: "bot_members" },
              { name: "💬 القنوات النصية", value: "text_channels" },
              { name: "🔊 القنوات الصوتية", value: "voice_channels" },
              { name: "📡 كل القنوات", value: "total_channels" },
              { name: "🏷️ الرتب", value: "roles_count" },
              { name: "🚀 عدد البوستات", value: "boost_count" },
              { name: "💜 مستوى البوست", value: "boost_level" }
            )
        )
        .addBooleanOption(o =>
          o.setName("حذف_القناة")
            .setDescription("حذف القناة نفسها من السيرفر؟ (افتراضي: لا)")
            .setRequired(false)
        )
    )

    // ─── مسح الكل ───
    .addSubcommand(sub =>
      sub
        .setName("مسح")
        .setDescription("مسح كل قنوات الإحصائيات وحذفها")
    )

    // ─── تحديث يدوي ───
    .addSubcommand(sub =>
      sub
        .setName("تحديث")
        .setDescription("تحديث كل القنوات الآن يدوياً")
    )

    // ─── عرض الحالة ───
    .addSubcommand(sub =>
      sub
        .setName("حالة")
        .setDescription("عرض الإحصائيات الحالية للسيرفر")
    ),

  // ═══════════════════════════════════════════════════════════
  //  EXECUTE
  // ═══════════════════════════════════════════════════════════

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const isAdmin = commandGuardSystem.requireAdmin(interaction)
      if (!isAdmin) {
        return interaction.reply({ content: "❌ هذا الأمر للأدمن فقط", ephemeral: true })
      }

      // التحقق من صلاحية البوت
      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({
          content: "❌ البوت يحتاج صلاحية **إدارة القنوات** عشان يشتغل نظام الإحصائيات.",
          ephemeral: true
        })
      }

      const sub = interaction.options.getSubcommand()

      switch (sub) {
        case "تلقائي": return await handleAuto(interaction)
        case "إضافة":  return await handleAdd(interaction)
        case "حذف":    return await handleRemove(interaction)
        case "مسح":    return await handleClear(interaction)
        case "تحديث":  return await handleUpdate(interaction)
        case "حالة":   return await handleStatus(interaction)
      }

    } catch (err) {
      console.error("[STATS COMMAND ERROR]", err)

      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content: "❌ حدث خطأ في نظام الإحصائيات." })
      }
      return interaction.reply({ content: "❌ حدث خطأ في نظام الإحصائيات.", ephemeral: true })
    }
  }
}

// ═══════════════════════════════════════════════════════════
//  تلقائي — إنشاء كل الإحصائيات دفعة واحدة
// ═══════════════════════════════════════════════════════════

async function handleAuto(interaction) {
  await interaction.deferReply()

  const guild = interaction.guild
  const detailed = interaction.options.getBoolean("شامل") ?? false

  // الإحصائيات الأساسية دائماً
  const basicStats = [
    "total_members",
    "boost_count",
    "boost_level",
    "total_channels",
    "roles_count",
  ]

  // إحصائيات إضافية لو اختار شامل
  const extraStats = [
    "online_members",
    "human_members",
    "bot_members",
    "text_channels",
    "voice_channels",
  ]

  const statsToCreate = detailed ? [...basicStats, ...extraStats] : basicStats

  // ─── إنشاء كاتيقوري ───
  let category
  try {
    category = await guild.channels.create({
      name: "📊 إحصائيات السيرفر",
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.Connect],
          allow: [PermissionFlagsBits.ViewChannel]
        }
      ]
    })
  } catch (err) {
    return interaction.editReply({ content: "❌ فشل إنشاء الكاتيقوري. تأكد من صلاحيات البوت." })
  }

  const created = []
  const failed = []

  for (let i = 0; i < statsToCreate.length; i++) {
    const statType = statsToCreate[i]
    const statDef = statsSystem.STAT_TYPES[statType]
    if (!statDef) continue

    try {
      // جلب القيمة الحالية
      const value = await statsSystem.fetchStatValue(guild, statType)
      const channelName = statDef.format(value)

      // إنشاء قناة Voice (للمنع من الكتابة بشكل طبيعي)
      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: category.id,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.SendMessages],
            allow: [PermissionFlagsBits.ViewChannel]
          }
        ]
      })

      await statsSystem.addStatChannel(guild.id, channel.id, statType, i)
      created.push({ type: statType, channel })

      // تأخير بين كل قناة
      await new Promise(r => setTimeout(r, 500))

    } catch (err) {
      console.error(`[STATS AUTO] Failed to create ${statType}:`, err.message)
      failed.push(statType)
    }
  }

  // ─── Embed النتيجة ───
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📊 تم إعداد إحصائيات السيرفر")
    .setDescription(
      `تم إنشاء **${created.length}** قناة إحصائية تتحدث تلقائياً كل 5 دقائق.\n\n` +
      `📁 الكاتيقوري: **${category.name}**`
    )
    .addFields(
      {
        name: "✅ القنوات المنشأة",
        value: created.length > 0
          ? created.map(c => `• ${statsSystem.STAT_TYPES[c.type]?.label}`).join("\n")
          : "لا يوجد",
        inline: true
      }
    )
    .setFooter({ text: "التحديث التلقائي كل 5 دقائق • استخدم /إحصائيات تحديث للتحديث الفوري" })
    .setTimestamp()

  if (failed.length > 0) {
    embed.addFields({
      name: "❌ فشل الإنشاء",
      value: failed.map(t => `• ${statsSystem.STAT_TYPES[t]?.label || t}`).join("\n"),
      inline: true
    })
  }

  return interaction.editReply({ embeds: [embed] })
}

// ═══════════════════════════════════════════════════════════
//  إضافة — إحصائية واحدة
// ═══════════════════════════════════════════════════════════

async function handleAdd(interaction) {
  await interaction.deferReply()

  const guild = interaction.guild
  const statType = interaction.options.getString("النوع")
  const parentCategory = interaction.options.getChannel("الكاتيقوري")
  const statDef = statsSystem.STAT_TYPES[statType]

  if (!statDef) {
    return interaction.editReply({ content: "❌ نوع الإحصائية غير صالح." })
  }

  // تحقق: هل موجودة بالفعل؟
  const existing = await statsSystem.getGuildStats(guild.id)
  if (existing.some(s => s.stat_type === statType)) {
    return interaction.editReply({
      content: `⚠️ إحصائية **${statDef.label}** موجودة بالفعل. احذفها أولاً لإعادة إضافتها.`
    })
  }

  // جلب القيمة الحالية
  const value = await statsSystem.fetchStatValue(guild, statType)
  const channelName = statDef.format(value)

  // إنشاء القناة
  let channel
  try {
    channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildVoice,
      parent: parentCategory?.id || null,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.SendMessages],
          allow: [PermissionFlagsBits.ViewChannel]
        }
      ]
    })
  } catch (err) {
    return interaction.editReply({ content: "❌ فشل إنشاء القناة. تأكد من الصلاحيات." })
  }

  await statsSystem.addStatChannel(guild.id, channel.id, statType, existing.length)

  const embed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle("✅ تمت الإضافة")
    .addFields(
      { name: "📊 الإحصائية", value: statDef.label, inline: true },
      { name: "📡 القناة", value: `${channel}`, inline: true },
      { name: "🔢 القيمة الحالية", value: `${value}`, inline: true }
    )
    .setFooter({ text: "تتحدث تلقائياً كل 5 دقائق" })
    .setTimestamp()

  return interaction.editReply({ embeds: [embed] })
}

// ═══════════════════════════════════════════════════════════
//  حذف — إحصائية واحدة
// ═══════════════════════════════════════════════════════════

async function handleRemove(interaction) {
  await interaction.deferReply()

  const guild = interaction.guild
  const statType = interaction.options.getString("النوع")
  const deleteChannel = interaction.options.getBoolean("حذف_القناة") ?? false
  const statDef = statsSystem.STAT_TYPES[statType]

  const channelId = await statsSystem.removeStatChannel(guild.id, statType)

  if (!channelId) {
    return interaction.editReply({
      content: `❌ إحصائية **${statDef?.label || statType}** غير موجودة في هذا السيرفر.`
    })
  }

  let deleted = false
  if (deleteChannel) {
    try {
      const channel = guild.channels.cache.get(channelId)
      if (channel) {
        await channel.delete("حذف قناة إحصائية")
        deleted = true
      }
    } catch {}
  }

  const embed = new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle("🗑️ تم الحذف")
    .addFields(
      { name: "📊 الإحصائية", value: statDef?.label || statType, inline: true },
      { name: "📡 القناة", value: deleted ? "تم حذفها" : `<#${channelId}> (بقيت)`, inline: true }
    )
    .setTimestamp()

  return interaction.editReply({ embeds: [embed] })
}

// ═══════════════════════════════════════════════════════════
//  مسح — كل الإحصائيات
// ═══════════════════════════════════════════════════════════

async function handleClear(interaction) {
  await interaction.deferReply()

  const guild = interaction.guild
  const channelIds = await statsSystem.clearGuildStats(guild.id)

  if (channelIds.length === 0) {
    return interaction.editReply({ content: "⚠️ ما فيه إحصائيات مضبوطة في هذا السيرفر." })
  }

  // حذف القنوات
  let deletedCount = 0
  for (const id of channelIds) {
    try {
      const ch = guild.channels.cache.get(id)
      if (ch) {
        await ch.delete("مسح إحصائيات السيرفر")
        deletedCount++
      }
    } catch {}
  }

  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle("🧹 تم مسح كل الإحصائيات")
    .setDescription(`تم حذف **${deletedCount}** قناة إحصائية من قاعدة البيانات والسيرفر.`)
    .setTimestamp()

  return interaction.editReply({ embeds: [embed] })
}

// ═══════════════════════════════════════════════════════════
//  تحديث — يدوي فوري
// ═══════════════════════════════════════════════════════════

async function handleUpdate(interaction) {
  await interaction.deferReply()

  const guild = interaction.guild
  const statChannels = await statsSystem.getGuildStats(guild.id)

  if (statChannels.length === 0) {
    return interaction.editReply({
      content: "⚠️ ما فيه إحصائيات مضبوطة. استخدم `/إحصائيات تلقائي` أولاً."
    })
  }

  // إعادة ضبط الكولداون للتحديث الفوري
  const { updateCooldowns: cd } = require("../../systems/statsSystem")

  // تحديث فعلي
  const results = []
  for (const stat of statChannels) {
    try {
      const channel = guild.channels.cache.get(stat.channel_id)
      if (!channel) {
        results.push({ type: stat.stat_type, status: "❌ القناة محذوفة" })
        continue
      }

      const value = await statsSystem.fetchStatValue(guild, stat.stat_type)
      const statDef = statsSystem.STAT_TYPES[stat.stat_type]
      if (!statDef) continue

      const newName = statDef.format(value)
      await channel.setName(newName, "تحديث يدوي")

      results.push({ type: stat.stat_type, status: `✅ ${newName}` })
      await new Promise(r => setTimeout(r, 1500))

    } catch (err) {
      results.push({ type: stat.stat_type, status: "⚠️ فشل التحديث" })
    }
  }

  const embed = new EmbedBuilder()
    .setColor(0x3b82f6)
    .setTitle("🔄 تم التحديث")
    .addFields({
      name: "📊 النتائج",
      value: results.map(r => `${statsSystem.STAT_TYPES[r.type]?.label || r.type}: ${r.status}`).join("\n"),
      inline: false
    })
    .setFooter({ text: "التحديث التلقائي يعمل كل 5 دقائق" })
    .setTimestamp()

  return interaction.editReply({ embeds: [embed] })
}

// ═══════════════════════════════════════════════════════════
//  حالة — عرض الإحصائيات الحالية
// ═══════════════════════════════════════════════════════════

async function handleStatus(interaction) {
  await interaction.deferReply()

  const guild = interaction.guild
  const statChannels = await statsSystem.getGuildStats(guild.id)

  // جلب كل الإحصائيات الحالية
  await guild.members.fetch().catch(() => {})

  const totalMembers  = guild.memberCount
  const humans        = guild.members.cache.filter(m => !m.user.bot).size
  const bots          = guild.members.cache.filter(m => m.user.bot).size
  const online        = guild.members.cache.filter(m => m.presence?.status === "online").size
  const totalChannels = guild.channels.cache.size
  const textChannels  = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size
  const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size
  const roles         = guild.roles.cache.filter(r => r.id !== guild.id).size
  const boosts        = guild.premiumSubscriptionCount || 0
  const boostLevel    = guild.premiumTier || 0

  // حساب نسبة النشاط
  const activityPercent = totalMembers > 0 ? Math.round((online / totalMembers) * 100) : 0
  const activityBar = buildBar(activityPercent)

  const boostEmojis = ["⬜", "🟩", "🟦", "🟪"]
  const boostEmoji = boostEmojis[boostLevel] || "⬜"

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`📊 إحصائيات ${guild.name}`)
    .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
    .addFields(
      // ─── الأعضاء ───
      {
        name: "👥 الأعضاء",
        value: [
          `├ الإجمالي: **${totalMembers.toLocaleString("ar-SA")}**`,
          `├ البشر: **${humans.toLocaleString("ar-SA")}**`,
          `├ البوتات: **${bots.toLocaleString("ar-SA")}**`,
          `└ متصل الآن: **${online.toLocaleString("ar-SA")}** (${activityPercent}%)`
        ].join("\n"),
        inline: true
      },
      // ─── القنوات ───
      {
        name: "📡 القنوات",
        value: [
          `├ الإجمالي: **${totalChannels}**`,
          `├ نصية: **${textChannels}**`,
          `└ صوتية: **${voiceChannels}**`
        ].join("\n"),
        inline: true
      },
      // ─── السيرفر ───
      {
        name: "🏷️ السيرفر",
        value: [
          `├ الرتب: **${roles}**`,
          `├ البوستات: **${boosts}** 🚀`,
          `└ مستوى البوست: **${boostEmoji} ${boostLevel}**`
        ].join("\n"),
        inline: true
      },
      // ─── شريط النشاط ───
      {
        name: "📈 نشاط الأعضاء",
        value: `${activityBar} **${activityPercent}%** متصل`,
        inline: false
      }
    )

  // ─── حالة قنوات الإحصائيات ───
  if (statChannels.length > 0) {
    const channelsList = statChannels.map(s => {
      const ch = guild.channels.cache.get(s.channel_id)
      const def = statsSystem.STAT_TYPES[s.stat_type]
      return `${def?.label || s.stat_type}: ${ch ? `<#${s.channel_id}>` : "❌ محذوفة"}`
    }).join("\n")

    embed.addFields({
      name: `🔧 قنوات الإحصائيات (${statChannels.length})`,
      value: channelsList,
      inline: false
    })
  } else {
    embed.addFields({
      name: "🔧 قنوات الإحصائيات",
      value: "لم يتم الإعداد بعد. استخدم `/إحصائيات تلقائي`",
      inline: false
    })
  }

  embed
    .setFooter({
      text: `طلب من: ${interaction.user.username}`,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true })
    })
    .setTimestamp()

  return interaction.editReply({ embeds: [embed] })
}

// ─── Helper: شريط التقدم ───
function buildBar(percent) {
  const filled = Math.round(percent / 10)
  const empty  = 10 - filled
  return "🟦".repeat(filled) + "⬜".repeat(empty)
}