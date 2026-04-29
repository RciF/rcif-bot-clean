const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require("discord.js")
const levelSystem = require("../../systems/levelSystem")
const { generateRankCard } = require("../../systems/rankCardSystem")
const cardCustomizationSystem = require("../../systems/cardCustomizationSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("مستوى")
    .setDescription("عرض مستواك وXP مع بطاقة مخصصة")
    .setDMPermission(false)
    .addUserOption(option =>
      option
        .setName("العضو")
        .setDescription("عرض مستوى عضو آخر (اختياري)")
        .setRequired(false)
    ),

  helpMeta: {
    category: "xp",
    aliases: ["rank", "level", "xp", "مستوى"],
    description: "عرض بطاقة XP الشخصية مع المستوى والتقدم",
    options: [
      { name: "العضو", description: "عرض مستوى عضو آخر (اختياري)", required: false }
    ],
    requirements: {
      botRoleHierarchy: false,
      userPermissions: [],
      subscriptionTier: "silver"
    },
    cooldown: 0,
    relatedCommands: ["متصدرين_xp", "تخصيص_بطاقة"],
    examples: [
      "/مستوى",
      "/مستوى العضو:@أحمد"
    ],
    notes: [
      "يولد بطاقة صورة جميلة بالـ Canvas",
      "يعرض: المستوى، XP الحالي، XP المطلوب، التقدم %",
      "المشتركون يحصلون على بطاقة مخصصة بألوانهم وخلفيتهم"
    ]
  },

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const targetUser = interaction.options.getUser("العضو") || interaction.user

      // ✅ deferReply أول شيء قبل أي await
      await interaction.deferReply()

      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

      // ✅ جلب بيانات XP
      const xpData = await levelSystem.getUserXPData(targetUser.id, interaction.guild.id)

      if (!xpData) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x64748b)
              .setTitle("⭐ لا توجد بيانات")
              .setDescription(`${targetUser} ما بدأ يكسب XP بعد. لازم يكتب في السيرفر أول!`)
              .setTimestamp()
          ]
        })
      }

      // ✅ جلب التخصيص (لو موجود)
      const customization = await cardCustomizationSystem.getCustomization(targetUser.id)

      // ✅ توليد الصورة
      try {
        const imageBuffer = await generateRankCard({
          username: member?.displayName || targetUser.username,
          discriminator: targetUser.discriminator || "0",
          avatarURL: targetUser.displayAvatarURL({ extension: "png", size: 256 }),
          level: xpData.level,
          rank: xpData.rank,
          currentXP: xpData.currentXP,
          requiredXP: xpData.requiredXP,
          totalXP: xpData.totalXP,
          progressPercent: xpData.progressPercent,
          customization
        })

        const attachment = new AttachmentBuilder(imageBuffer, { name: "rank.png" })

        // ✅ لو العضو المستهدف غير المستخدم الحالي — ما نضيف زر التخصيص
        const isOwnCard = targetUser.id === interaction.user.id
        const isPremium = isOwnCard
          ? await cardCustomizationSystem.isPremium(interaction.user.id)
          : false

        const content = (isOwnCard && !isPremium)
          ? "💡 خصص بطاقتك بـ `/تخصيص_بطاقة` — **$2.99/شهر** أو **$18/سنة**"
          : null

        return interaction.editReply({ content, files: [attachment] })

      } catch (canvasError) {
        console.error("[RANK CARD ERROR]", canvasError.message)

        // ✅ Fallback — Embed عادي لو Canvas فشل
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xf59e0b)
              .setTitle(`⭐ مستوى ${member?.displayName || targetUser.username}`)
              .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
              .addFields(
                { name: "🏆 الترتيب",   value: `**#${xpData.rank}**`,                         inline: true },
                { name: "⭐ المستوى",   value: `**${xpData.level}**`,                          inline: true },
                { name: "📊 التقدم",    value: `**${xpData.progressPercent}%**`,               inline: true },
                { name: "✨ XP الحالي", value: `**${xpData.currentXP.toLocaleString("ar-SA")}** / **${xpData.requiredXP.toLocaleString("ar-SA")}**`, inline: false },
                { name: "💫 إجمالي XP", value: `**${xpData.totalXP.toLocaleString("ar-SA")}** XP`, inline: true }
              )
              .setTimestamp()
          ]
        })
      }

    } catch (err) {
      console.error("[RANK ERROR]", err)

      if (interaction.deferred) {
        return interaction.editReply({ content: "❌ حدث خطأ في عرض المستوى." })
      }
      return interaction.reply({ content: "❌ حدث خطأ في عرض المستوى.", ephemeral: true })
    }
  }
}
