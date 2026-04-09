const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("رتبة")
    .setDescription("إعطاء أو سحب رتبة من عضو أو مجموعة أعضاء")
    .setNameLocalizations({ "en-US": "role", "en-GB": "role" })
    .setDescriptionLocalizations({
      "en-US": "Add or remove a role from a member or group of members",
      "en-GB": "Add or remove a role from a member or group of members"
    })
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
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
        .setName("الهدف")
        .setDescription("لمين تبي تعدل الرتبة؟")
        .setNameLocalizations({ "en-US": "target", "en-GB": "target" })
        .setDescriptionLocalizations({ "en-US": "Who to modify the role for?", "en-GB": "Who to modify the role for?" })
        .setRequired(true)
        .addChoices(
          { name: "👤 عضو محدد", value: "single" },
          { name: "👥 كل الأعضاء (البشر)", value: "all_humans" },
          { name: "🤖 كل البوتات", value: "all_bots" },
          { name: "🌐 الكل (بشر + بوتات)", value: "everyone" }
        )
    )
    .addUserOption(option =>
      option
        .setName("العضو")
        .setDescription("العضو المحدد (مطلوب فقط إذا اخترت عضو محدد)")
        .setNameLocalizations({ "en-US": "member", "en-GB": "member" })
        .setDescriptionLocalizations({ "en-US": "Specific member (required only if you chose single member)", "en-GB": "Specific member (required only if you chose single member)" })
        .setRequired(false)
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

      const role = interaction.options.getRole("الرتبة")
      const action = interaction.options.getString("الإجراء")
      const target = interaction.options.getString("الهدف")
      const targetUser = interaction.options.getUser("العضو")
      const reason = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

      const isAdding = action === "add"
      const actionText = isAdding ? "إعطاء" : "سحب"

      // ✅ تحقق: لا تعدل رتبة @everyone
      if (role.id === interaction.guild.id) {
        return interaction.reply({ content: "❌ ما تقدر تعدل رتبة @everyone.", ephemeral: true })
      }

      // ✅ تحقق: الرتبة مو managed
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
        return interaction.reply({ content: "❌ ما تقدر تعدل رتبة أعلى منك أو تساويك.", ephemeral: true })
      }

      // ========================================
      // 👤 عضو واحد
      // ========================================
      if (target === "single") {
        if (!targetUser) {
          return interaction.reply({ content: "❌ لازم تحدد العضو لما تختار **عضو محدد**.", ephemeral: true })
        }

        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)
        if (!member) {
          return interaction.reply({ content: "❌ ما قدرت ألقى هذا العضو.", ephemeral: true })
        }

        const hasRole = member.roles.cache.has(role.id)

        if (isAdding && hasRole) {
          return interaction.reply({ content: `⚠️ ${targetUser} عنده رتبة ${role} بالفعل.`, ephemeral: true })
        }
        if (!isAdding && !hasRole) {
          return interaction.reply({ content: `⚠️ ${targetUser} ما عنده رتبة ${role} أصلاً.`, ephemeral: true })
        }

        if (isAdding) {
          await member.roles.add(role, `${reason} | بواسطة: ${interaction.user.username}`)
        } else {
          await member.roles.remove(role, `${reason} | بواسطة: ${interaction.user.username}`)
        }

        const embed = new EmbedBuilder()
          .setColor(isAdding ? 0x22c55e : 0xef4444)
          .setTitle(isAdding ? "➕ تم إعطاء الرتبة" : "➖ تم سحب الرتبة")
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

      // ========================================
      // 👥 عملية جماعية
      // ========================================
      await interaction.deferReply()

      // ✅ جلب كل الأعضاء
      await interaction.guild.members.fetch()

      let targetMembers

      if (target === "all_humans") {
        targetMembers = interaction.guild.members.cache.filter(m => !m.user.bot)
      } else if (target === "all_bots") {
        targetMembers = interaction.guild.members.cache.filter(m => m.user.bot)
      } else {
        // everyone
        targetMembers = interaction.guild.members.cache
      }

      // ✅ فلتر: بس اللي يحتاجون تعديل
      if (isAdding) {
        targetMembers = targetMembers.filter(m => !m.roles.cache.has(role.id))
      } else {
        targetMembers = targetMembers.filter(m => m.roles.cache.has(role.id))
      }

      const totalMembers = targetMembers.size

      if (totalMembers === 0) {
        const msg = isAdding
          ? `⚠️ كل الأعضاء المستهدفين عندهم رتبة ${role} بالفعل.`
          : `⚠️ ما فيه أحد من المستهدفين عنده رتبة ${role} أصلاً.`
        return interaction.editReply({ content: msg })
      }

      // ✅ إرسال رسالة تقدم
      const targetLabels = {
        all_humans: "كل الأعضاء (البشر)",
        all_bots: "كل البوتات",
        everyone: "الكل (بشر + بوتات)"
      }

      const progressEmbed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle(`⏳ جاري ${actionText} الرتبة...`)
        .setDescription(`🎯 الهدف: **${targetLabels[target]}**\n🏷️ الرتبة: ${role}\n👥 العدد: **${totalMembers}** عضو\n\n⏳ هذي العملية ممكن تاخذ وقت...`)
        .setTimestamp()

      await interaction.editReply({ embeds: [progressEmbed] })

      // ✅ تنفيذ العملية مع تأخير عشان ما نتجاوز Rate Limit
      let success = 0
      let failed = 0
      const members = [...targetMembers.values()]

      for (const member of members) {
        try {
          if (isAdding) {
            await member.roles.add(role, `${reason} | جماعي بواسطة: ${interaction.user.username}`)
          } else {
            await member.roles.remove(role, `${reason} | جماعي بواسطة: ${interaction.user.username}`)
          }
          success++
        } catch {
          failed++
        }

        // تأخير 300ms بين كل عضو عشان ما نتجاوز الحد
        if (success % 5 === 0) {
          await new Promise(r => setTimeout(r, 300))
        }
      }

      // ✅ Embed النتيجة النهائية
      const resultEmbed = new EmbedBuilder()
        .setColor(isAdding ? 0x22c55e : 0xef4444)
        .setTitle(isAdding ? "➕ تم إعطاء الرتبة (جماعي)" : "➖ تم سحب الرتبة (جماعي)")
        .addFields(
          { name: "🏷️ الرتبة", value: `${role}`, inline: true },
          { name: "🎯 الهدف", value: targetLabels[target], inline: true },
          { name: "🎨 لون الرتبة", value: role.hexColor, inline: true },
          { name: "✅ نجح", value: `**${success}** عضو`, inline: true },
          { name: "❌ فشل", value: `**${failed}** عضو`, inline: true },
          { name: "📊 الإجمالي", value: `**${totalMembers}** عضو`, inline: true },
          { name: "📝 السبب", value: reason, inline: false },
          { name: "👮 بواسطة", value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true }
        )
        .setFooter({ text: `ID الرتبة: ${role.id}` })
        .setTimestamp()

      // ✅ تحذير لو فيه فشل
      if (failed > 0) {
        resultEmbed.addFields({
          name: "⚠️ ملاحظة",
          value: `بعض الأعضاء ما قدر البوت يعدل رتبهم (رتبتهم أعلى من البوت أو صلاحيات ناقصة).`,
          inline: false
        })
      }

      return interaction.editReply({ embeds: [resultEmbed] })

    } catch (err) {
      console.error("[ROLE ERROR]", err)

      if (interaction.deferred) {
        return interaction.editReply({ content: "❌ حدث خطأ أثناء تعديل الرتبة." })
      }
      if (interaction.replied) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء تعديل الرتبة.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء تعديل الرتبة.", ephemeral: true })
    }
  },
}