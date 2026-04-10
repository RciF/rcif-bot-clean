const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const settingsSystem = require("../../systems/settingsSystem")
const planGateSystem = require("../../systems/planGateSystem")

const PLAN_NAMES = {
  free:    "🩶 مجاني",
  silver:  "🥈 فضي",
  gold:    "🥇 ذهبي",
  diamond: "💎 ماسي"
}

const PLAN_COLORS = {
  free:    0x64748b,
  silver:  0x94a3b8,
  gold:    0xf59e0b,
  diamond: 0x60a5fa
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("عرض إعدادات وحالة أنظمة السيرفر")
    .setDMPermission(false),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({
          content: "❌ هذا الأمر داخل السيرفر فقط",
          ephemeral: true
        })
      }

      await interaction.deferReply()

      const guildId = interaction.guild.id

      // ✅ جلب الإعدادات والخطة معاً
      const [settings, plan, limits, aiStats] = await Promise.all([
        settingsSystem.getSettings(guildId),
        planGateSystem.getGuildPlan(guildId),
        planGateSystem.getGuildLimits(guildId),
        planGateSystem.getAIStats(guildId)
      ])

      const planColor = PLAN_COLORS[plan] || PLAN_COLORS.free
      const planName  = PLAN_NAMES[plan]  || PLAN_NAMES.free

      // ✅ حالة كل نظام
      const systemStatus = (enabled, planAllowed) => {
        if (!planAllowed) return "🔒 يحتاج اشتراك"
        return enabled ? "🟢 مفعّل" : "🔴 معطّل"
      }

      const aiAllowed  = plan !== "free"
      const xpAllowed  = plan !== "free"
      const ecoAllowed = plan !== "free"

      // ✅ حساب نسبة استخدام AI
      const aiUsed      = aiStats?.used || 0
      const aiLimit     = aiStats?.limit || 0
      const aiRemaining = aiStats?.remaining || 0
      const aiPercent   = aiLimit > 0 ? Math.round((aiUsed / aiLimit) * 100) : 0

      const aiBar = aiLimit > 0
        ? buildProgressBar(aiPercent)
        : "غير متاح"

      // ✅ بناء الـ Embed
      const embed = new EmbedBuilder()
        .setColor(planColor)
        .setTitle("⚙️ إعدادات السيرفر")
        .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 128 }))
        .addFields(
          {
            name: "👑 الخطة الحالية",
            value: planName,
            inline: true
          },
          {
            name: "🏠 السيرفر",
            value: interaction.guild.name,
            inline: true
          },
          {
            name: "\u200b",
            value: "\u200b",
            inline: true
          },
          {
            name: "🤖 الذكاء الاصطناعي",
            value: systemStatus(settings.ai, aiAllowed),
            inline: true
          },
          {
            name: "⭐ نظام XP",
            value: systemStatus(settings.xp, xpAllowed),
            inline: true
          },
          {
            name: "💰 الاقتصاد",
            value: systemStatus(settings.economy, ecoAllowed),
            inline: true
          }
        )

      // ✅ إحصائيات AI اليومية — فقط لو الخطة تدعمها
      if (aiAllowed && aiLimit > 0) {
        embed.addFields({
          name: "📊 استخدام الذكاء الاصطناعي اليوم",
          value: [
            `${aiBar} **${aiPercent}%**`,
            `✉️ مُستخدم: **${aiUsed}** | 🔋 متبقي: **${aiRemaining}** | 📦 الحد: **${aiLimit}**`,
            `🔄 يتجدد: منتصف الليل`
          ].join("\n"),
          inline: false
        })
      }

      // ✅ تلميح لو على الخطة المجانية
      if (plan === "free") {
        embed.addFields({
          name: "💡 ترقية الخطة",
          value: "الخطة المجانية تدعم الإشراف فقط.\nللحصول على AI + XP + اقتصاد — اشترك من لوحة التحكم.",
          inline: false
        })
      }

      embed
        .setFooter({
          text: `طلب من: ${interaction.user.username} | استخدم /config لتغيير الإعدادات`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp()

      return interaction.editReply({ embeds: [embed] })

    } catch (error) {
      console.error("[SETTINGS ERROR]", error)

      if (interaction.deferred) {
        return interaction.editReply({ content: "❌ حصل خطأ في عرض الإعدادات" })
      }
      return interaction.reply({
        content: "❌ حصل خطأ في عرض الإعدادات",
        ephemeral: true
      })
    }
  },
}

// ✅ شريط تقدم بسيط
function buildProgressBar(percent) {
  const filled = Math.round(percent / 10)
  const empty  = 10 - filled
  return "🟦".repeat(filled) + "⬜".repeat(empty)
}