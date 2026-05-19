/**
 * ═══════════════════════════════════════════════════════════
 *  Card Premium API Client
 *  المسار: dashboard-frontend/src/api/cardApi.js
 *
 *  كل الـ API calls الخاصة بنظام تخصيص البطاقة
 *
 *  ────────────────────────────────────────────────────────
 *   USER ENDPOINTS  → cardApi
 *  ────────────────────────────────────────────────────────
 *  cardApi.me()                          → اشتراكي + إعداداتي
 *  cardApi.getSettings()                 → إعدادات بطاقتي
 *  cardApi.saveSettings(data)            → حفظ إعدادات
 *  cardApi.resetSettings()               → إعادة تعيين
 *  cardApi.getTiers()                    → كل الفئات
 *  cardApi.getMyRequests()               → طلباتي
 *  cardApi.createRequest(data)           → إرسال طلب اشتراك
 *  cardApi.getMyLogs()                   → سجل أحداث اشتراكي
 *
 *  ────────────────────────────────────────────────────────
 *   ADMIN ENDPOINTS  → cardAdminApi (Owner only)
 *  ────────────────────────────────────────────────────────
 *  cardAdminApi.getStats()                                    → إحصائيات
 *  cardAdminApi.getRequests(filters)                          → كل الطلبات
 *  cardAdminApi.approveRequest(id, note)                      → قبول طلب
 *  cardAdminApi.rejectRequest(id, note)                       → رفض طلب
 *  cardAdminApi.getSubscriptions(filters)                     → كل المشتركين
 *  cardAdminApi.getSubscription(userId)                       → اشتراك مستخدم
 *  cardAdminApi.extendSubscription(userId, days, reason)      → تمديد يدوي
 *  cardAdminApi.cancelSubscription(userId, reason)            → إلغاء
 *  cardAdminApi.changeTier(userId, tier, reason)              → تغيير الفئة
 *  cardAdminApi.giftSubscription(userId, tier, days, reason)  → منح هدية
 *  cardAdminApi.getLogs(filters)                              → سجل الأحداث
 * ═══════════════════════════════════════════════════════════
 */

import { apiClient } from './client';

// ════════════════════════════════════════════════════════════
//  USER API
// ════════════════════════════════════════════════════════════

export const cardApi = {
  /**
   * جلب اشتراك المستخدم الحالي + إعدادات + بيانات الفئة
   */
  me: () => apiClient.get('/api/card/me'),

  /**
   * جلب إعدادات البطاقة فقط
   */
  getSettings: () => apiClient.get('/api/card/settings'),

  /**
   * حفظ إعدادات البطاقة
   *
   * @param {object} data - أي مزيج من:
   *   - background_id (string)
   *   - custom_background_url (string|null)
   *   - theme_id (string)
   *   - custom_colors (object: {accent, secondary, bg, bgCard, text})
   *   - badges (array of badge IDs)
   *   - effects (object: {glow: true, gradient: true, ...})
   *   - border_style (string)
   *   - avatar_url (string|null)
   */
  saveSettings: (data) => apiClient.put('/api/card/settings', data),

  /**
   * إعادة تعيين البطاقة للشكل الافتراضي
   */
  resetSettings: () => apiClient.post('/api/card/settings/reset'),

  /**
   * جلب كل الفئات (للعرض في صفحة الاشتراك)
   */
  getTiers: () => apiClient.get('/api/card/tiers'),

  /**
   * جلب طلباتي السابقة
   */
  getMyRequests: () => apiClient.get('/api/card/requests/me'),

  /**
   * إرسال طلب اشتراك جديد
   *
   * @param {object} data
   *   - tier: 'basic' | 'advanced' | 'legendary'
   *   - duration: 'monthly' | 'yearly'
   *   - ref_number: string (رقم العملية البنكية)
   *   - payment_proof_url?: string
   *   - user_notes?: string
   */
  createRequest: (data) => apiClient.post('/api/card/requests', data),

  /**
   * جلب سجل أحداث اشتراكي
   */
  getMyLogs: () => apiClient.get('/api/card/logs/me'),
};

// ════════════════════════════════════════════════════════════
//  ADMIN API (Owner only)
// ════════════════════════════════════════════════════════════

export const cardAdminApi = {
  /**
   * جلب إحصائيات الـ Dashboard للأدمن
   *
   * Returns:
   *   - requests: { pending, approved, rejected, total }
   *   - activeSubscriptions: { total, byTier: { basic, advanced, legendary } }
   *   - monthlyRevenue (number)
   *   - activeGifts (number)
   *   - expiringSoon (number)
   */
  getStats: () => apiClient.get('/api/card/admin/stats'),

  // ─── الطلبات ───

  /**
   * جلب كل الطلبات
   *
   * @param {object} filters
   *   - status?: 'pending' | 'approved' | 'rejected' (default: pending)
   *   - limit?: number (default: 50, max: 200)
   *   - offset?: number
   */
  getRequests: (filters = {}) => {
    const p = new URLSearchParams();
    if (filters.status) p.set('status', filters.status);
    if (filters.limit) p.set('limit', filters.limit);
    if (filters.offset) p.set('offset', filters.offset);
    return apiClient.get(`/api/card/admin/requests?${p}`);
  },

  /**
   * قبول طلب اشتراك
   */
  approveRequest: (id, adminNote = '') =>
    apiClient.post(`/api/card/admin/requests/${id}/approve`, {
      admin_note: adminNote,
    }),

  /**
   * رفض طلب اشتراك
   */
  rejectRequest: (id, adminNote = '') =>
    apiClient.post(`/api/card/admin/requests/${id}/reject`, {
      admin_note: adminNote,
    }),

  // ─── الاشتراكات ───

  /**
   * جلب كل المشتركين
   *
   * @param {object} filters
   *   - filter?: 'all' | 'active' | 'expired' | 'gifts' | 'expiring_soon'
   *   - tier?: 'basic' | 'advanced' | 'legendary'
   *   - limit?: number
   *   - offset?: number
   */
  getSubscriptions: (filters = {}) => {
    const p = new URLSearchParams();
    if (filters.filter) p.set('filter', filters.filter);
    if (filters.tier) p.set('tier', filters.tier);
    if (filters.limit) p.set('limit', filters.limit);
    if (filters.offset) p.set('offset', filters.offset);
    return apiClient.get(`/api/card/admin/subscriptions?${p}`);
  },

  /**
   * جلب اشتراك مستخدم محدد + آخر 10 أحداث
   */
  getSubscription: (userId) =>
    apiClient.get(`/api/card/admin/subscriptions/${userId}`),

  /**
   * تمديد يدوي للاشتراك
   *
   * @param {string} userId
   * @param {number} days - بين 1 و 730
   * @param {string} reason - السبب (يظهر للمستخدم في الـ DM)
   */
  extendSubscription: (userId, days, reason = '') =>
    apiClient.post(`/api/card/admin/subscriptions/${userId}/extend`, {
      days,
      reason,
    }),

  /**
   * إلغاء الاشتراك
   */
  cancelSubscription: (userId, reason = '') =>
    apiClient.post(`/api/card/admin/subscriptions/${userId}/cancel`, {
      reason,
    }),

  /**
   * تغيير فئة الاشتراك (ترقية / تخفيض)
   */
  changeTier: (userId, tier, reason = '') =>
    apiClient.post(`/api/card/admin/subscriptions/${userId}/change-tier`, {
      tier,
      reason,
    }),

  /**
   * منح اشتراك هدية (يدوي بالكامل بدون طلب)
   *
   * @param {string} userId
   * @param {string} tier - 'basic' | 'advanced' | 'legendary'
   * @param {number} days - عدد أيام الهدية
   * @param {string} reason - السبب (للسجل + DM)
   */
  giftSubscription: (userId, tier, days, reason = '') =>
    apiClient.post('/api/card/admin/gift', {
      user_id: userId,
      tier,
      days,
      reason,
    }),

  // ─── السجلات ───

  /**
   * جلب سجل الأحداث (filtered)
   *
   * @param {object} filters
   *   - action?: 'created' | 'extended' | 'gifted' | ...
   *   - user_id?: string
   *   - limit?: number
   *   - offset?: number
   */
  getLogs: (filters = {}) => {
    const p = new URLSearchParams();
    if (filters.action) p.set('action', filters.action);
    if (filters.user_id) p.set('user_id', filters.user_id);
    if (filters.limit) p.set('limit', filters.limit);
    if (filters.offset) p.set('offset', filters.offset);
    return apiClient.get(`/api/card/admin/logs?${p}`);
  },
};

// ════════════════════════════════════════════════════════════
//  DEFAULT EXPORT (للراحة)
// ════════════════════════════════════════════════════════════

export default {
  cardApi,
  cardAdminApi,
};