import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AppState {
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  badges: {
    suppliersAtRisk: number;
    lateOrders: number;
    openAnomalies: number;
    unreadNotifs: number;
  };
  setTheme: (theme: 'dark' | 'light') => void;
  toggleSidebar: () => void;
  updateBadges: (badges: Partial<AppState['badges']>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      sidebarCollapsed: false,
      badges: {
        suppliersAtRisk: 0,
        lateOrders: 0,
        openAnomalies: 0,
        unreadNotifs: 0,
      },
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      updateBadges: (badges) => set((s) => ({ badges: { ...s.badges, ...badges } })),
    }),
    {
      name: 'pa-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ theme: s.theme, sidebarCollapsed: s.sidebarCollapsed }),
      skipHydration: true,
    }
  )
);
