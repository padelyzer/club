import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UIState } from '@/types';

interface UIStore extends UIState {
  // Actions
  setTheme: (theme: UIState['theme']) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setIsMobile: (isMobile: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  toggleNotifications: () => void;
  setLanguage: (language: UIState['language']) => void;

  // Gesture states
  isSwipeGestureActive: boolean;
  setSwipeGestureActive: (active: boolean) => void;

  // Loading states for different UI sections
  loadingStates: Record<string, boolean>;
  setLoading: (section: string, loading: boolean) => void;

  // Error states
  errors: Record<string, string | null>;
  setError: (section: string, error: string | null) => void;
  clearError: (section: string) => void;
  clearAllErrors: () => void;

  // Modal states
  modals: Record<string, boolean>;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      // Initial state
      theme: 'system',
      sidebarCollapsed: false,
      isMobile: false,
      activeModal: null,
      notifications: true,
      language: 'en',
      isSwipeGestureActive: false,
      loadingStates: {},
      errors: {},
      modals: {},

      // Actions
      setTheme: (theme) => set({ theme }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      setIsMobile: (isMobile) => {
        const { sidebarCollapsed } = get();
        set({
          isMobile,
          // Auto-collapse sidebar on mobile
          sidebarCollapsed: isMobile || sidebarCollapsed,
        });
      },

      openModal: (modalId) => set({ activeModal: modalId }),

      closeModal: () => set({ activeModal: null }),

      toggleNotifications: () =>
        set((state) => ({ notifications: !state.notifications })),

      setLanguage: (language) => set({ language }),

      setSwipeGestureActive: (active) => set({ isSwipeGestureActive: active }),

      setLoading: (section, loading) =>
        set((state) => ({
          loadingStates: {
            ...state.loadingStates,
            [section]: loading,
          },
        })),

      setError: (section, error) =>
        set((state) => ({
          errors: {
            ...state.errors,
            [section]: error,
          },
        })),

      clearError: (section) =>
        set((state) => ({
          errors: {
            ...state.errors,
            [section]: null,
          },
        })),

      clearAllErrors: () => set({ errors: {} }),
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        notifications: state.notifications,
        language: state.language,
      }),
    }
  )
);
