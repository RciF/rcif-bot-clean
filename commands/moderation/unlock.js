const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("فتح")
    .setDescription("فتح قناة مقفلة والسماح للأعضاء بالكتابة")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(option =>
      option
        .setName("القناة")
        .setDescription("القناة المراد فتحها (الحالية إذا ما حددت)")
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum)
    )
    .addStringOption(option =>
      option
        .setName("السبب")
        .setDescription("سبب فتح القناة (اختياري)")
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      // ✅ Check: inside a guild only
      if (!interaction.guild) {
        return interaction.reply({ content: "❌ هذا الأمر يُستخدم داخل السيرفر فقط.", ephemeral: true })
      }

      const targetChannel = interaction.options.getChannel("القناة") || interaction.channel
      const reason        = interaction.options.getString("السبب") || "لم يتم تحديد سبب"

      // ✅ Check: bot has ManageChannels permission
      const botPermissions = targetChannel.permissionsFor(interaction.guild.members.me)
      if (!botPermissions || !botPermissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: "❌ البوت ما عنده صلاحية **إدارة القنوات** في هذي القناة.", ephemeral: true })
      }

      // ✅ Get current @everyone permissions
      const everyoneRole  = interaction.guild.roles.everyone
      const currentPerms  = targetChannel.permissionOverwrites.cache.get(everyoneRole.id)
      const isLocked      = currentPerms?.deny?.has(PermissionFlagsBits.SendMessages)

      // ✅ Check: channel is already unlocked
      if (!isLocked) {
        return interaction.reply({ content: "⚠️ هذي القناة مفتوحة أصلاً وليست مقفلة.", ephemeral: true })
      }

      // ✅ Execute unlock
      await targetChannel.permissionOverwrites.edit(everyoneRole, {
        SendMessages:         null,
        AddReactions:         null,
        CreatePublicThreads:  null,
        CreatePrivateThreads: null
      }, { reason: `${reason} | بواسطة: ${interaction.user.username}` })

      // ✅ Success embed
      const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle("🔓 تم فتح القناة")
        .addFields(
          { name: "📍 القناة", value: `${targetChannel}`,                                             inline: true  },
          { name: "📝 السبب", value: reason,                                                           inline: true  },
          { name: "👮 بواسطة", value: `${interaction.user} (\`${interaction.user.username}\`)`,       inline: false }
        )
        .setFooter({ text: "استخدم /قفل لقفل القناة مرة ثانية" })
        .setTimestamp()

      await interaction.reply({ embeds: [embed] })

      // ✅ Send notification in the unlocked channel (if different)
      if (targetChannel.id !== interaction.channel.id) {
        try {
          await targetChannel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x22c55e)
                .setDescription(`🔓 **تم فتح القناة** بواسطة ${interaction.user}\n📝 السبب: ${reason}`)
            ]
          })
        } catch {
          // Cannot send — ignore
        }
      }

    } catch (err) {
      console.error("[UNLOCK ERROR]", err)

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: "❌ حدث خطأ أثناء فتح القناة.", ephemeral: true })
      }
      return interaction.reply({ content: "❌ حدث خطأ أثناء فتح القناة.", ephemeral: true })
    }
  },
}