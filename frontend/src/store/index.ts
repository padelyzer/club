// Store exports
export { useAuthStore } from './auth';
export { useUIStore } from './ui';
export { useProfileStore } from './profileStore';
export { useReservationStore } from './reservations';
export { useDashboardStore } from './dashboard';
export { useNotificationStore } from './notifications';
export { useClientsStore } from './clientsStore';
// DEPRECATED: useClubsStore wrapper causes performance issues - use individual stores
export { useActiveClubStore, useClubsDataStore, useClubsUIStore } from './clubs';
export { useClubsStore } from './clubs'; // Kept for backward compatibility only
export { useTournamentStore } from './tournamentsStore';
export { useClassesStore } from './classesStore';
export { useFinanceStore } from './financeStore';

// Store utilities and hooks
import { useAuthStore } from './auth';
import { useUIStore } from './ui';
import { useProfileStore } from './profileStore';
import { useReservationStore } from './reservations';
import { useDashboardStore } from './dashboard';
import { useNotificationStore } from './notifications';
import { useClientsStore } from './clientsStore';
import { useActiveClubStore, useClubsDataStore, useClubsUIStore } from './clubs';
import { useTournamentStore } from './tournamentsStore';
import { useClassesStore } from './classesStore';
import { useFinanceStore } from './financeStore';

// Utility hook to check if all stores are ready
export const useStoresReady = () => {
  const authReady = useAuthStore((state) => state.user !== undefined);
  const uiReady = useUIStore((state) => state.theme !== undefined);

  return authReady && uiReady;
};

// Global store actions for cross-store communication
export const storeActions = {
  // Global logout - clears all stores
  globalLogout: () => {
    useAuthStore.getState().logout('manual');
    useProfileStore.getState().reset();
    useReservationStore.getState().setReservations([]);
    useDashboardStore.getState().resetLayout();
    useNotificationStore.getState().deleteExpired();
    useUIStore.getState().closeModal();
    useUIStore.getState().clearAllErrors();
  },

  // Global loading state
  setGlobalLoading: (loading: boolean) => {
    useAuthStore.getState().setLoading(loading);
    useUIStore.getState().setLoading('global', loading);
    useReservationStore.getState().setLoading(loading);
    useDashboardStore.getState().setLoading(loading);
    useNotificationStore.getState().setLoading(loading);
    useTournamentStore.getState().setLoading(loading);
  },

  // Error handling
  handleGlobalError: (error: string, section?: string) => {

    if (section) {
      useUIStore.getState().setError(section, error);
    }

    // Show error notification
    useNotificationStore.getState().addNotification({
      type: 'error',
      title: 'System Error',
      message: error,
      isRead: false,
      userId: useAuthStore.getState().user?.id || 'anonymous',
    });
  },

  // Success handling
  handleGlobalSuccess: (message: string, title = 'Success') => {
    useNotificationStore.getState().addNotification({
      type: 'success',
      title,
      message,
      isRead: false,
      userId: useAuthStore.getState().user?.id || 'anonymous',
    });
  },

  // Activity tracking for session management
  trackActivity: () => {
    useAuthStore.getState().updateActivity();
  },

  // Real-time data sync
  syncStores: () => {
    // This would typically sync with the server
    // For now, just update activity and clean up expired notifications
    useAuthStore.getState().updateActivity();
    useNotificationStore.getState().deleteExpired();

    // Update dashboard last update time
    useDashboardStore.getState().updateLastUpdate();
  },
};

// Store subscriptions for cross-store reactions
let sessionExpiryInterval: NodeJS.Timeout | null = null;
let autoSyncInterval: NodeJS.Timeout | null = null;

export const setupStoreSubscriptions = () => {
  // React to auth changes
  const authUnsubscribe = useAuthStore.subscribe((state, prevState) => {
    // If user logged out, clear other stores
    if (prevState.isAuthenticated && !state.isAuthenticated) {
      useReservationStore.getState().setReservations([]);
      useDashboardStore.getState().resetLayout();
      useUIStore.getState().closeModal();
    }

    // If user changed, update device-specific settings
    if (state.user && state.user.id !== prevState.user?.id) {
      // Load user-specific settings
      const userLang = state.user.email.includes('.es') ? 'es' : 'en'; // Simple detection
      useUIStore.getState().setLanguage(userLang as any);
    }
  });

  // React to UI theme changes
  const uiUnsubscribe = useUIStore.subscribe((state, prevState) => {
    if (state.theme !== prevState.theme) {
      // Apply theme immediately
      document.documentElement.setAttribute('data-theme', state.theme);
    }

    // Track mobile state changes for responsive behavior
    if (state.isMobile !== prevState.isMobile) {
      if (state.isMobile) {
        state.setSidebarCollapsed(true);
      }
    }
  });

  // React to notification permission changes
  const notificationUnsubscribe = useNotificationStore.subscribe((state, prevState) => {
    if (state.permissionStatus !== prevState.permissionStatus) {
      // Permission status changed
    }
  });

  // Session expiry checking
  sessionExpiryInterval = setInterval(() => {
    if (useAuthStore.getState().isAuthenticated) {
      useAuthStore.getState().checkSessionExpiry();
    }
  }, 60000); // Check every minute

  // Auto-sync stores every 5 minutes
  autoSyncInterval = setInterval(() => {
    if (useAuthStore.getState().isAuthenticated) {
      storeActions.syncStores();
    }
  }, 5 * 60000); // Every 5 minutes
  
  // Return cleanup function
  return () => {
    authUnsubscribe();
    uiUnsubscribe();
    notificationUnsubscribe();
    
    if (sessionExpiryInterval) {
      clearInterval(sessionExpiryInterval);
      sessionExpiryInterval = null;
    }
    
    if (autoSyncInterval) {
      clearInterval(autoSyncInterval);
      autoSyncInterval = null;
    }
  };
};

// Cleanup function for store subscriptions
export const cleanupStoreSubscriptions = () => {
  if (sessionExpiryInterval) {
    clearInterval(sessionExpiryInterval);
    sessionExpiryInterval = null;
  }
  
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }
};

// Optimistic update utilities
export const optimisticUpdateHelpers = {
  // Create optimistic update for any store
  createUpdate: <T>(
    entity: string,
    type: 'create' | 'update' | 'delete',
    data: T,
    originalData?: T
  ) => ({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    type,
    entity,
    data,
    originalData,
    timestamp: Date.now(),
    status: 'pending' as const,
  }),

  // Apply optimistic update to reservations
  applyToReservations: <T>(update: any) => {
    useReservationStore.getState().addOptimisticUpdate(update);
  },

  // Resolve optimistic update
  resolve: (updateId: string, success: boolean) => {
    const reservationStore = useReservationStore.getState();
    reservationStore.updateOptimisticUpdate(
      updateId,
      success ? 'success' : 'error'
    );

    // Clean up after a delay
    setTimeout(() => {
      reservationStore.removeOptimisticUpdate(updateId);
    }, 2000);
  },
};
