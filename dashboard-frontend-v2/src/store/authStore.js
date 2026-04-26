import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/api/auth';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (code) => {
        set({ isLoading: true, error: null });
        try {
          const data = await authApi.loginWithDiscord(code);
          localStorage.setItem('lyn-auth-token', data.token);
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true };
        } catch (err) {
          set({
            error: err.message || 'فشل تسجيل الدخول',
            isLoading: false,
          });
          return { success: false, error: err.message };
        }
      },

      fetchMe: async () => {
        const token = localStorage.getItem('lyn-auth-token');
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }
        set({ isLoading: true });
        try {
          const data = await authApi.getMe();
          set({
            user: data.user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          localStorage.removeItem('lyn-auth-token');
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Ignore errors on logout
        }
        localStorage.removeItem('lyn-auth-token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // Mock login for development (until OAuth is wired)
      mockLogin: () => {
        const mockUser = {
          id: '529320108032786433',
          username: 'Saud',
          discriminator: '0001',
          avatar: null,
          email: 'saud@lyn.bot',
          isOwner: true,
        };
        const mockToken = 'mock-token-dev';
        localStorage.setItem('lyn-auth-token', mockToken);
        set({
          user: mockUser,
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
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
