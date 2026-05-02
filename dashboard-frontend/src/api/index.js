/**
 * ═══════════════════════════════════════════════════════════
 *  API Index — يصدر كل الـ API helpers
 *  استخدم: import { authApi, guildApi, settingsApi } from '@/api'
 * ═══════════════════════════════════════════════════════════
 */

import { apiClient } from "./client"
import { env } from "@/config/env"

// ════════════════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════════════════

export const authApi = {
  loginWithDiscord: (code) => {
    const params = new URLSearchParams({
      code,
      redirect_uri: env.DISCORD_REDIRECT_URI,
    })
    return apiClient.get(`/api/auth/callback?${params}`)
  },
  getMe: () => apiClient.get("/api/auth/me"),
  logout: () => apiClient.post("/api/auth/logout"),
  refresh: () => apiClient.post("/api/auth/refresh"),
}

// ════════════════════════════════════════════════════════════
//  GUILD RESOURCES
// ════════════════════════════════════════════════════════════

export const guildApi = {
  info: (guildId) => apiClient.get(`/api/guild/${guildId}/info`),
  channels: (guildId) => apiClient.get(`/api/guild/${guildId}/channels`),
  roles: (guildId) => apiClient.get(`/api/guild/${guildId}/roles`),
  members: (guildId, opts = {}) => {
    const p = new URLSearchParams()
    if (opts.limit) p.set("limit", opts.limit)
    if (opts.after) p.set("after", opts.after)
    if (opts.search) p.set("search", opts.search)
    return apiClient.get(`/api/guild/${guildId}/members?${p}`)
  },
  emojis: (guildId) => apiClient.get(`/api/guild/${guildId}/emojis`),
  plan: (guildId) => apiClient.get(`/api/guild/${guildId}/plan`),
  overview: (guildId) => apiClient.get(`/api/guild/${guildId}/overview`),
}

// ════════════════════════════════════════════════════════════
//  SETTINGS — generic helpers
// ════════════════════════════════════════════════════════════

export const settingsApi = {
  // Welcome
  getWelcome: (g) => apiClient.get(`/api/guild/${g}/welcome`),
  saveWelcome: (g, data) => apiClient.put(`/api/guild/${g}/welcome`, data),
  testWelcome: (g) => apiClient.post(`/api/guild/${g}/welcome/test`),

  // Protection
  getProtection: (g) => apiClient.get(`/api/guild/${g}/protection`),
  saveProtection: (g, data) => apiClient.put(`/api/guild/${g}/protection`, data),
  lockdown: (g) => apiClient.post(`/api/guild/${g}/protection/lockdown`),
  unlock: (g) => apiClient.delete(`/api/guild/${g}/protection/lockdown`),

  // Logs
  getLogs: (g) => apiClient.get(`/api/guild/${g}/logs`),
  saveLogs: (g, data) => apiClient.put(`/api/guild/${g}/logs`, data),

  // AI
  getAi: (g) => apiClient.get(`/api/guild/${g}/ai`),
  saveAi: (g, data) => apiClient.put(`/api/guild/${g}/ai`, data),
  getAiUsage: (g) => apiClient.get(`/api/guild/${g}/ai/usage`),

  // XP
  getXp: (g) => apiClient.get(`/api/guild/${g}/xp`),
  saveXp: (g, data) => apiClient.put(`/api/guild/${g}/xp`, data),
  getXpLeaderboard: (g) => apiClient.get(`/api/guild/${g}/xp/leaderboard`),
  resetXpUser: (g, uid) => apiClient.delete(`/api/guild/${g}/xp/reset/${uid}`),

  // Economy
  getEconomy: (g) => apiClient.get(`/api/guild/${g}/economy`),
  saveEconomy: (g, data) => apiClient.put(`/api/guild/${g}/economy`, data),
  getShop: (g) => apiClient.get(`/api/guild/${g}/economy/shop`),
  saveShop: (g, items) => apiClient.put(`/api/guild/${g}/economy/shop`, { items }),
  giveCoins: (g, userId, amount) =>
    apiClient.post(`/api/guild/${g}/economy/give`, { userId, amount }),

  // Tickets
  getTickets: (g) => apiClient.get(`/api/guild/${g}/tickets`),
  saveTickets: (g, data) => apiClient.put(`/api/guild/${g}/tickets`, data),
  deployPanel: (g) => apiClient.post(`/api/guild/${g}/tickets/panel/deploy`),
  getActiveTickets: (g) => apiClient.get(`/api/guild/${g}/tickets/active`),

  // Reaction Roles
  getRolePanels: (g) => apiClient.get(`/api/guild/${g}/role-panels`),
  createRolePanel: (g, data) => apiClient.post(`/api/guild/${g}/role-panels`, data),
  updateRolePanel: (g, id, data) => apiClient.put(`/api/guild/${g}/role-panels/${id}`, data),
  deleteRolePanel: (g, id) => apiClient.delete(`/api/guild/${g}/role-panels/${id}`),

  // Moderation
  getWarnings: (g) => apiClient.get(`/api/guild/${g}/moderation/warnings`),
  deleteWarnings: (g, uid) => apiClient.delete(`/api/guild/${g}/moderation/warnings/${uid}`),
  getBans: (g) => apiClient.get(`/api/guild/${g}/moderation/bans`),
  unban: (g, uid) => apiClient.delete(`/api/guild/${g}/moderation/bans/${uid}`),
  getMutes: (g) => apiClient.get(`/api/guild/${g}/moderation/mutes`),

  // Events
  getEvents: (g) => apiClient.get(`/api/guild/${g}/events`),
  createEvent: (g, data) => apiClient.post(`/api/guild/${g}/events`, data),
  updateEvent: (g, id, data) => apiClient.put(`/api/guild/${g}/events/${id}`, data),
  deleteEvent: (g, id) => apiClient.delete(`/api/guild/${g}/events/${id}`),

  // Scheduler
  getScheduler: (g) => apiClient.get(`/api/guild/${g}/scheduler`),
  createTask: (g, data) => apiClient.post(`/api/guild/${g}/scheduler`, data),
  updateTask: (g, id, data) => apiClient.put(`/api/guild/${g}/scheduler/${id}`, data),
  deleteTask: (g, id) => apiClient.delete(`/api/guild/${g}/scheduler/${id}`),

  // Embed Builder
  sendEmbed: (g, data) => apiClient.post(`/api/guild/${g}/embeds/send`, data),
  getEmbedTemplates: (g) => apiClient.get(`/api/guild/${g}/embeds/templates`),
  saveEmbedTemplate: (g, data) => apiClient.post(`/api/guild/${g}/embeds/templates`, data),
  deleteEmbedTemplate: (g, id) => apiClient.delete(`/api/guild/${g}/embeds/templates/${id}`),

  // Audit Log
  getAuditLog: (g, opts = {}) => {
    const p = new URLSearchParams()
    if (opts.limit) p.set("limit", opts.limit)
    if (opts.offset) p.set("offset", opts.offset)
    if (opts.action) p.set("action", opts.action)
    if (opts.userId) p.set("userId", opts.userId)
    return apiClient.get(`/api/guild/${g}/audit?${p}`)
  },
}

// ════════════════════════════════════════════════════════════
//  COMMANDS & PREFIX
// ════════════════════════════════════════════════════════════

export const commandsApi = {
  list: (g) => apiClient.get(`/api/guild/${g}/commands`),
  update: (g, name, data) => apiClient.patch(`/api/guild/${g}/commands/${name}`, data),
  reset: (g) => apiClient.delete(`/api/guild/${g}/commands/reset`),
  getPrefix: (g) => apiClient.get(`/api/guild/${g}/prefix`),
  setPrefix: (g, prefix) => apiClient.post(`/api/guild/${g}/prefix`, { prefix }),
}

// ════════════════════════════════════════════════════════════
//  SUBSCRIPTION
// ════════════════════════════════════════════════════════════

export const subscriptionApi = {
  get: (userId) => apiClient.get(`/api/subscription/${userId}`),
  requestPayment: (data) => apiClient.post(`/api/payment-requests`, data),
  linkGuild: (guildId) => apiClient.post(`/api/guild/${guildId}/link`),
  unlinkGuild: (guildId) => apiClient.delete(`/api/guild/${guildId}/link`),
}

// ════════════════════════════════════════════════════════════
//  ADMIN (Owner only)
// ════════════════════════════════════════════════════════════

export const adminApi = {
  getPaymentRequests: (status = "pending") =>
    apiClient.get(`/api/admin/payment-requests?status=${status}`),
  approvePayment: (id, months = 1) =>
    apiClient.post(`/api/admin/payment-requests/${id}/approve`, { months }),
  rejectPayment: (id, notes) =>
    apiClient.post(`/api/admin/payment-requests/${id}/reject`, { notes }),
}
