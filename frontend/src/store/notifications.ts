import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { AppNotification, LoadingState } from '@/types';
import {
  WebSocketMessage,
  WebSocketStoreIntegration,
  NotificationPayload,
  isNotificationMessage,
} from '@/types/websocket';
import {
  PWANotification,
  PWANotificationSettings,
  NotificationPermission,
  PWAInstallationState,
  NotificationManagerState,
  PushSubscriptionWithMetadata,
} from '@/types/notifications';

interface NotificationFilters {
  type: AppNotification['type'][];
  isRead: boolean | null;
  dateRange: {
    start: string;
    end: string;
  };
}

interface NotificationSettings {
  enablePush: boolean;
  enableEmail: boolean;
  enableInApp: boolean;
  types: {
    reservations: boolean;
    payments: boolean;
    tournaments: boolean;
    system: boolean;
  };
  quiet: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface NotificationStore extends LoadingState, WebSocketStoreIntegration {
  // Data
  notifications: AppNotification[];

  // Filters
  filters: NotificationFilters;

  // Settings (legacy - kept for compatibility)
  settings: NotificationSettings;

  // PWA Settings
  pwaSettings: PWANotificationSettings;

  // State
  unreadCount: number;
  selectedNotification: AppNotification | null;

  // Permission state
  permissionStatus: NotificationPermission;

  // PWA State
  pwaInstallationState: PWAInstallationState;
  subscriptionInfo: PushSubscriptionWithMetadata | null;
  serviceState: NotificationManagerState;

  // Real-time state
  lastWebSocketUpdate: string | null;
  acknowledgedNotifications: Set<string>;

  // Actions
  addNotification: (
    notification: Omit<AppNotification, 'id' | 'createdAt'>
  ) => void;
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  deleteAllRead: () => void;
  deleteExpired: () => void;

  // Bulk actions
  bulkMarkAsRead: (ids: string[]) => void;
  bulkDelete: (ids: string[]) => void;

  // Selection
  setSelectedNotification: (notification: AppNotification | null) => void;

  // Filters
  setFilters: (filters: Partial<NotificationFilters>) => void;
  resetFilters: () => void;

  // Settings
  updateSettings: (settings: Partial<NotificationSettings>) => void;

  // Permission
  requestPermission: () => Promise<void>;
  setPermissionStatus: (status: NotificationStore['permissionStatus']) => void;

  // PWA Functions
  initializePWA: () => Promise<void>;
  subscribeToPush: () => Promise<boolean>;
  unsubscribeFromPush: () => Promise<boolean>;
  showPWANotification: (notification: PWANotification) => Promise<void>;
  scheduleNotification: (
    notification: PWANotification,
    scheduledFor: Date
  ) => Promise<void>;
  updatePWASettings: (
    settings: Partial<PWANotificationSettings>
  ) => Promise<void>;

  // PWA Installation
  checkInstallability: () => void;
  installPWA: () => Promise<boolean>;
  dismissInstallPrompt: () => void;

  // Service Worker Management
  updateServiceWorker: () => Promise<void>;
  clearNotificationCache: () => Promise<void>;
  processOfflineQueue: () => Promise<void>;

  // Real-time
  handleRealtimeNotification: (notification: AppNotification) => void;
  acknowledgeNotification: (id: string) => void;

  // WebSocket integration
  handleWebSocketMessage: (message: WebSocketMessage) => void;

  // Loading and error states
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed getters
  getFilteredNotifications: () => AppNotification[];
  getUnreadNotifications: () => AppNotification[];
  getNotificationsByType: (type: AppNotification['type']) => AppNotification[];

  // Utility actions
  showToast: (
    notification: Pick<AppNotification, 'type' | 'title' | 'message'>
  ) => void;
}

const defaultFilters: NotificationFilters = {
  type: [],
  isRead: null,
  dateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]!,
    end: new Date().toISOString().split('T')[0]!,
  },
};

const defaultSettings: NotificationSettings = {
  enablePush: true,
  enableEmail: true,
  enableInApp: true,
  types: {
    reservations: true,
    payments: true,
    tournaments: true,
    system: true,
  },
  quiet: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
};

const defaultPWASettings: PWANotificationSettings = {
  pushNotificationsEnabled: true,
  inAppNotificationsEnabled: true,
  emailNotificationsEnabled: true,
  permissionRequested: false,
  pwaInstalled: false,
  installPromptDismissed: false,
  categories: {
    reservations: {
      enabled: true,
      pushEnabled: true,
      soundEnabled: true,
      vibrationEnabled: true,
      quietHours: { enabled: false, start: '22:00', end: '08:00' },
      priority: 'high',
    },
    tournaments: {
      enabled: true,
      pushEnabled: true,
      soundEnabled: true,
      vibrationEnabled: true,
      quietHours: { enabled: false, start: '22:00', end: '08:00' },
      priority: 'normal',
    },
    classes: {
      enabled: true,
      pushEnabled: true,
      soundEnabled: true,
      vibrationEnabled: true,
      quietHours: { enabled: false, start: '22:00', end: '08:00' },
      priority: 'normal',
    },
    payments: {
      enabled: true,
      pushEnabled: true,
      soundEnabled: true,
      vibrationEnabled: true,
      quietHours: { enabled: false, start: '22:00', end: '08:00' },
      priority: 'high',
    },
    promotions: {
      enabled: true,
      pushEnabled: false,
      soundEnabled: false,
      vibrationEnabled: false,
      quietHours: { enabled: true, start: '22:00', end: '08:00' },
      priority: 'low',
    },
    system: {
      enabled: true,
      pushEnabled: true,
      soundEnabled: false,
      vibrationEnabled: false,
      quietHours: { enabled: false, start: '22:00', end: '08:00' },
      priority: 'normal',
    },
  },
  badgeCount: true,
  showPreview: true,
  groupSimilar: true,
  maxNotificationsPerDay: 50,
  trackDelivery: true,
  trackInteraction: true,
};

export const useNotificationStore = create<NotificationStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      notifications: [],
      filters: defaultFilters,
      settings: defaultSettings,
      pwaSettings: defaultPWASettings,
      unreadCount: 0,
      selectedNotification: null,
      permissionStatus: 'default',
      pwaInstallationState: 'not-available',
      subscriptionInfo: null,
      serviceState: {
        isInitialized: false,
        permissionStatus: 'default',
        subscriptionStatus: 'none',
        serviceWorkerReady: false,
        pushServiceConnected: false,
        queueSize: 0,
        errors: [],
      },
      isLoading: false,
      error: null,
      lastWebSocketUpdate: null,
      acknowledgedNotifications: new Set(),

      // WebSocket integration
      messageTypes: ['notification:new'],

      handleMessage: (message: WebSocketMessage) => {
        if (!isNotificationMessage(message)) return;

        const payload = message.payload as NotificationPayload;
        const { notification, priority, requiresAck } = payload;

        // Handle the notification through existing real-time handler
        get().handleRealtimeNotification(notification);

        // Track high priority notifications that require acknowledgment
        if (requiresAck && priority && ['high', 'urgent'].includes(priority)) {
          set((state) => {
            state.acknowledgedNotifications.add(notification.id);
          });
        }

        set((state) => {
          state.lastWebSocketUpdate = new Date().toISOString();
        });
      },

      handleWebSocketMessage: (message: WebSocketMessage) => {
        get().handleMessage(message);

        // Also handle through PWA integration
        if (typeof window !== 'undefined') {
          import('@/lib/notifications').then(
            ({ handleWebSocketNotification }) => {
              handleWebSocketNotification(message).catch((error) => {
                if (process.env.NODE_ENV === 'development') {
                                  }
              });
            }
          );
        }
      },

      acknowledgeNotification: (id: string) =>
        set((state) => {
          state.acknowledgedNotifications.add(id);
          // Could send acknowledgment back to server if needed
        }),

      // Actions
      addNotification: (notificationData) =>
        set((state) => {
          const notification: AppNotification = {
            ...notificationData,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            createdAt: new Date().toISOString(),
          };

          state.notifications.unshift(notification);

          // Update unread count
          if (!notification.isRead) {
            state.unreadCount += 1;
          }

          // Auto-expire old notifications (keep last 100)
          if (state.notifications.length > 100) {
            const removed = state.notifications.splice(100);
            // Adjust unread count for removed unread notifications
            const removedUnread = removed.filter((n) => !n.isRead).length;
            state.unreadCount = Math.max(0, state.unreadCount - removedUnread);
          }
        }),

      markAsRead: (id) =>
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          if (notification && !notification.isRead) {
            notification.isRead = true;
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        }),

      markAsUnread: (id) =>
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          if (notification && notification.isRead) {
            notification.isRead = false;
            state.unreadCount += 1;
          }
        }),

      markAllAsRead: () =>
        set((state) => {
          state.notifications.forEach((notification) => {
            notification.isRead = true;
          });
          state.unreadCount = 0;
        }),

      deleteNotification: (id) =>
        set((state) => {
          const index = state.notifications.findIndex((n) => n.id === id);
          if (index !== -1) {
            const notification = state.notifications[index];
            if (notification && !notification.isRead) {
              state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
            state.notifications.splice(index, 1);

            // Clear selection if deleted
            if (state.selectedNotification?.id === id) {
              state.selectedNotification = null;
            }
          }
        }),

      deleteAllRead: () =>
        set((state) => {
          state.notifications = state.notifications.filter((n) => !n.isRead);
          // Clear selection if it was a read notification
          if (state.selectedNotification?.isRead) {
            state.selectedNotification = null;
          }
        }),

      deleteExpired: () =>
        set((state) => {
          const now = new Date();
          const initialLength = state.notifications.length;

          state.notifications = state.notifications.filter((notification) => {
            if (notification.expiresAt) {
              const expiresAt = new Date(notification.expiresAt);
              return expiresAt > now;
            }
            return true;
          });

          // Recalculate unread count
          state.unreadCount = state.notifications.filter(
            (n) => !n.isRead
          ).length;

          // Clear selection if it was expired
          if (state.selectedNotification?.expiresAt) {
            const expiresAt = new Date(state.selectedNotification.expiresAt);
            if (expiresAt <= now) {
              state.selectedNotification = null;
            }
          }
        }),

      // Bulk actions
      bulkMarkAsRead: (ids) =>
        set((state) => {
          let markedCount = 0;
          ids.forEach((id) => {
            const notification = state.notifications.find((n) => n.id === id);
            if (notification && !notification.isRead) {
              notification.isRead = true;
              markedCount++;
            }
          });
          state.unreadCount = Math.max(0, state.unreadCount - markedCount);
        }),

      bulkDelete: (ids) =>
        set((state) => {
          let deletedUnreadCount = 0;
          const idsToDelete = new Set(ids);

          state.notifications = state.notifications.filter((notification) => {
            if (idsToDelete.has(notification.id)) {
              if (!notification.isRead) {
                deletedUnreadCount++;
              }
              return false;
            }
            return true;
          });

          state.unreadCount = Math.max(
            0,
            state.unreadCount - deletedUnreadCount
          );

          // Clear selection if it was deleted
          if (
            state.selectedNotification &&
            idsToDelete.has(state.selectedNotification.id)
          ) {
            state.selectedNotification = null;
          }
        }),

      // Selection
      setSelectedNotification: (notification) =>
        set((state) => {
          state.selectedNotification = notification;

          // Auto-mark as read when selected
          if (notification && !notification.isRead) {
            notification.isRead = true;
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        }),

      // Filters
      setFilters: (filters) =>
        set((state) => {
          Object.assign(state.filters, filters);
        }),

      resetFilters: () =>
        set((state) => {
          state.filters = defaultFilters;
        }),

      // Settings
      updateSettings: (settings) =>
        set((state) => {
          Object.assign(state.settings, settings);
        }),

      // Permission
      requestPermission: async () => {
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          set((state) => {
            state.permissionStatus = permission;
          });
        }
      },

      setPermissionStatus: (status) =>
        set((state) => {
          state.permissionStatus = status;
        }),

      // Real-time
      handleRealtimeNotification: (notification) => {
        const { settings } = get();

        // Check if notifications are enabled for this type
        const typeKey =
          notification.type === 'info' ? 'system' : notification.type;
        if (!settings.types[typeKey as keyof typeof settings.types]) {
          return;
        }

        // Check quiet hours
        if (settings.quiet.enabled) {
          const now = new Date();
          const currentTime =
            now.getHours().toString().padStart(2, '0') +
            ':' +
            now.getMinutes().toString().padStart(2, '0');

          if (
            currentTime >= settings.quiet.start ||
            currentTime <= settings.quiet.end
          ) {
            // Store notification but don&apos;t show
            get().addNotification(notification);
            return;
          }
        }

        // Add to store
        get().addNotification(notification);

        // Show browser notification if enabled and permitted
        if (settings.enablePush && get().permissionStatus === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: notification.id,
          });
        }

        // Show toast notification
        get().showToast(notification);
      },

      // Loading and error states
      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading;
        }),

      setError: (error) =>
        set((state) => {
          state.error = error;
        }),

      // Computed getters
      getFilteredNotifications: () => {
        const { notifications, filters } = get();

        return notifications.filter((notification) => {
          // Type filter
          if (
            filters.type.length > 0 &&
            !filters.type.includes(notification.type)
          ) {
            return false;
          }

          // Read status filter
          if (
            filters.isRead !== null &&
            notification.isRead !== filters.isRead
          ) {
            return false;
          }

          // Date range filter
          const notificationDate = new Date(notification.createdAt);
          const startDate = new Date(filters.dateRange.start);
          const endDate = new Date(filters.dateRange.end);

          if (notificationDate < startDate || notificationDate > endDate) {
            return false;
          }

          return true;
        });
      },

      getUnreadNotifications: () => {
        const { notifications } = get();
        return notifications.filter((notification) => !notification.isRead);
      },

      getNotificationsByType: (type) => {
        const { notifications } = get();
        return notifications.filter(
          (notification) => notification.type === type
        );
      },

      // PWA Functions
      initializePWA: async () => {
        try {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          // Dynamic import to avoid SSR issues
          const { notificationService } = await import('@/lib/notifications');

          await notificationService.initialize();
          const serviceState = notificationService.getState();
          const subscriptionInfo =
            await notificationService.getSubscriptionInfo();

          set((state) => {
            state.serviceState = serviceState;
            state.subscriptionInfo = subscriptionInfo;
            state.permissionStatus = serviceState.permissionStatus;
            state.isLoading = false;
          });

          // Check PWA installability
          get().checkInstallability();

          if (process.env.NODE_ENV === 'development') {
                      }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
                      }
          set((state) => {
            state.error =
              error instanceof Error
                ? error.message
                : 'Failed to initialize PWA';
            state.isLoading = false;
          });
        }
      },

      subscribeToPush: async () => {
        try {
          const { notificationService } = await import('@/lib/notifications');
          const success = await notificationService.subscribeToPush();

          if (success) {
            const serviceState = notificationService.getState();
            const subscriptionInfo =
              await notificationService.getSubscriptionInfo();

            set((state) => {
              state.serviceState = serviceState;
              state.subscriptionInfo = subscriptionInfo;
              state.pwaSettings.pushNotificationsEnabled = true;
            });
          }

          return success;
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
                      }
          set((state) => {
            state.error =
              error instanceof Error
                ? error.message
                : 'Failed to subscribe to push';
          });
          return false;
        }
      },

      unsubscribeFromPush: async () => {
        try {
          const { notificationService } = await import('@/lib/notifications');
          const success = await notificationService.unsubscribeFromPush();

          if (success) {
            const serviceState = notificationService.getState();

            set((state) => {
              state.serviceState = serviceState;
              state.subscriptionInfo = null;
              state.pwaSettings.pushNotificationsEnabled = false;
            });
          }

          return success;
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
                      }
          return false;
        }
      },

      showPWANotification: async (notification) => {
        try {
          const { notificationService } = await import('@/lib/notifications');
          await notificationService.showNotification(notification);

          // Also add to internal state for tracking
          get().addNotification(notification);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
                      }
          set((state) => {
            state.error =
              error instanceof Error
                ? error.message
                : 'Failed to show notification';
          });
        }
      },

      scheduleNotification: async (notification, scheduledFor) => {
        try {
          const { notificationService } = await import('@/lib/notifications');
          await notificationService.scheduleNotification(
            notification,
            scheduledFor
          );

          if (process.env.NODE_ENV === 'development') {
                      }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
                      }
          set((state) => {
            state.error =
              error instanceof Error
                ? error.message
                : 'Failed to schedule notification';
          });
        }
      },

      updatePWASettings: async (settings) => {
        try {
          const { notificationService } = await import('@/lib/notifications');
          await notificationService.updateSettings(settings);

          set((state) => {
            Object.assign(state.pwaSettings, settings);
          });
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
                      }
        }
      },

      // PWA Installation
      checkInstallability: () => {
        // Check if PWA is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
          set((state) => {
            state.pwaInstallationState = 'installed';
            state.pwaSettings.pwaInstalled = true;
          });
          return;
        }

        // Check if install prompt was dismissed recently
        const dismissedAt = localStorage.getItem('pwa-install-dismissed-at');
        if (dismissedAt) {
          const daysSinceDismissal =
            (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
          if (daysSinceDismissal < 7) {
            set((state) => {
              state.pwaInstallationState = 'dismissed';
            });
            return;
          }
        }

        // Listen for beforeinstallprompt event
        if ('beforeinstallprompt' in window) {
          window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            (window as any).deferredPrompt = e;

            set((state) => {
              state.pwaInstallationState = 'available';
            });
          });
        }
      },

      installPWA: async () => {
        try {
          const deferredPrompt = (window as any).deferredPrompt;

          if (!deferredPrompt) {
            return false;
          }

          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;

          (window as any).deferredPrompt = null;

          if (outcome === 'accepted') {
            set((state) => {
              state.pwaInstallationState = 'installed';
              state.pwaSettings.pwaInstalled = true;
            });
            return true;
          } else {
            get().dismissInstallPrompt();
            return false;
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
                      }
          return false;
        }
      },

      dismissInstallPrompt: () => {
        localStorage.setItem('pwa-install-dismissed-at', Date.now().toString());

        set((state) => {
          state.pwaInstallationState = 'dismissed';
          state.pwaSettings.installPromptDismissed = true;
          state.pwaSettings.installPromptDismissedAt = new Date().toISOString();
        });
      },

      // Service Worker Management
      updateServiceWorker: async () => {
        try {
          if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;

            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
                      }
        }
      },

      clearNotificationCache: async () => {
        try {
          const { notificationService } = await import('@/lib/notifications');
          await notificationService.clearAllNotifications();

          set((state) => {
            state.notifications = [];
            state.unreadCount = 0;
          });
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
                      }
        }
      },

      processOfflineQueue: async () => {
        try {
          const { notificationService } = await import('@/lib/notifications');
          await notificationService.processOfflineQueue();

          const serviceState = notificationService.getState();
          set((state) => {
            state.serviceState = serviceState;
          });
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
                      }
        }
      },

      // Utility actions
      showToast: (notification) => {
        // This would typically integrate with a toast library like react-hot-toast
        if (process.env.NODE_ENV === 'development') {
                  }
      },
    })),
    {
      name: 'notifications-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        pwaSettings: state.pwaSettings,
        permissionStatus: state.permissionStatus,
        pwaInstallationState: state.pwaInstallationState,
        // Don't persist notifications, subscription info, or service state to avoid stale data
      }),
    }
  )
);
