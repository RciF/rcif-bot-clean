import { apiClient } from './client';

/**
 * Auth API — متطابق مع dashboard-backend/server.js الحالي
 *
 * ⚠️ ملاحظة: الـ Backend الحالي يستخدم:
 *   - GET /api/auth/callback?code=XXX  (مو POST!)
 *   - يرجع {user, guilds, token}  (مو {user, token} فقط)
 */
export const authApi = {
  /**
   * تبادل code من Discord OAuth بـ session
   * @param {string} code - من Discord بعد الـ redirect
   */
  loginWithDiscord: (code) =>
    apiClient.get(`/api/auth/callback?code=${encodeURIComponent(code)}`),

  /**
   * جلب معلومات المستخدم الحالي
   * (الـ backend الحالي ما عنده هذا endpoint - نستخدم ما هو محفوظ في localStorage)
   */
  getMe: async () => {
    const userStr = localStorage.getItem('lyn-user');
    const guildsStr = localStorage.getItem('lyn-guilds');
    if (!userStr) throw new Error('No user in localStorage');
    return {
      user: JSON.parse(userStr),
      guilds: guildsStr ? JSON.parse(guildsStr) : [],
    };
  },

  /**
   * تسجيل الخروج (ما فيه endpoint رسمي في الباك اند، نمسح localStorage)
   */
  logout: async () => {
    localStorage.removeItem('lyn-auth-token');
    localStorage.removeItem('lyn-user');
    localStorage.removeItem('lyn-guilds');
    return { success: true };
  },

  /**
   * جلب اشتراك المستخدم
   */
  getSubscription: (userId) =>
    apiClient.get(`/api/subscription/${userId}`),
};
