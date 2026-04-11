const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require("discord.js")
const levelSystem = require("../../systems/levelSystem")
const { generateRankCard } = require("../../systems/rankCardSystem")

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

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const targetUser = interaction.options.getUser("العضو") || interaction.user
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

      await interaction.deferReply()

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
          progressPercent: xpData.progressPercent
        })

        const attachment = new AttachmentBuilder(imageBuffer, { name: "rank.png" })

        return interaction.editReply({ files: [attachment] })

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
                { name: "🏆 الترتيب", value: `**#${xpData.rank}**`, inline: true },
                { name: "⭐ المستوى", value: `**${xpData.level}**`, inline: true },
                { name: "📊 التقدم", value: `**${xpData.progressPercent}%**`, inline: true },
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