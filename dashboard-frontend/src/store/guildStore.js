import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Guild Store — السيرفر المختار حالياً
 *
 * يُستخدم في:
 *   - DashboardLayout  → يعرض اسم السيرفر في الـ Topbar
 *   - كل صفحات الداش  → يجلب guildId لعمل API calls
 *   - ServersPage      → يستدعي setSelectedGuild عند الاختيار
 *
 * guild object shape (من Discord OAuth):
 *   { id, name, icon, permissions, hasBot? }
 */
export const useGuildStore = create(
  persist(
    (set, get) => ({
      // ── State ──
      selectedGuild: null,   // الـ guild object كامل
      selectedGuildId: null, // اختصار للـ id

      // ── Actions ──

      /**
       * اختيار سيرفر جديد
       * @param {Object} guild - guild object من authStore.guilds
       */
      setSelectedGuild: (guild) => {
        if (!guild?.id) return;
        set({
          selectedGuild: guild,
          selectedGuildId: guild.id,
        });
      },

      /**
       * مسح السيرفر المختار (logout أو تغيير)
       */
      clearSelectedGuild: () => {
        set({
          selectedGuild: null,
          selectedGuildId: null,
        });
      },

      /**
       * تحديث بيانات السيرفر المختار (بعد جلب /api/guild/:id/info)
       * @param {Object} updates - البيانات المحدثة (memberCount, icon, ...)
       */
      updateSelectedGuild: (updates) => {
        const current = get().selectedGuild;
        if (!current) return;
        set({
          selectedGuild: { ...current, ...updates },
        });
      },
    }),
    {
      name: 'lyn-guild-storage',
      // نحفظ فقط اللي يحتاجه للـ persist بين الجلسات
      partialize: (state) => ({
        selectedGuild: state.selectedGuild,
        selectedGuildId: state.selectedGuildId,
      }),
    },
  ),
);