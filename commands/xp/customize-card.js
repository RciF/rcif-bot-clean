const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require("discord.js")
const cardCustomizationSystem = require("../../systems/cardCustomizationSystem")
const { generateRankCard } = require("../../systems/rankCardSystem")
const levelSystem = require("../../systems/levelSystem")

// ─── ألوان الثيمات للعرض ───
const THEME_CHOICES = [
  { name: "🟡 ذهبي (افتراضي)", value: "amber"  },
  { name: "🔵 أزرق",           value: "blue"   },
  { name: "🟣 بنفسجي",         value: "purple" },
  { name: "🟢 أخضر",           value: "green"  },
  { name: "🔴 أحمر",           value: "red"    },
  { name: "🩷 وردي",           value: "pink"   },
  { name: "🩵 سماوي",          value: "cyan"   },
  { name: "🟠 برتقالي",        value: "orange" },
  { name: "⚪ أبيض",           value: "white"  },
]

module.exports = {
  data: new SlashCommandBuilder()
    .setName("تخصيص_بطاقة")
    .setDescription("خصص شكل بطاقة مستواك (يحتاج اشتراك شخصي)")
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub
        .setName("لون")
        .setDescription("تغيير لون ثيم البطاقة")
        .addStringOption(o =>
          o.setName("الثيم")
            .setDescription("اختر اللون")
            .setRequired(true)
            .addChoices(...THEME_CHOICES)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("خلفية")
        .setDescription("تغيير خلفية البطاقة برابط صورة")
        .addStringOption(o =>
          o.setName("الرابط")
            .setDescription("رابط الصورة (jpg/png/webp)")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("صورة_شخصية")
        .setDescription("تغيير الصورة الشخصية على البطاقة")
        .addStringOption(o =>
          o.setName("الرابط")
            .setDescription("رابط الصورة (jpg/png/webp)")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("معاينة")
        .setDescription("معاينة بطاقتك الحالية مع كل التخصيصات")
    )
    .addSubcommand(sub =>
      sub
        .setName("إعادة_تعيين")
        .setDescription("إعادة البطاقة للشكل الافتراضي")
    )
    .addSubcommand(sub =>
      sub
        .setName("حالة")
        .setDescription("عرض تخصيصاتك الحالية وحالة اشتراكك")
    ),

  helpMeta: {
    category: "xp",
    aliases: ["customize-card", "card-customize", "تخصيص_بطاقة"],
    description: "تخصيص بطاقة المستوى الشخصية (يحتاج اشتراك شخصي)",
    requirements: {
      botRoleHierarchy: false,
      userPermissions: [],
      subscriptionTier: "personal_premium"
    },
    cooldown: 5,
    relatedCommands: ["مستوى"],
    examples: [
      "/تخصيص_بطاقة لون الثيم:🔵 أزرق",
      "/تخصيص_بطاقة خلفية الرابط:https://...",
      "/تخصيص_بطاقة معاينة"
    ],
    notes: [
      "يحتاج اشتراك شخصي $2.99/شهر أو $18/سنة",
      "التخصيص عالمي — يظهر في كل السيرفرات",
      "الخلفية يجب أن تكون رابط صورة مباشر"
    ]
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", flags: 64 })
      }

      const sub = interaction.options.getSubcommand()
      const userId = interaction.user.id

      // ══════════════════════════════════════
      //  حالة — عرض التخصيصات الحالية
      // ══════════════════════════════════════
      if (sub === "حالة") {
        await interaction.deferReply({ flags: 64 })

        const premium = await cardCustomizationSystem.isPremium(userId)
        const custom  = await cardCustomizationSystem.getCustomization(userId)

        const embed = new EmbedBuilder()
          .setColor(premium ? 0xf59e0b : 0x64748b)
          .setTitle("🎨 حالة تخصيص البطاقة")
          .addFields(
            {
              name: "👑 حالة الاشتراك",
              value: premium ? "✅ **مفعّل**" : "❌ **غير مفعّل**",
              inline: true
            },
            {
              name: "🎨 الثيم الحالي",
              value: custom?.theme_color || "amber (افتراضي)",
              inline: true
            },
            {
              name: "🖼️ الخلفية",
              value: custom?.background_url ? "✅ مخصصة" : "❌ افتراضية",
              inline: true
            },
            {
              name: "🧑 الصورة الشخصية",
              value: custom?.avatar_url ? "✅ مخصصة" : "❌ من Discord",
              inline: true
            }
          )

        if (!premium) {
          embed.addFields({
            name: "💳 كيف أشترك؟",
            value: "تواصل مع إدارة البوت للاشتراك\n**$2.99/شهر** أو **$18/سنة**",
            inline: false
          })
        }

        embed.setTimestamp()
        return interaction.editReply({ embeds: [embed] })
      }

      // ══════════════════════════════════════
      //  معاينة — بدون Premium
      // ══════════════════════════════════════
      if (sub === "معاينة") {
        await interaction.deferReply()

        const xpData = await levelSystem.getUserXPData(userId, interaction.guild.id)
        if (!xpData) {
          return interaction.editReply({ content: "❌ ما عندك بيانات XP بعد. اكتب في السيرفر أول!" })
        }

        const custom = await cardCustomizationSystem.getCustomization(userId)
        const member = await interaction.guild.members.fetch(userId).catch(() => null)

        try {
          const imageBuffer = await generateRankCard({
            username: member?.displayName || interaction.user.username,
            discriminator: interaction.user.discriminator || "0",
            avatarURL: custom?.avatar_url || interaction.user.displayAvatarURL({ extension: "png", size: 256 }),
            level: xpData.level,
            rank: xpData.rank,
            currentXP: xpData.currentXP,
            requiredXP: xpData.requiredXP,
            totalXP: xpData.totalXP,
            progressPercent: xpData.progressPercent,
            // تخصيصات
            customization: custom
          })

          const attachment = new AttachmentBuilder(imageBuffer, { name: "rank-preview.png" })

          const isPrem = await cardCustomizationSystem.isPremium(userId)

          return interaction.editReply({
            content: isPrem
              ? "✨ **معاينة بطاقتك المخصصة**"
              : "👁️ **معاينة بدون تخصيص** — اشترك لتفعيل التخصيص",
            files: [attachment]
          })
        } catch (err) {
          return interaction.editReply({ content: "❌ فشل توليد البطاقة." })
        }
      }

      // ══════════════════════════════════════
      //  باقي الأوامر تحتاج Premium
      // ══════════════════════════════════════
      const premium = await cardCustomizationSystem.isPremium(userId)

      if (!premium) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xf59e0b)
              .setTitle("👑 يحتاج اشتراك شخصي")
              .setDescription("تخصيص البطاقة متاح للمشتركين فقط")
              .addFields(
                { name: "💳 الأسعار", value: "**$2.99/شهر** أو **$18/سنة**", inline: true },
                { name: "✨ المميزات", value: "خلفية مخصصة\nلون ثيم\nصورة شخصية\nشارة Premium", inline: true },
                { name: "📩 كيف أشترك؟", value: "تواصل مع إدارة البوت", inline: false }
              )
              .setFooter({ text: "التخصيص عالمي — يظهر في كل السيرفرات" })
              .setTimestamp()
          ],
          flags: 64
        })
      }

      await interaction.deferReply({ flags: 64 })

      // ══════════════════════════════════════
      //  لون — تغيير الثيم
      // ══════════════════════════════════════
      if (sub === "لون") {
        const theme = interaction.options.getString("الثيم")

        const saved = await cardCustomizationSystem.saveCustomization(userId, { theme_color: theme })

        if (!saved) {
          return interaction.editReply({ content: "❌ فشل الحفظ، حاول مرة ثانية." })
        }

        const themeData = cardCustomizationSystem.getTheme(theme)

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(parseInt(themeData.accent.replace("#", ""), 16))
              .setTitle("✅ تم تغيير الثيم")
              .setDescription(`الثيم الجديد: **${theme}**\nاستخدم \`/تخصيص_بطاقة معاينة\` لترى النتيجة`)
              .setTimestamp()
          ]
        })
      }

      // ══════════════════════════════════════
      //  خلفية — تغيير الخلفية
      // ══════════════════════════════════════
      if (sub === "خلفية") {
        const url = interaction.options.getString("الرابط")

        if (!cardCustomizationSystem.isValidImageUrl(url)) {
          return interaction.editReply({
            content: "❌ الرابط غير صحيح — يجب أن ينتهي بـ jpg/png/gif/webp"
          })
        }

        const saved = await cardCustomizationSystem.saveCustomization(userId, { background_url: url })

        if (!saved) {
          return interaction.editReply({ content: "❌ فشل الحفظ، حاول مرة ثانية." })
        }

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x22c55e)
              .setTitle("✅ تم تغيير الخلفية")
              .setDescription("استخدم `/تخصيص_بطاقة معاينة` لترى النتيجة")
              .setImage(url)
              .setTimestamp()
          ]
        })
      }

      // ══════════════════════════════════════
      //  صورة شخصية — تغيير الأفاتار
      // ══════════════════════════════════════
      if (sub === "صورة_شخصية") {
        const url = interaction.options.getString("الرابط")

        if (!cardCustomizationSystem.isValidImageUrl(url)) {
          return interaction.editReply({
            content: "❌ الرابط غير صحيح — يجب أن ينتهي بـ jpg/png/gif/webp"
          })
        }

        const saved = await cardCustomizationSystem.saveCustomization(userId, { avatar_url: url })

        if (!saved) {
          return interaction.editReply({ content: "❌ فشل الحفظ، حاول مرة ثانية." })
        }

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x22c55e)
              .setTitle("✅ تم تغيير الصورة الشخصية")
              .setDescription("استخدم `/تخصيص_بطاقة معاينة` لترى النتيجة")
              .setThumbnail(url)
              .setTimestamp()
          ]
        })
      }

      // ══════════════════════════════════════
      //  إعادة تعيين
      // ══════════════════════════════════════
      if (sub === "إعادة_تعيين") {
        await cardCustomizationSystem.resetCustomization(userId)

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xef4444)
              .setTitle("🔄 تم إعادة التعيين")
              .setDescription("تم مسح كل تخصيصاتك، البطاقة رجعت للشكل الافتراضي")
              .setTimestamp()
          ]
        })
      }

    } catch (err) {
      console.error("[CARD CUSTOMIZE ERROR]", err)

      const msg = "❌ حدث خطأ في تخصيص البطاقة."
      if (interaction.deferred) return interaction.editReply({ content: msg })
      if (!interaction.replied) return interaction.reply({ content: msg, flags: 64 })
    }
  }
}