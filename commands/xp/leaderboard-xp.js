const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const levelSystem = require("../../systems/levelSystem")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("متصدرين_xp")
    .setDescription("عرض أكثر الأعضاء نشاطاً في السيرفر")
    .setDMPermission(false)
    .addIntegerOption(option =>
      option
        .setName("العدد")
        .setDescription("عدد الأعضاء في القائمة (1-20، الافتراضي 10)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(20)
    ),

  async execute(interaction) {
    try {
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const limit = interaction.options.getInteger("العدد") || 10

      await interaction.deferReply()

      const leaderboard = await levelSystem.getLeaderboard(interaction.guild.id, limit)

      if (!leaderboard.length) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x64748b)
              .setTitle("⭐ متصدرين الـ XP")
              .setDescription("🏜️ ما فيه بيانات بعد. الأعضاء يحتاجون يكتبون في السيرفر أول!")
              .setTimestamp()
          ]
        })
      }

      const medals = ["🥇", "🥈", "🥉"]

      // ✅ جلب أسماء الأعضاء
      const rows = await Promise.allSettled(
        leaderboard.map(async (u, i) => {
          let displayName = `<@${u.user_id}>`
          try {
            const member = await interaction.guild.members.fetch(u.user_id)
            displayName = member.displayName
          } catch { }

          const rank = i < 3 ? medals[i] : `\`#${i + 1}\``
          const totalXP = u.xp || 0
          const { level, currentXP, requiredXP } = levelSystem.calculateLevelFromXP(totalXP)
          const percent = Math.floor((currentXP / requiredXP) * 100)

          return `${rank} **${displayName}**\n    ⭐ المستوى **${level}** — ${totalXP.toLocaleString("ar-SA")} XP (${percent}%)\n`
        })
      )

      const listText = rows
        .filter(r => r.status === "fulfilled")
        .map(r => r.value)
        .join("\n")

      // ✅ ترتيب المستخدم الحالي
      const myData = await levelSystem.getUserXPData(interaction.user.id, interaction.guild.id)
      const myRankText = myData
        ? `#${myData.rank} — مستوى **${myData.level}** (${myData.totalXP.toLocaleString("ar-SA")} XP)`
        : "ما لديك XP بعد"

      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle(`⭐ متصدرين الـ XP — ${interaction.guild.name}`)
        .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 128 }))
        .setDescription(listText || "لا يوجد بيانات")
        .addFields(
          { name: "📍 ترتيبك", value: myRankText, inline: true },
          { name: "👥 إجمالي المشاركين", value: `${leaderboard.length}`, inline: true }
        )
        .setFooter({ text: `استخدم /مستوى لعرض بطاقتك الشخصية` })
        .setTimestamp()

      return interaction.editReply({ embeds: [embed] })

    } catch (err) {
      console.error("[XP LEADERBOARD ERROR]", err)

      if (interaction.deferred) {
        return interaction.editReply({ content: "❌ حدث خطأ في عرض المتصدرين." })
      }
      return interaction.reply({ content: "❌ حدث خطأ في عرض المتصدرين.", ephemeral: true })
    }
  }
}