import { create } from "zustand"
import { persist } from "zustand/middleware"
import { authApi } from "@/api"
import { isOwner } from "@/config/env"

/**
 * Auth Store — متصل بـ API الحقيقي
 *
 * Backend response format:
 *   { success, token, user: {id, username, avatar, isOwner}, guilds: [...] }
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

      // ── Login ──
      login: async (code) => {
        set({ isLoading: true, error: null })
        try {
          const data = await authApi.loginWithDiscord(code)

          if (!data?.token || !data?.user) {
            throw new Error("استجابة غير صالحة من الخادم")
          }

          // الباك اند يرجع isOwner، لكن نتأكد منها محلياً
          const userWithFlags = {
            ...data.user,
            isOwner: data.user.isOwner ?? isOwner(data.user.id),
          }

          // حفظ في localStorage
          localStorage.setItem("lyn-auth-token", data.token)
          localStorage.setItem("lyn-user", JSON.stringify(userWithFlags))
          localStorage.setItem("lyn-guilds", JSON.stringify(data.guilds || []))

          set({
            user: userWithFlags,
            guilds: data.guilds || [],
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
          })

          return { success: true }
        } catch (err) {
          const errorMsg = err.message || "فشل تسجيل الدخول"
          set({ error: errorMsg, isLoading: false })
          return { success: false, error: errorMsg }
        }
      },

      // ── Fetch Me (للتحقق من صحة الـ token) ──
      fetchMe: async () => {
        const token = localStorage.getItem("lyn-auth-token")
        if (!token) {
          set({ isAuthenticated: false, user: null, guilds: [] })
          return
        }

        try {
          const data = await authApi.getMe()
          const userWithFlags = {
            ...data.user,
            isOwner: data.user.isOwner ?? isOwner(data.user.id),
          }

          // تحديث localStorage بأحدث البيانات
          localStorage.setItem("lyn-user", JSON.stringify(userWithFlags))
          localStorage.setItem("lyn-guilds", JSON.stringify(data.guilds || []))

          set({
            user: userWithFlags,
            guilds: data.guilds || [],
            token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (err) {
          // الـ token غير صالح → امسح كل شي
          console.warn("[AUTH] fetchMe failed:", err.message)
          localStorage.removeItem("lyn-auth-token")
          localStorage.removeItem("lyn-user")
          localStorage.removeItem("lyn-guilds")
          set({
            user: null,
            guilds: [],
            token: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },

      // ── Logout ──
      logout: async () => {
        try {
          await authApi.logout()
        } catch {
          // تجاهل
        }
        localStorage.removeItem("lyn-auth-token")
        localStorage.removeItem("lyn-user")
        localStorage.removeItem("lyn-guilds")
        set({
          user: null,
          guilds: [],
          token: null,
          isAuthenticated: false,
          error: null,
        })
      },

      // ── Mock login (للتطوير) ──
      mockLogin: () => {
        const mockUser = {
          id: "529320108032786433",
          username: "Saud (DEV)",
          avatar: null,
          isOwner: true,
        }
        const mockGuilds = [
          {
            id: "mock-guild-1",
            name: "سيرفر التطوير",
            icon: null,
            permissions: "8",
          },
        ]
        const mockToken = "mock-token-dev"

        localStorage.setItem("lyn-auth-token", mockToken)
        localStorage.setItem("lyn-user", JSON.stringify(mockUser))
        localStorage.setItem("lyn-guilds", JSON.stringify(mockGuilds))

        set({
          user: mockUser,
          guilds: mockGuilds,
          token: mockToken,
          isAuthenticated: true,
        })
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "lyn-auth-storage",
      partialize: (state) => ({
        user: state.user,
        guilds: state.guilds,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
