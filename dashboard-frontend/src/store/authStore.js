import { create } from "zustand"
import { persist } from "zustand/middleware"
import { authApi } from "@/api"
import { isOwner } from "@/config/env"

/**
 * Auth Store — متصل بـ API الحقيقي
 *
 * Backend response format:
 *   { success, token, user: {id, username, avatar, isOwner}, guilds: [...] }
 *
 * ⚠️ ملاحظة عن التخزين:
 *   - zustand/persist هو المصدر الوحيد للـ state بين الجلسات (lyn-auth-storage)
 *   - localStorage["lyn-auth-token"] مخزن منفصل لأن axios interceptor
 *     يقرأ منه مباشرة (بدون React) — هذا التخزين المنفصل ضروري
 *   - تم حذف lyn-user و lyn-guilds من localStorage المنفصل لأنهم
 *     يُحفظون في zustand/persist بالفعل (كانوا مكررين)
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

          const userWithFlags = {
            ...data.user,
            isOwner: data.user.isOwner ?? isOwner(data.user.id),
          }

          // ✅ token فقط في localStorage المنفصل (axios interceptor يقرأ منه)
          localStorage.setItem("lyn-auth-token", data.token)

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
        set({
          user: null,
          guilds: [],
          token: null,
          isAuthenticated: false,
          error: null,
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