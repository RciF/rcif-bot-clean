// ══════════════════════════════════════════════════════════════════
//  /بطاقتي — الأمر الرئيسي لتخصيص البطاقة
//  المسار: commands/xp/my-card.js
//
//  ✨ لوحة تفاعلية:
//   • معاينة البطاقة الحالية
//   • أزرار: الخلفية / الألوان / الشارات / التأثيرات / الداشبورد
//   • بدون اشتراك → يشاهد + يرى رابط الداشبورد
//   • مع اشتراك → يتحكم مباشرة من Discord
// ══════════════════════════════════════════════════════════════════

const {
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js")

const levelSystem = require("../../systems/levelSystem")
const cardCustomizationSystem = require("../../systems/cardCustomizationSystem")
const { generateRankCard } = require("../../systems/rankCardSystem")

// ══════════════════════════════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════════════════════════════

const DASHBOARD_URL = process.env.DASHBOARD_URL || "https://rcif-dashboard.onrender.com"
const CARD_DASHBOARD_PATH = "/dashboard/card"

const TIER_ICONS = {
  free: "🆓",
  basic: "🥉",
  advanced: "🥈",
  legendary: "👑"
}

const TIER_NAMES = {
  free: "مجاني",
  basic: "أساسية",
  advanced: "متقدمة",
  legendary: "أسطورية"
}

const TIER_COLORS = {
  free: 0x64748b,
  basic: 0xcd7f32,
  advanced: 0xc0c0c0,
  legendary: 0xffd700
}

// ══════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════

function buildCardEmbed({ tier, daysLeft, isPremium, isGift, expiresAt }) {
  const tierIcon = TIER_ICONS[tier] || "🆓"
  const tierName = TIER_NAMES[tier] || "مجاني"
  const color = TIER_COLORS[tier] || 0x64748b

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${tierIcon} بطاقتك — فئة ${tierName}`)

  if (isPremium) {
    embed.setDescription(
      isGift
        ? `🎁 **اشتراك هدية** — تستمتع بميزات فئة **${tierName}**\n⏱️ متبقي: **${daysLeft}** يوم`
        : `✨ تستمتع بميزات فئة **${tierName}**\n⏱️ متبقي: **${daysLeft}** يوم`
    )

    if (expiresAt) {
      embed.addFields({
        name: "📅 ينتهي في",
        value: `<t:${Math.floor(new Date(expiresAt).getTime() / 1000)}:F>`,
        inline: false
      })
    }
  } else {
    embed.setDescription(
      "🆓 أنت تستخدم البطاقة الافتراضية\n\n" +
      "✨ **اشترك لتحصل على:**\n" +
      "🥉 **أساسية** — `$1.99/شهر` — 10 خلفيات + 5 ثيمات + شارة\n" +
      "🥈 **متقدمة** — `$3.99/شهر` — رفع خلفية + ألوان مخصصة + 5 شارات\n" +
      "👑 **أسطورية** — `$5.99/شهر` — كل شي + خلفيات متحركة + 10 شارات"
    )
  }

  embed.setFooter({
    text: isPremium
      ? "اختر زر من الأسفل للتحكم في بطاقتك"
      : "اضغط على «اشترك الآن» للدخول للداشبورد"
  })
  embed.setTimestamp()

  return embed
}

function buildPremiumButtons(userId, tier) {
  const features = cardCustomizationSystem.getTierFeatures(tier)
  const row1 = new ActionRowBuilder()
  const row2 = new ActionRowBuilder()

  // ─── الصف الأول: الخلفية + الألوان ───
  row1.addComponents(
    new ButtonBuilder()
      .setCustomId(`mycard:bg:${userId}`)
      .setLabel("🖼️ الخلفية")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`mycard:theme:${userId}`)
      .setLabel("🎨 الألوان")
      .setStyle(ButtonStyle.Primary)
  )

  // ─── شارات (متاحة فقط لو الفئة تدعم) ───
  if (features.badges > 0) {
    row1.addComponents(
      new ButtonBuilder()
        .setCustomId(`mycard:badges:${userId}`)
        .setLabel("🏆 الشارات")
        .setStyle(ButtonStyle.Primary)
    )
  }

  // ─── تأثيرات (متاحة فقط للمتقدمة والأسطورية) ───
  if (features.effects > 0) {
    row1.addComponents(
      new ButtonBuilder()
        .setCustomId(`mycard:effects:${userId}`)
        .setLabel("✨ التأثيرات")
        .setStyle(ButtonStyle.Primary)
    )
  }

  // ─── الصف الثاني: الداشبورد + إعادة تعيين ───
  row2.addComponents(
    new ButtonBuilder()
      .setLabel("🌐 افتح الداشبورد")
      .setStyle(ButtonStyle.Link)
      .setURL(`${DASHBOARD_URL}${CARD_DASHBOARD_PATH}`),

    new ButtonBuilder()
      .setCustomId(`mycard:reset:${userId}`)
      .setLabel("🔄 إعادة تعيين")
      .setStyle(ButtonStyle.Danger)
  )

  return [row1, row2]
}

function buildFreeButtons(userId) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("✨ اشترك الآن")
      .setStyle(ButtonStyle.Link)
      .setURL(`${DASHBOARD_URL}${CARD_DASHBOARD_PATH}/subscription`),

    new ButtonBuilder()
      .setLabel("👁️ عرض الفئات")
      .setStyle(ButtonStyle.Link)
      .setURL(`${DASHBOARD_URL}${CARD_DASHBOARD_PATH}`),

    new ButtonBuilder()
      .setCustomId(`mycard:info:${userId}`)
      .setLabel("ℹ️ معلومات الفئات")
      .setStyle(ButtonStyle.Secondary)
  )

  return [row]
}

// ══════════════════════════════════════════════════════════════════
//  COMMAND
// ══════════════════════════════════════════════════════════════════

module.exports = {
  data: new SlashCommandBuilder()
    .setName("بطاقتي")
    .setDescription("لوحة التحكم في بطاقة المستوى الخاصة بك")
    .setDMPermission(false),

  helpMeta: {
    category: "xp",
    aliases: ["my-card", "card", "بطاقتي"],
    description: "لوحة تفاعلية لتخصيص بطاقة المستوى — معاينة + تحكم + اشتراك",
    options: [],
    requirements: {
      botRoleHierarchy: false,
      userPermissions: [],
      subscriptionTier: "free"
    },
    cooldown: 3,
    relatedCommands: ["مستوى", "متصدرين_xp"],
    examples: [
      "/بطاقتي"
    ],
    notes: [
      "أمر واحد بدلاً من عدة أوامر منفصلة",
      "متاح للجميع — يعرض الميزات حسب فئتك",
      "التحكم الكامل من الداشبورد على الويب",
      "3 فئات: أساسية $1.99 / متقدمة $3.99 / أسطورية $5.99"
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

      await interaction.deferReply({ ephemeral: true })

      const userId = interaction.user.id

      // ─── جلب بيانات الاشتراك ───
      const subscription = await cardCustomizationSystem.getSubscription(userId)
      const tier = subscription?.status === "active" && !subscription.is_expired
        ? subscription.tier
        : "free"
      const isPremium = tier !== "free"

      // ─── جلب الإعدادات ───
      const settings = await cardCustomizationSystem.getSettings(userId)

      // ─── جلب بيانات XP لتوليد البطاقة ───
      const xpData = await levelSystem.getUserXPData(userId, interaction.guild.id)
      const member = await interaction.guild.members.fetch(userId).catch(() => null)

      // ─── بناء الـ Embed ───
      const embed = buildCardEmbed({
        tier,
        daysLeft: subscription?.days_left || 0,
        isPremium,
        isGift: subscription?.is_gift || false,
        expiresAt: subscription?.expires_at || null
      })

      // ─── توليد معاينة البطاقة (لو عنده XP) ───
      let attachment = null
      if (xpData) {
        try {
          const imageBuffer = await generateRankCard({
            username: member?.displayName || interaction.user.username,
            discriminator: interaction.user.discriminator || "0",
            avatarURL: interaction.user.displayAvatarURL({ extension: "png", size: 256 }),
            level: xpData.level,
            rank: xpData.rank,
            currentXP: xpData.currentXP,
            requiredXP: xpData.requiredXP,
            totalXP: xpData.totalXP,
            progressPercent: xpData.progressPercent,
            customization: settings,
            tier: tier
          })

          attachment = new AttachmentBuilder(imageBuffer, { name: "my-card.png" })
          embed.setImage("attachment://my-card.png")
        } catch (canvasErr) {
          console.error("[MY-CARD CANVAS]", canvasErr.message)
        }
      } else {
        embed.addFields({
          name: "📝 ملاحظة",
          value: "اكتب في السيرفر أول عشان تكسب XP وتظهر بطاقتك",
          inline: false
        })
      }

      // ─── بناء الأزرار حسب الفئة ───
      const components = isPremium
        ? buildPremiumButtons(userId, tier)
        : buildFreeButtons(userId)

      // ─── الرد ───
      const replyPayload = {
        embeds: [embed],
        components
      }

      if (attachment) replyPayload.files = [attachment]

      return interaction.editReply(replyPayload)

    } catch (err) {
      console.error("[MY-CARD ERROR]", err)

      const errorMsg = "❌ حدث خطأ في عرض بطاقتك. حاول مرة ثانية."

      if (interaction.deferred) {
        return interaction.editReply({ content: errorMsg })
      }
      return interaction.reply({ content: errorMsg, ephemeral: true })
    }
  }
}