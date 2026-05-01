import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/api/auth';
import { env, isOwner } from '@/config/env';

/**
 * Auth Store — متطابق مع response الـ backend الفعلي
 *
 * Backend response:
 *   { token: "...", user: {id, username, avatar}, guilds: [...] }
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      // ── State ──
      user: null,
      guilds: [],
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // ── Actions ──

      /**
       * تسجيل الدخول بـ Discord OAuth
       * @param {string} code - من Discord بعد الـ redirect
       */
      login: async (code) => {
        set({ isLoading: true, error: null });
        try {
          const data = await authApi.loginWithDiscord(code);

          // تحقق من response
          if (!data?.token || !data?.user) {
            throw new Error('استجابة غير صالحة من الخادم');
          }

          // تحديد إذا كان owner
          const userWithFlags = {
            ...data.user,
            isOwner: isOwner(data.user.id),
          };

          // حفظ في localStorage
          localStorage.setItem('lyn-auth-token', data.token);
          localStorage.setItem('lyn-user', JSON.stringify(userWithFlags));
          localStorage.setItem('lyn-guilds', JSON.stringify(data.guilds || []));

          set({
            user: userWithFlags,
            guilds: data.guilds || [],
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true };
        } catch (err) {
          const errorMsg =
            err.response?.data?.error ||
            err.message ||
            'فشل تسجيل الدخول';
          set({
            error: errorMsg,
            isLoading: false,
          });
          return { success: false, error: errorMsg };
        }
      },

      /**
       * جلب بيانات المستخدم من localStorage (مو من API)
       * لأن الـ backend الحالي ما عنده /api/auth/me
       */
      fetchMe: async () => {
        const token = localStorage.getItem('lyn-auth-token');
        const userStr = localStorage.getItem('lyn-user');
        const guildsStr = localStorage.getItem('lyn-guilds');

        if (!token || !userStr) {
          set({ isAuthenticated: false, user: null, guilds: [] });
          return;
        }

        try {
          const user = JSON.parse(userStr);
          const guilds = guildsStr ? JSON.parse(guildsStr) : [];

          set({
            user: { ...user, isOwner: isOwner(user.id) },
            guilds,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          // مسح كل شي لو الـ JSON فاسد
          localStorage.removeItem('lyn-auth-token');
          localStorage.removeItem('lyn-user');
          localStorage.removeItem('lyn-guilds');
          set({
            user: null,
            guilds: [],
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      /**
       * تسجيل الخروج
       */
      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // تجاهل الأخطاء
        }
        localStorage.removeItem('lyn-auth-token');
        localStorage.removeItem('lyn-user');
        localStorage.removeItem('lyn-guilds');
        set({
          user: null,
          guilds: [],
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      /**
       * Mock login للتطوير
       */
      mockLogin: () => {
        const mockUser = {
          id: env.OWNER_ID || '529320108032786433',
          username: 'Saud',
          avatar: null,
          isOwner: true,
        };
        const mockGuilds = [
          {
            id: 'mock-guild-1',
            name: 'سيرفر التطوير',
            icon: null,
            permissions: '8',
          },
        ];
        const mockToken = 'mock-token-dev';

        localStorage.setItem('lyn-auth-token', mockToken);
        localStorage.setItem('lyn-user', JSON.stringify(mockUser));
        localStorage.setItem('lyn-guilds', JSON.stringify(mockGuilds));

        set({
          user: mockUser,
          guilds: mockGuilds,
          token: mockToken,
          isAuthenticated: true,
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'lyn-auth-storage',
      partialize: (state) => ({
        user: state.user,
        guilds: state.guilds,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
