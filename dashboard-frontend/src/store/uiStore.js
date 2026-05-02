import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUIStore = create(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      currentServerId: null,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setCurrentServer: (serverId) => set({ currentServerId: serverId }),
    }),
    {
      name: 'lyn-ui-storage',
    }
  )
);
