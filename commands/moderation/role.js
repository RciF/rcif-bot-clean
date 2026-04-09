const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("رتبة")
    .setDescription("إعطاء أو سحب رتبة من عضو")
    .setNameLocalizations({ "en-US": "role", "en-GB": "role" })
    .setDescriptionLocalizations({
      "en-US": "Add or remove a role from a member",
      "en-GB": "Add or remove a role from a member"
    })
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(option =>
      option
        .setName("العضو")
        .setDescription("العضو المراد تعديل رتبته")
        .setNameLocalizations({ "en-US": "member", "en-GB": "member" })
        .setDescriptionLocalizations({ "en-US": "The member to modify role for", "en-GB": "The member to modify role for" })
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName("الرتبة")
        .setDescription("الرتبة المراد إعطاؤها أو سحبها")
        .setNameLocalizations({ "en-US": "role", "en-GB": "role" })
        .setDescriptionLocalizations({ "en-US": "The role to add or remove", "en-GB": "The role to add or remove" })
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("الإجراء")
        .setDescription("إعطاء أو سحب الرتبة")
        .setNameLocalizations({ "en-US": "action", "en-GB": "action" })
        .setDescriptionLocalizations({ "en-US": "Add or remove the role", "en-GB": "Add or remove the role" })
        .setRequired(true)
        .addChoices(
          { name: "➕ إعطاء الرتبة", value: "add" },
          { name: "➖ سحب الرتبة", value: "remove" }
        )
    )
    .addStringOption(option =>
      option
        .setName("السبب")
        .setDescription("سبب تعديل الرتبة (اختياري)")
        .setNameLocalizations({ "en-US": "reason", "en-GB": "reason" })
        .setDescriptionLocalizations({ "en-US": "Reason for role change (optional)", "en-GB": "Reason for role change (optional)" })
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      // ✅ تحقق: داخل سيرفر فقط
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر داخل السيرفر فقط", ephemeral: true })
      }

      const targetUser = interaction.options.getUser("العضو")
      const role = interaction.options.getRole("الرتبة")
      const action = interaction.options.getString("الإجراء")
      const reason = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

      // ✅ جلب العضو
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

      if (!member) {
        return interaction.reply({ content: "❌ ما قدرت ألقى هذا العضو.", ephemeral: true })
      }

      // ✅ تحقق: لا تعدل رتبة @everyone
      if (role.id === interaction.guild.id) {
        return interaction.reply({ content: "❌ ما تقدر تعدل رتبة @everyone.", ephemeral: true })
      }

      // ✅ تحقق: الرتبة مو managed (بوت أو integration)
      if (role.managed) {
        return interaction.reply({ content: "❌ هذي رتبة مُدارة (تابعة لبوت أو ربط خارجي) وما تقدر تتحكم فيها.", ephemeral: true })
      }

      // ✅ تحقق: رتبة البوت أعلى من الرتبة المطلوبة
      const botMember = interaction.guild.members.me
      if (role.position >= botMember.roles.highest.position) {
        return interaction.reply({ content: "❌ رتبة البوت أقل من أو تساوي هذي الرتبة. ارفع رتبة البوت أولاً.", ephemeral: true })
      }

      // ✅ تحقق: رتبة المنفذ أعلى من الرتبة المطلوبة
      if (role.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
        return interaction.reply({ content: "❌ ما تقدر تعطي أو تسحب رتبة أعلى منك أو تساويك.", ephemeral: true })
      }

      const hasRole = member.roles.cache.has(role.id)

      // ✅ إعطاء الرتبة
      if (action === "add") {
        if (hasRole) {
          return interaction.reply({ content: `⚠️ ${targetUser} عنده رتبة ${role} بالفعل.`, ephemeral: true })
        }

        await member.roles.add(role, `${reason} | بواسطة: ${interaction.user.username}`)

        const embed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle("➕ تم إعطاء الرتبة")
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
          .addFields(
            { name: "👤 العضو", value: `${targetUser} (\`${targetUser.username}\`)`, inline: true },
            { name: "🏷️ الرتبة", value: `${role}`, inline: true },
            { name: "🎨 لون الرتبة", value: role.hexColor, inline: true },
            { name: "📝 السبب", value: reason, inline: false },
            { name: "👮 بواسطة", value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true }
          )
          .setFooter({ text: `ID العضو: ${targetUser.id} | ID الرتبة: ${role.id}` })
          .setTimestamp()

        return interaction.reply({ embeds: [embed] })
      }

      // ✅ سحب الرتبة
      if (action === "remove") {
        if (!hasRole) {
          return interaction.reply({ content: `⚠️ ${targetUser} ما عنده رتبة ${role} أصلاً.`, ephemeral: true })
        }

        await member.roles.remove(role, `${reason} | بواسطة: ${interaction.user.username}`)

        const embed = new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle("➖ تم سحب الرتبة")
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
          .addFields(
            { name: "👤 العضو", value: `${targetUser} (\`${targetUser.username}\`)`, inline: true },
            { name: "🏷️ الرتبة", value: `${role}`, inline: true },
            { name: "🎨 لون الرتبة", value: role.hexColor, inline: true },
            { name: "📝 السبب", value: reason, inline: false },
            { name: "👮 بواسطة", value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true }
          )
          .setFooter({ text: `ID العضو: ${targetUser.id} | ID الرتبة: ${role.id}` })
          .setTimestamp()

        return interaction.reply({ embeds: [embed] })
      }

    } catch (err) {
      console.error("[ROLE ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء تعديل الرتبة.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء تعديل الرتبة.", ephemeral: true })
    }
  },
}