// ══════════════════════════════════════════════════════════════════
//  /help — دليل أوامر البوت الكامل
//  المسار: commands/info/help.js
//
//  الاستخدام:
//   /help                 → القائمة الرئيسية (كل الفئات)
//   /help [اسم_الأمر]     → تفاصيل أمر معين مباشرة
//   /help حظر             → يفتح تفاصيل /حظر
//   /help ban             → نفس النتيجة (alias)
//   /help تذاكر إعداد     → يفتح تفاصيل /تذاكر إعداد
//
//  Cooldown: 3 ثواني لكل مستخدم
//
//  Helpful behaviors:
//   • Ephemeral — كل الردود مرئية للمستخدم فقط
//   • Autocomplete — اقتراحات أثناء الكتابة
//   • بحث ذكي — بالعربي والإنجليزي
// ══════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, MessageFlags } = require("discord.js")

const helpSystem  = require("../../systems/helpSystem")
const helpHandler = require("../../systems/helpInteractionHandler")
const logger = require("../../systems/loggerSystem")

// ══════════════════════════════════════════════════════════════════
//  COOLDOWN MAP — 3 ثواني لكل مستخدم
// ══════════════════════════════════════════════════════════════════

const cooldowns = new Map()
const COOLDOWN_MS = 3000

function checkCooldown(userId) {
  const now = Date.now()
  const lastUsed = cooldowns.get(userId) || 0
  const remaining = COOLDOWN_MS - (now - lastUsed)

  if (remaining > 0) {
    return {
      onCooldown: true,
      remainingSeconds: Math.ceil(remaining / 1000)
    }
  }

  cooldowns.set(userId, now)

  // تنظيف دوري — كل 10 دقائق
  if (cooldowns.size > 1000) {
    const cutoff = now - COOLDOWN_MS
    for (const [uid, ts] of cooldowns) {
      if (ts < cutoff) cooldowns.delete(uid)
    }
  }

  return { onCooldown: false, remainingSeconds: 0 }
}

// ══════════════════════════════════════════════════════════════════
//  AUTOCOMPLETE — اقتراحات أثناء الكتابة
// ══════════════════════════════════════════════════════════════════

async function handleAutocomplete(interaction) {
  try {
    const focused = interaction.options.getFocused() || ""
    const query = focused.trim().toLowerCase()

    let results

    if (!query) {
      // ✅ لو ما كتب شي بعد، اعرض أول 25 أمر
      const stats = helpSystem.getStats()
      results = []

      // اجلب من كل الفئات (ترتيب منطقي)
      const categories = helpSystem.getAllCategories()
      for (const cat of categories) {
        const commands = helpSystem.getCategoryCommands(cat.id)
        for (const cmd of commands) {
          results.push(cmd)
          if (results.length >= 25) break
        }
        if (results.length >= 25) break
      }
    } else {
      // ✅ بحث متقدم
      results = helpSystem.searchCommands(query, 25)
    }

    const choices = results.slice(0, 25).map(cmd => {
      const tier = cmd.subscriptionTier || "free"
      const tierEmojis = {
        free:    "✅",
        silver:  "🥈",
        gold:    "💎",
        diamond: "🔒"
      }
      const emoji = tierEmojis[tier] || "✅"

      return {
        name: `${emoji} /${cmd.name} — ${cmd.description}`.slice(0, 100),
        value: cmd.name.slice(0, 100)
      }
    })

    await interaction.respond(choices)

  } catch (err) {
    // فشل صامت في autocomplete (Discord ما يعرض رسالة خطأ للمستخدم)
    try {
      await interaction.respond([])
    } catch {}
  }
}

// ══════════════════════════════════════════════════════════════════
//  COMMAND DEFINITION
// ══════════════════════════════════════════════════════════════════

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("دليل أوامر البوت الكامل")
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName("الأمر")
        .setDescription("اسم الأمر للبحث المباشر (اختياري) — يدعم العربي والإنجليزي")
        .setRequired(false)
        .setAutocomplete(true)
        .setMaxLength(100)
    ),

  // ── helpMeta للأمر نفسه ──
  helpMeta: {
    category: "info",
    aliases: ["help", "مساعدة", "دليل", "أوامر"],
    description: "دليل أوامر البوت الكامل — تصفح الأوامر بالفئات أو ابحث عن أمر معين",
    options: [
      {
        name: "الأمر",
        description: "اسم الأمر للبحث المباشر (يدعم العربي والإنجليزي)",
        required: false
      }
    ],
    requirements: {
      botRoleHierarchy: false,
      userPermissions: [],
      subscriptionTier: "free"
    },
    cooldown: 3,
    examples: [
      "/help",
      "/help حظر",
      "/help ban",
      "/help تذاكر إعداد"
    ],
    notes: [
      "الردود مرئية لك فقط (Ephemeral) — ما تعفس القناة",
      "يدعم البحث بالعربي والإنجليزي عبر الـ aliases",
      "اضغط أي أمر من القائمة لعرض تفاصيله الكاملة"
    ],
    relatedCommands: []
  },

  // ── Autocomplete handler ──
  autocomplete: handleAutocomplete,

  // ══════════════════════════════════════════════════════════════════
  //  EXECUTE
  // ══════════════════════════════════════════════════════════════════

  async execute(interaction) {
    try {
      // ── فحص: داخل سيرفر فقط ──
      if (!interaction.guild) {
        return interaction.reply({
          content: "❌ هذا الأمر داخل السيرفر فقط.",
          flags: MessageFlags.Ephemeral
        })
      }

      // ── فحص الكولداون ──
      const cd = checkCooldown(interaction.user.id)
      if (cd.onCooldown) {
        return interaction.reply({
          content: `⏳ الرجاء الانتظار **${cd.remainingSeconds}** ${cd.remainingSeconds === 1 ? "ثانية" : "ثواني"} قبل استخدام الأمر مرة ثانية.`,
          flags: MessageFlags.Ephemeral
        })
      }

      // ── جلب الـ option ──
      const commandQuery = interaction.options.getString("الأمر")

      // ══════════════════════════════════════════════════════════════
      //  CASE A: /help [اسم_أمر] → عرض تفاصيل الأمر مباشرة
      // ══════════════════════════════════════════════════════════════
      if (commandQuery) {
        const payload = await helpHandler.buildCommandDetailPayload(
          interaction.client,
          interaction.guild,
          interaction.guildId,
          commandQuery
        )

        return interaction.reply(payload)
      }

      // ══════════════════════════════════════════════════════════════
      //  CASE B: /help → القائمة الرئيسية
      // ══════════════════════════════════════════════════════════════
      const payload = await helpHandler.buildHomePagePayload(
        interaction.client,
        interaction.guildId
      )

      return interaction.reply(payload)

    } catch (error) {
      logger.error("HELP_COMMAND_FAILED", {
        userId: interaction.user.id,
        guildId: interaction.guildId,
        error: error.message
      })

      const errMsg = "❌ حدث خطأ أثناء فتح الدليل. حاول مرة ثانية."

      try {
        if (interaction.replied || interaction.deferred) {
          return interaction.followUp({
            content: errMsg,
            flags: MessageFlags.Ephemeral
          })
        }
        return interaction.reply({
          content: errMsg,
          flags: MessageFlags.Ephemeral
        })
      } catch {}
    }
  }
}