// ══════════════════════════════════════════════════════════════════
//  /حماية حالة — عرض إعدادات الحماية الحالية
//  المسار: commands/protection/status.js
// ══════════════════════════════════════════════════════════════════

const { EmbedBuilder } = require("discord.js")
const protectionSystem = require("../../systems/protectionSystem")
const { COLORS, actionLabel } = require("./_shared")

module.exports = async function handleStatus(interaction, guildId) {
  await interaction.deferReply()

  const s = await protectionSystem.getSettings(guildId)

  if (!s) {
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.neutral)
          .setTitle("🛡️ نظام الحماية")
          .setDescription("لم يتم إعداد نظام الحماية بعد.\nاستخدم الأوامر الفرعية للبدء.")
          .setTimestamp()
      ]
    })
  }

  const logChannel = s.log_channel_id ? `<#${s.log_channel_id}>` : "❌ غير محدد"
  const wlUsers   = (s.whitelist_users || []).map(id => `<@${id}>`)
  const wlRoles   = (s.whitelist_roles || []).map(id => `<@&${id}>`)
  const whitelist = [...wlUsers, ...wlRoles]
  const inLockdown = protectionSystem.isInLockdown(guildId)

  const embed = new EmbedBuilder()
    .setColor(inLockdown ? COLORS.danger : COLORS.purple)
    .setTitle(`🛡️ إعدادات نظام الحماية${inLockdown ? " — ⚠️ LOCKDOWN نشط!" : ""}`)
    .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }))
    .addFields(
      {
        name: "🔴 Anti-Spam",
        value: [
          `الحالة: ${s.antispam_enabled ? "🟢 مفعّل" : "🔴 معطّل"}`,
          `الحد: **${s.antispam_max_messages || 5}** رسائل / **${(s.antispam_interval_ms || 3000) / 1000}** ثانية`,
          `العقوبة: **${actionLabel(s.antispam_action || "mute")}**`,
          s.antispam_action !== "mute"
            ? ""
            : `مدة الكتم: **${(s.antispam_mute_duration || 300000) / 60000}** دقيقة`
        ].filter(Boolean).join("\n"),
        inline: true
      },
      {
        name: "🌊 Anti-Raid",
        value: [
          `الحالة: ${s.antiraid_enabled ? "🟢 مفعّل" : "🔴 معطّل"}`,
          `الحد: **${s.antiraid_join_threshold || 10}** عضو / **${(s.antiraid_join_interval_ms || 10000) / 1000}** ثانية`,
          `العقوبة: **${actionLabel(s.antiraid_action || "lockdown")}**`
        ].join("\n"),
        inline: true
      },
      { name: "\u200b", value: "\u200b", inline: true },
      {
        name: "💣 Anti-Nuke",
        value: [
          `الحالة: ${s.antinuke_enabled ? "🟢 مفعّل" : "🔴 معطّل"}`,
          `حد القنوات: **${s.antinuke_channel_delete_threshold || 3}** | الرتب: **${s.antinuke_role_delete_threshold || 3}** | الحظر: **${s.antinuke_ban_threshold || 3}**`,
          `الفترة: **${(s.antinuke_interval_ms || 10000) / 1000}** ثانية`,
          `العقوبة: **${actionLabel(s.antinuke_action || "ban")}**`
        ].join("\n"),
        inline: true
      },
      {
        name: "📋 قناة اللوق",
        value: logChannel,
        inline: true
      },
      {
        name: `🔐 القائمة البيضاء (${whitelist.length})`,
        value: whitelist.length > 0
          ? whitelist.slice(0, 5).join(", ") + (whitelist.length > 5 ? `\n... و ${whitelist.length - 5} آخرين` : "")
          : "لا يوجد",
        inline: true
      }
    )
    .setFooter({ text: `${interaction.guild.name} • نظام الحماية` })
    .setTimestamp()

  return interaction.editReply({ embeds: [embed] })
}