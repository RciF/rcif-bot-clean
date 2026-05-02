import { apiClient } from './client';
import { env } from '@/config/env';

/**
 * Auth API — متطابق مع dashboard-backend/server.js المحدّث
 *
 * ⚠️ مهم: نرسل redirect_uri مع الطلب لأن Discord يتطلب
 * إن الـ redirect_uri في تبادل الـ token = نفس الـ URI في طلب OAuth الأصلي
 */
export const authApi = {
  /**
   * تبادل code من Discord OAuth بـ session
   * @param {string} code - من Discord بعد الـ redirect
   */
  loginWithDiscord: (code) => {
    const params = new URLSearchParams({
      code,
      redirect_uri: env.DISCORD_REDIRECT_URI,
    });
    return apiClient.get(`/api/auth/callback?${params.toString()}`);
  },

  /**
   * جلب معلومات المستخدم الحالي من localStorage
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
   * تسجيل الخروج
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
