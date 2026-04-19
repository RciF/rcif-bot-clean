// commands/ai/chat.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js")
const aiHandler = require("../../systems/aiHandler")
const aiRateLimitSystem = require("../../systems/aiRateLimitSystem")
const planGateSystem = require("../../systems/planGateSystem")

// ✅ تقطيع الرد لو طويل (حد Discord = 4096 في الـ Embed Description)
function splitResponse(text, maxLength = 4000) {
  if (text.length <= maxLength) return [text]

  const chunks = []
  let current = ""

  for (const line of text.split("\n")) {
    if ((current + "\n" + line).length > maxLength) {
      chunks.push(current.trim())
      current = line
    } else {
      current += (current ? "\n" : "") + line
    }
  }

  if (current.trim()) chunks.push(current.trim())
  return chunks
}

// ✅ دالة مساعدة آمنة للرد
async function safeReply(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(payload)
    }
    return await interaction.reply(payload)
  } catch (err) {
    // الـ interaction انتهت أو أي خطأ → silent fail
    return null
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ذكاء")
    .setDescription("اسأل الذكاء الاصطناعي سؤالاً")
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName("سؤال")
        .setDescription("اكتب سؤالك أو رسالتك للذكاء الاصطناعي")
        .setRequired(true)
        .setMaxLength(1000)
    )
    .addStringOption(option =>
      option
        .setName("النموذج")
        .setDescription("اختر نموذج الذكاء الاصطناعي (اختياري)")
        .setRequired(false)
        .addChoices(
          { name: "⚡ سريع | Fast",           value: "fast"    },
          { name: "🧠 ذكي | Smart (افتراضي)", value: "smart"   },
          { name: "🎨 إبداعي | Creative",      value: "creative" }
        )
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return safeReply(interaction, {
          content: "❌ هذا الأمر داخل السيرفر فقط",
          flags: MessageFlags.Ephemeral
        })
      }

      const userId = interaction.user.id
      const question = interaction.options.getString("سؤال")
      const model    = interaction.options.getString("النموذج") || "smart"

      // ✅ NEW: فحص Rate Limit للمستخدم (قبل أي شيء آخر)
      const rateLimitCheck = aiRateLimitSystem.checkUserRateLimit(userId)

      if (!rateLimitCheck.allowed) {
        const rateLimitEmbed = new EmbedBuilder()
          .setColor(0xf59e0b)
          .setTitle("⏳ تجاوزت الحد المسموح")
          .setDescription(rateLimitCheck.message)
          .setFooter({ text: "هذا الحد لحماية الذكاء الاصطناعي من الضغط" })
          .setTimestamp()

        return safeReply(interaction, {
          embeds: [rateLimitEmbed],
          flags: MessageFlags.Ephemeral
        })
      }

      // ✅ NEW: فحص حد السيرفر اليومي (حسب الخطة)
      // نوع الاستخدام: creative يختلف عن العادي
      const limitType = model === "creative" ? "creative" : "command"
      const aiLimit = await planGateSystem.checkAILimit(interaction.guild.id, limitType)

      if (!aiLimit.allowed) {
        const limitEmbed = new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle("🚫 وصلتوا الحد اليومي")
          .setDescription(aiLimit.message)
          .setTimestamp()

        return safeReply(interaction, {
          embeds: [limitEmbed],
          flags: MessageFlags.Ephemeral
        })
      }

      // ✅ تأجيل الرد مع حماية من انتهاء الـ interaction
      try {
        await interaction.deferReply()
      } catch {
        return
      }

      // ✅ قياس وقت الاستجابة
      const startTime = Date.now()

      // ✅ استدعاء الـ AI
      let answer = null
      let errorMessage = null

      try {
        answer = await aiHandler.askAI?.(interaction.user.id, question, {
          model,
          user: interaction.user,
          guild: interaction.guild,
          channel: interaction.channel
        })
      } catch (aiError) {
        console.error("[AI HANDLER ERROR]", aiError)
        errorMessage = aiError.message || "خطأ غير معروف"
      }

      const responseTime = Date.now() - startTime

      // ✅ لو ما رجع رد
      if (!answer) {
        const errorEmbed = new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle("❌ فشل الذكاء الاصطناعي")
          .setDescription(
            errorMessage?.includes("limit") || errorMessage?.includes("quota")
              ? "⚠️ تم تجاوز الحد اليومي للذكاء الاصطناعي في هذا السيرفر.\nجرّب مرة ثانية غداً أو تواصل مع الإدارة."
              : "ما قدرت أحصل على رد الآن. جرّب مرة ثانية."
          )
          .setFooter({ text: `وقت المحاولة: ${responseTime}ms` })
          .setTimestamp()

        return safeReply(interaction, { embeds: [errorEmbed] })
      }

      // ✅ NEW: سجّل استخدام السيرفر بعد الرد الناجح
      planGateSystem.recordAIUsage(interaction.guild.id, limitType)

      // ✅ تقطيع الرد لو طويل
      const chunks = splitResponse(answer)

      // ✅ Embed الأول (الرد الرئيسي)
      const modelLabels = {
        fast:     "⚡ سريع",
        smart:    "🧠 ذكي",
        creative: "🎨 إبداعي"
      }

      const firstEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setAuthor({
          name: interaction.user.displayName || interaction.user.username,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .addFields({
          name: "❓ السؤال",
          value: question.length > 300 ? question.slice(0, 297) + "..." : question,
          inline: false
        })
        .setDescription(chunks[0])
        .setFooter({
          text: [
            `نموذج: ${modelLabels[model] || model}`,
            `وقت الاستجابة: ${responseTime}ms`,
            chunks.length > 1 ? `الجزء 1 من ${chunks.length}` : null
          ].filter(Boolean).join(" | ")
        })
        .setTimestamp()

      // ✅ لو الرد جزء واحد فقط
      if (chunks.length === 1) {
        return safeReply(interaction, { embeds: [firstEmbed] })
      }

      // ✅ لو الرد متعدد الأجزاء
      const embeds = [firstEmbed]

      for (let i = 1; i < chunks.length && i < 4; i++) {
        embeds.push(
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setDescription(chunks[i])
            .setFooter({ text: `الجزء ${i + 1} من ${chunks.length}` })
        )
      }

      return safeReply(interaction, { embeds })

    } catch (error) {
      console.error("[CHAT AI ERROR]", error)

      // ✅ استخدام safeReply بدل try/catch منفصل
      return safeReply(interaction, {
        embeds: [
          new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle("❌ خطأ غير متوقع")
            .setDescription("حصل خطأ في الذكاء الاصطناعي. حاول مرة ثانية.")
            .setTimestamp()
        ]
      })
    }
  },
}