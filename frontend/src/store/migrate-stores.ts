/**
 * Migration utilities to transition from individual stores to unified store
 */

import { useAuthStore } from './auth';
import { useUIStore } from './ui';
import { useNotificationStore } from './notifications';
import { useUnifiedStore } from './unified-store';

export function migrateToUnifiedStore() {
  if (typeof window === 'undefined') return;

  // Check if migration has already been performed
  const migrationKey = 'unified-store-migration-v1';
  if (localStorage.getItem(migrationKey)) {
    return;
  }

  try {
    // Get current store states
    const authState = useAuthStore.getState();
    const uiState = useUIStore.getState();
    const notificationState = useNotificationStore.getState();

    // Migrate to unified store
    const unifiedStore = useUnifiedStore.getState();

    // Migrate auth state
    if (authState.user) {
      unifiedStore.setUser(authState.user);
    }

    // Migrate UI state
    if (uiState.theme) {
      unifiedStore.setTheme(uiState.theme as any);
    }
    if (typeof uiState.sidebarOpen === 'boolean') {
      unifiedStore.sidebarOpen = uiState.sidebarOpen;
    }

    // Migrate notifications
    if (notificationState.notifications?.length > 0) {
      notificationState.notifications.forEach((notification: any) => {
        unifiedStore.addNotification({
          type: notification.type || 'info',
          title: notification.title || notification.message || 'Notification',
          message: notification.message,
        });
      });
    }

    // Mark migration as complete
    localStorage.setItem(migrationKey, 'true');

    // Clear old store data
    localStorage.removeItem('auth-store');
    localStorage.removeItem('ui-store');
    localStorage.removeItem('notification-store');

      } catch (error) {
      }
}

// Create store adapters for backward compatibility
export function createStoreAdapter(storeName: string) {
  const unifiedStore = useUnifiedStore.getState();

  switch (storeName) {
    case 'auth':
      return {
        user: unifiedStore.user,
        isAuthenticated: unifiedStore.isAuthenticated,
        login: (user: any) => unifiedStore.setUser(user),
        logout: () => unifiedStore.logout(),
        subscribe: useUnifiedStore.subscribe,
      };

    case 'ui':
      return {
        theme: unifiedStore.theme,
        sidebarOpen: unifiedStore.sidebarOpen,
        setTheme: unifiedStore.setTheme,
        toggleSidebar: unifiedStore.toggleSidebar,
        subscribe: useUnifiedStore.subscribe,
      };

    case 'notifications':
      return {
        notifications: unifiedStore.notifications,
        unreadCount: unifiedStore.unreadCount,
        addNotification: unifiedStore.addNotification,
        markAsRead: unifiedStore.markAsRead,
        clearNotifications: unifiedStore.clearNotifications,
        subscribe: useUnifiedStore.subscribe,
      };

    default:
      throw new Error(`Unknown store: ${storeName}`);
  }
}

// Hook to use during migration period
export function useMigrationStore<T extends 'auth' | 'ui' | 'notifications'>(
  storeName: T
) {
  const store = createStoreAdapter(storeName);
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      forceUpdate({});
    });

    return unsubscribe;
  }, [store]);

  return store;
}

// Batch state update utility
export function batchUpdateState(updates: Array<() => void>) {
  // React 18 automatically batches updates, but this ensures it
  if ('startTransition' in React) {
    React.startTransition(() => {
      updates.forEach(update => update());
    });
  } else {
    updates.forEach(update => update());
  }
}

// Import React hooks
import { useState, useEffect } from 'react';
import React from 'react';