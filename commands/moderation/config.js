const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const commandGuardSystem = require("../../systems/commandGuardSystem")
const configSystem = require("../../systems/configSystem")
const settingsSystem = require("../../systems/settingsSystem")
const planGateSystem = require("../../systems/planGateSystem")

const SYSTEM_INFO = {
  ai:      { name: "الذكاء الاصطناعي", emoji: "🤖", plan: "silver" },
  xp:      { name: "نظام XP",          emoji: "⭐", plan: "silver" },
  economy: { name: "الاقتصاد",          emoji: "💰", plan: "silver" }
}

const PLAN_NAMES = {
  free:    "🩶 مجاني",
  silver:  "🥈 فضي",
  gold:    "🥇 ذهبي",
  diamond: "💎 ماسي"
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("تفعيل أو تعطيل أنظمة السيرفر")
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName("النظام")
        .setDescription("اختر النظام المراد تعديله")
        .setRequired(true)
        .addChoices(
          { name: "🤖 الذكاء الاصطناعي | AI",  value: "ai"      },
          { name: "⭐ نظام XP | XP",            value: "xp"      },
          { name: "💰 الاقتصاد | Economy",       value: "economy" }
        )
    )
    .addStringOption(option =>
      option
        .setName("الحالة")
        .setDescription("تشغيل أو إيقاف النظام")
        .setRequired(true)
        .addChoices(
          { name: "✅ تشغيل | Enable",   value: "on"  },
          { name: "❌ إيقاف | Disable",  value: "off" }
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

      // ✅ تحقق: إدارة فقط
      const isAdmin = commandGuardSystem.requireAdmin(interaction)
      if (!isAdmin) {
        return interaction.reply({
          content: "❌ هذا الأمر للإدارة فقط",
          ephemeral: true
        })
      }

      await interaction.deferReply()

      const system  = interaction.options.getString("النظام")
      const state   = interaction.options.getString("الحالة")
      const enabled = state === "on"
      const guildId = interaction.guild.id

      const info = SYSTEM_INFO[system]

      // ✅ تحقق من الخطة قبل التفعيل
      if (enabled) {
        const planCheck = await planGateSystem.checkFeature(guildId, system)

        if (!planCheck.allowed) {
          const embed = new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle("🔒 الخطة لا تدعم هذه الميزة")
            .setDescription(planCheck.message)
            .addFields(
              {
                name: "📦 النظام المطلوب",
                value: `${info.emoji} ${info.name}`,
                inline: true
              },
              {
                name: "👑 خطتك الحالية",
                value: PLAN_NAMES[planCheck.plan] || planCheck.plan,
                inline: true
              },
              {
                name: "💡 الحل",
                value: "قم بالترقية من [لوحة التحكم](https://rcif-dashboard.onrender.com)",
                inline: false
              }
            )
            .setTimestamp()

          return interaction.editReply({ embeds: [embed] })
        }
      }

      // ✅ تنفيذ التحديث
      const success = await configSystem.updateSystem(guildId, system, enabled)

      if (!success) {
        return interaction.editReply({
          content: "❌ فشل تحديث الإعداد، حاول مرة ثانية"
        })
      }

      // ✅ جلب الإعدادات الحالية بعد التحديث
      const settings = await settingsSystem.getSettings(guildId)

      // ✅ Embed النجاح
      const embed = new EmbedBuilder()
        .setColor(enabled ? 0x22c55e : 0xef4444)
        .setTitle(`${info.emoji} تم تحديث ${info.name}`)
        .addFields(
          {
            name: "📦 النظام",
            value: `${info.emoji} ${info.name}`,
            inline: true
          },
          {
            name: "🔄 الحالة الجديدة",
            value: enabled ? "🟢 مفعّل" : "🔴 معطّل",
            inline: true
          },
          {
            name: "👮 بواسطة",
            value: `${interaction.user} (\`${interaction.user.username}\`)`,
            inline: true
          },
          {
            name: "📊 حالة جميع الأنظمة",
            value: [
              `🤖 الذكاء الاصطناعي: ${settings.ai      ? "🟢 مفعّل" : "🔴 معطّل"}`,
              `⭐ نظام XP:          ${settings.xp      ? "🟢 مفعّل" : "🔴 معطّل"}`,
              `💰 الاقتصاد:         ${settings.economy  ? "🟢 مفعّل" : "🔴 معطّل"}`
            ].join("\n"),
            inline: false
          }
        )
        .setFooter({
          text: `${interaction.guild.name} | استخدم /settings لعرض كل الإعدادات`,
          iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setTimestamp()

      return interaction.editReply({ embeds: [embed] })

    } catch (error) {
      console.error("[CONFIG ERROR]", error)

      if (interaction.deferred) {
        return interaction.editReply({ content: "❌ حصل خطأ في تحديث الإعدادات" })
      }
      return interaction.reply({
        content: "❌ حصل خطأ في تحديث الإعدادات",
        ephemeral: true
      })
    }
  },
}