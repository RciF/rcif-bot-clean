// ══════════════════════════════════════════════════════════════════
//  /سحب — نظام السحوبات الكامل
//  المسار: commands/giveaway/index.js
//
//  Subcommands:
//   - إنشاء (create)  : سحب جديد
//   - إنهاء (end)     : إنهاء سحب يدوياً
//   - إلغاء (cancel)  : إلغاء سحب (بدون فائزين)
//   - إعادة (reroll)  : إعادة اختيار فائز
//   - قائمة (list)    : عرض السحوبات النشطة
// ══════════════════════════════════════════════════════════════════

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js")

const giveawaySystem = require("../../systems/giveawaySystem")
const { COLORS, parseDuration, formatDuration } = require("./_shared")

// ══════════════════════════════════════════════════════════════════
//  COMMAND DATA
// ══════════════════════════════════════════════════════════════════

module.exports = {
  data: new SlashCommandBuilder()
    .setName("سحب")
    .setDescription("نظام السحوبات والجوائز")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)

    // ── إنشاء ──
    .addSubcommand(sub =>
      sub.setName("إنشاء")
        .setDescription("إنشاء سحب جديد")
        .addStringOption(o =>
          o.setName("الجائزة")
            .setDescription("ما هي الجائزة؟")
            .setRequired(true)
            .setMaxLength(200)
        )
        .addStringOption(o =>
          o.setName("المدة")
            .setDescription("مثال: 1d, 12h, 30m, 1h30m")
            .setRequired(true)
        )
        .addChannelOption(o =>
          o.setName("القناة")
            .setDescription("القناة التي ينشر فيها السحب")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false)
        )
        .addIntegerOption(o =>
          o.setName("عدد_الفائزين")
            .setDescription("عدد الفائزين (افتراضي: 1)")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(20)
        )
        .addStringOption(o =>
          o.setName("الوصف")
            .setDescription("تفاصيل إضافية عن الجائزة")
            .setRequired(false)
            .setMaxLength(1000)
        )
        .addRoleOption(o =>
          o.setName("الرتبة_المطلوبة")
            .setDescription("شرط: العضو لازم يكون عنده هذي الرتبة")
            .setRequired(false)
        )
        .addIntegerOption(o =>
          o.setName("المستوى_المطلوب")
            .setDescription("شرط: مستوى XP الأدنى")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(500)
        )
    )

    // ── إنهاء ──
    .addSubcommand(sub =>
      sub.setName("إنهاء")
        .setDescription("إنهاء سحب نشط الآن")
        .addIntegerOption(o =>
          o.setName("الرقم")
            .setDescription("رقم السحب")
            .setRequired(true)
            .setMinValue(1)
        )
    )

    // ── إلغاء ──
    .addSubcommand(sub =>
      sub.setName("إلغاء")
        .setDescription("إلغاء سحب بدون اختيار فائزين")
        .addIntegerOption(o =>
          o.setName("الرقم")
            .setDescription("رقم السحب")
            .setRequired(true)
            .setMinValue(1)
        )
    )

    // ── إعادة ──
    .addSubcommand(sub =>
      sub.setName("إعادة")
        .setDescription("إعادة اختيار فائز (للسحوبات المنتهية)")
        .addIntegerOption(o =>
          o.setName("الرقم")
            .setDescription("رقم السحب")
            .setRequired(true)
            .setMinValue(1)
        )
        .addIntegerOption(o =>
          o.setName("عدد_الفائزين_الجدد")
            .setDescription("كم فائز جديد؟ (افتراضي: 1)")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(10)
        )
    )

    // ── قائمة ──
    .addSubcommand(sub =>
      sub.setName("قائمة")
        .setDescription("عرض السحوبات النشطة في السيرفر")
    ),

  helpMeta: {
    category: "giveaway",
    description: "نظام السحوبات والجوائز",
    requirements: {
      userPermissions: ["ManageGuild"],
      subscriptionTier: "silver"
    },
    examples: [
      "/سحب إنشاء الجائزة:Nitro المدة:1d",
      "/سحب إنشاء الجائزة:كود ستيم المدة:6h عدد_الفائزين:3",
      "/سحب إنهاء الرقم:5",
      "/سحب إعادة الرقم:3 عدد_الفائزين_الجدد:1"
    ]
  },

  // ══════════════════════════════════════════════════════════════════
  //  EXECUTE
  // ══════════════════════════════════════════════════════════════════

  async execute(interaction) {
    const sub = interaction.options.getSubcommand()

    try {
      if (sub === "إنشاء") return await handleCreate(interaction)
      if (sub === "إنهاء") return await handleEnd(interaction)
      if (sub === "إلغاء") return await handleCancel(interaction)
      if (sub === "إعادة") return await handleReroll(interaction)
      if (sub === "قائمة") return await handleList(interaction)
    } catch (err) {
      console.error("[GIVEAWAY ERROR]", err)
      const msg = "❌ حدث خطأ غير متوقع، حاول مرة ثانية."
      if (interaction.deferred) return interaction.editReply({ content: msg }).catch(() => {})
      if (!interaction.replied) return interaction.reply({ content: msg, ephemeral: true }).catch(() => {})
    }
  }
}

// ══════════════════════════════════════════════════════════════════
//  HANDLERS
// ══════════════════════════════════════════════════════════════════

async function handleCreate(interaction) {
  const prize = interaction.options.getString("الجائزة")
  const durationStr = interaction.options.getString("المدة")
  const channel = interaction.options.getChannel("القناة") || interaction.channel
  const winnerCount = interaction.options.getInteger("عدد_الفائزين") || 1
  const description = interaction.options.getString("الوصف")
  const role = interaction.options.getRole("الرتبة_المطلوبة")
  const level = interaction.options.getInteger("المستوى_المطلوب") || 0

  // ─── تحقق من المدة ───
  const durationMs = parseDuration(durationStr)
  if (!durationMs) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.danger)
        .setDescription("❌ صيغة المدة غير صحيحة.\nأمثلة: `1d` (يوم) `12h` (12 ساعة) `30m` (30 دقيقة) `1h30m`")],
      ephemeral: true
    })
  }

  // حد أدنى دقيقة، أقصى 30 يوم
  if (durationMs < 60 * 1000) {
    return interaction.reply({
      content: "❌ المدة قصيرة جداً (الأقل دقيقة واحدة).",
      ephemeral: true
    })
  }

  if (durationMs > 30 * 24 * 60 * 60 * 1000) {
    return interaction.reply({
      content: "❌ المدة طويلة جداً (الأقصى 30 يوم).",
      ephemeral: true
    })
  }

  await interaction.deferReply({ ephemeral: true })

  try {
    const giveaway = await giveawaySystem.createGiveaway({
      guild: interaction.guild,
      channelId: channel.id,
      hostId: interaction.user.id,
      prize,
      description,
      winnerCount,
      durationMs,
      requiredRole: role?.id || null,
      requiredLevel: level
    })

    return interaction.editReply({
      embeds: [new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle("✅ تم إنشاء السحب!")
        .setDescription(
          `🎁 **${giveaway.prize}**\n` +
          `🆔 رقم السحب: **#${giveaway.id}**\n` +
          `🕒 ينتهي بعد: **${formatDuration(durationMs)}**\n` +
          `📢 القناة: ${channel}\n` +
          `🏅 عدد الفائزين: **${winnerCount}**` +
          (role ? `\n📋 شرط الرتبة: ${role}` : "") +
          (level > 0 ? `\n📊 شرط المستوى: ${level}+` : "")
        )
        .setTimestamp()]
    })
  } catch (err) {
    return interaction.editReply({
      content: `❌ فشل إنشاء السحب: ${err.message}`
    })
  }
}

async function handleEnd(interaction) {
  const id = interaction.options.getInteger("الرقم")
  await interaction.deferReply({ ephemeral: true })

  const giveaway = await giveawaySystem.getGiveaway(id)
  if (!giveaway || giveaway.guild_id !== interaction.guild.id) {
    return interaction.editReply({ content: `❌ ما فيه سحب برقم #${id}.` })
  }

  const result = await giveawaySystem.endGiveaway(id)
  if (!result.ok) {
    return interaction.editReply({ content: `❌ ${result.reason}` })
  }

  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle("✅ تم إنهاء السحب")
      .setDescription(
        `🎁 **${giveaway.prize}**\n` +
        `👥 المشاركون: **${result.entryCount}**\n` +
        `🏆 الفائزون: **${result.winners.length}**` +
        (result.winners.length > 0 ? `\n${result.winners.map(id => `<@${id}>`).join(" ")}` : "")
      )]
  })
}

async function handleCancel(interaction) {
  const id = interaction.options.getInteger("الرقم")
  await interaction.deferReply({ ephemeral: true })

  const giveaway = await giveawaySystem.getGiveaway(id)
  if (!giveaway || giveaway.guild_id !== interaction.guild.id) {
    return interaction.editReply({ content: `❌ ما فيه سحب برقم #${id}.` })
  }

  const result = await giveawaySystem.cancelGiveaway(id)
  if (!result.ok) {
    return interaction.editReply({ content: `❌ ${result.reason}` })
  }

  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.warning)
      .setTitle("❌ تم إلغاء السحب")
      .setDescription(`🎁 **${giveaway.prize}** — أُلغي بدون اختيار فائزين.`)]
  })
}

async function handleReroll(interaction) {
  const id = interaction.options.getInteger("الرقم")
  const count = interaction.options.getInteger("عدد_الفائزين_الجدد") || 1
  await interaction.deferReply({ ephemeral: true })

  const giveaway = await giveawaySystem.getGiveaway(id)
  if (!giveaway || giveaway.guild_id !== interaction.guild.id) {
    return interaction.editReply({ content: `❌ ما فيه سحب برقم #${id}.` })
  }

  const result = await giveawaySystem.rerollGiveaway(id, count)
  if (!result.ok) {
    return interaction.editReply({ content: `❌ ${result.reason}` })
  }

  return interaction.editReply({
    embeds: [new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle("🎲 تم إعادة السحب!")
      .setDescription(
        `🎁 **${giveaway.prize}**\n` +
        `🆕 الفائزون الجدد:\n${result.newWinners.map(id => `<@${id}>`).join(" ")}`
      )]
  })
}

async function handleList(interaction) {
  await interaction.deferReply({ ephemeral: true })

  const active = await giveawaySystem.getActiveGiveaways(interaction.guild.id)

  if (active.length === 0) {
    return interaction.editReply({
      content: "📭 لا يوجد سحوبات نشطة حالياً."
    })
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(`🎁 السحوبات النشطة (${active.length})`)
    .setDescription(active.slice(0, 10).map(g => {
      const endTs = Math.floor(new Date(g.end_at).getTime() / 1000)
      return `**#${g.id}** • ${g.prize}\n` +
             `└ ينتهي <t:${endTs}:R> • 👥 ${g.entry_count} مشارك • 🏅 ${g.winner_count} فائز`
    }).join("\n\n"))

  if (active.length > 10) {
    embed.setFooter({ text: `... و ${active.length - 10} سحب آخر` })
  }

  return interaction.editReply({ embeds: [embed] })
}