/**
 * ═══════════════════════════════════════════════════════════
 *  Commands API Helpers
 *
 *  استخدام:
 *    import { commandsApi } from '@/api/commands'
 *    const data = await commandsApi.list(guildId)
 *
 *  ⚠️ ملاحظة: هذا الملف يصدر commandsApi المُوسَّع (الباتش 1).
 *  ما زال commandsApi القديم في api/index.js موجود للتوافق
 *  حتى ننتقل للصفحة الجديدة في الباتش 3.
 * ═══════════════════════════════════════════════════════════
 */

import { apiClient } from "./client"

export const commandsApi = {
  // ════════════════════════════════════════════════════════════
  //  Listing (legacy — الصفحة القديمة)
  // ════════════════════════════════════════════════════════════

  /**
   * جلب كل الأوامر مع كل إعداداتها للسيرفر
   *
   * Returns:
   * {
   *   guild_plan: { plan_id, ... },
   *   commands: [
   *     {
   *       name, category, description,
   *       custom_name, enabled,
   *       aliases: [...],
   *       restrictions: { enabled_roles, ... },
   *       defaults: { default_duration, ... },
   *       usage_count, last_used_at
   *     }
   *   ],
   *   categories: { ... },
   *   custom_settings: { ... }  // legacy
   * }
   */
  list: (guildId) => apiClient.get(`/api/guild/${guildId}/commands`),

  /**
   * تحديث legacy (custom_name + enabled)
   * ⚠️ موجود في الـ route القديم — نستخدمه حتى الباتش 3
   */
  update: (guildId, name, data) =>
    apiClient.patch(`/api/guild/${guildId}/commands/${name}`, data),

  /**
   * إعادة كل الأوامر للافتراضي (legacy)
   */
  reset: (guildId) => apiClient.delete(`/api/guild/${guildId}/commands/reset`),

  // ════════════════════════════════════════════════════════════
  //  Aliases (الباتش 1)
  // ════════════════════════════════════════════════════════════

  /**
   * جلب aliases أمر معين
   */
  listAliases: (guildId, commandName) =>
    apiClient.get(
      `/api/guild/${guildId}/commands/${encodeURIComponent(commandName)}/aliases`,
    ),

  /**
   * إضافة alias جديد
   */
  addAlias: (guildId, commandName, alias) =>
    apiClient.post(
      `/api/guild/${guildId}/commands/${encodeURIComponent(commandName)}/aliases`,
      { alias },
    ),

  /**
   * حذف alias محدد
   */
  removeAlias: (guildId, commandName, alias) =>
    apiClient.delete(
      `/api/guild/${guildId}/commands/${encodeURIComponent(commandName)}/aliases/${encodeURIComponent(alias)}`,
    ),

  /**
   * استبدال كل الـ aliases بقائمة جديدة (bulk)
   */
  replaceAliases: (guildId, commandName, aliases) =>
    apiClient.put(
      `/api/guild/${guildId}/commands/${encodeURIComponent(commandName)}/aliases`,
      { aliases },
    ),

  // ════════════════════════════════════════════════════════════
  //  Restrictions (الباتش 6)
  // ════════════════════════════════════════════════════════════

  getRestrictions: (guildId, commandName) =>
    apiClient.get(
      `/api/guild/${guildId}/commands/${encodeURIComponent(commandName)}/restrictions`,
    ),

  saveRestrictions: (guildId, commandName, restrictions) =>
    apiClient.put(
      `/api/guild/${guildId}/commands/${encodeURIComponent(commandName)}/restrictions`,
      restrictions,
    ),

  // ════════════════════════════════════════════════════════════
  //  Defaults (الباتش 7-8)
  // ════════════════════════════════════════════════════════════

  getDefaults: (guildId, commandName) =>
    apiClient.get(
      `/api/guild/${guildId}/commands/${encodeURIComponent(commandName)}/defaults`,
    ),

  saveDefaults: (guildId, commandName, defaults) =>
    apiClient.put(
      `/api/guild/${guildId}/commands/${encodeURIComponent(commandName)}/defaults`,
      defaults,
    ),

  // ════════════════════════════════════════════════════════════
  //  Leaderboard
  // ════════════════════════════════════════════════════════════

  /**
   * أكثر الأوامر استخداماً في السيرفر
   */
  leaderboard: (guildId, limit = 10) =>
    apiClient.get(
      `/api/guild/${guildId}/commands/leaderboard?limit=${limit}`,
    ),

  // ════════════════════════════════════════════════════════════
  //  Prefix (legacy)
  // ════════════════════════════════════════════════════════════

  getPrefix: (guildId) => apiClient.get(`/api/guild/${guildId}/prefix`),
  setPrefix: (guildId, prefix) =>
    apiClient.post(`/api/guild/${guildId}/prefix`, { prefix }),
}