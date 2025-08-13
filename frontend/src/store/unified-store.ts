/**
 * Unified Global Store
 * Combines multiple stores into a single source of truth
 * with optimized performance and persistence
 */

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Import existing store types
import type { AuthState } from './auth';
import type { UIState } from './ui';
import type { NotificationState } from './notifications';

// Define slices
interface AuthSlice {
  // Auth state
  user: AuthState['user'];
  isAuthenticated: boolean;
  isLoading: boolean;
  loginAttempts: number;
  
  // Auth actions
  setUser: (user: AuthState['user']) => void;
  logout: () => void;
  incrementLoginAttempts: () => void;
  resetLoginAttempts: () => void;
}

interface UISlice {
  // UI state
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  activeModal: string | null;
  
  // UI actions
  setTheme: (theme: UISlice['theme']) => void;
  toggleSidebar: () => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
}

interface NotificationSlice {
  // Notification state
  notifications: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message?: string;
    timestamp: number;
    read: boolean;
  }>;
  unreadCount: number;
  
  // Notification actions
  addNotification: (notification: Omit<NotificationSlice['notifications'][0], 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

interface CacheSlice {
  // Cache state
  cache: Map<string, { data: any; timestamp: number; ttl: number }>;
  
  // Cache actions
  setCache: (key: string, data: any, ttl?: number) => void;
  getCache: (key: string) => any;
  invalidateCache: (pattern?: string) => void;
  clearCache: () => void;
}

interface OptimisticUpdateSlice {
  // Optimistic update state
  pendingUpdates: Map<string, { update: any; rollback: any }>;
  
  // Optimistic update actions
  addOptimisticUpdate: (id: string, update: any, rollback: any) => void;
  commitOptimisticUpdate: (id: string) => void;
  rollbackOptimisticUpdate: (id: string) => void;
}

// Combined store type
export interface UnifiedStore extends 
  AuthSlice, 
  UISlice, 
  NotificationSlice, 
  CacheSlice,
  OptimisticUpdateSlice {}

// Create the unified store
export const useUnifiedStore = create<UnifiedStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // Auth slice
          user: null,
          isAuthenticated: false,
          isLoading: false,
          loginAttempts: 0,
          
          setUser: (user) => set((state) => {
            state.user = user;
            state.isAuthenticated = !!user;
          }),
          
          logout: () => set((state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.loginAttempts = 0;
            // Clear sensitive cache data
            state.cache.clear();
          }),
          
          incrementLoginAttempts: () => set((state) => {
            state.loginAttempts += 1;
          }),
          
          resetLoginAttempts: () => set((state) => {
            state.loginAttempts = 0;
          }),
          
          // UI slice
          theme: 'system',
          sidebarOpen: true,
          activeModal: null,
          
          setTheme: (theme) => set((state) => {
            state.theme = theme;
          }),
          
          toggleSidebar: () => set((state) => {
            state.sidebarOpen = !state.sidebarOpen;
          }),
          
          openModal: (modalId) => set((state) => {
            state.activeModal = modalId;
          }),
          
          closeModal: () => set((state) => {
            state.activeModal = null;
          }),
          
          // Notification slice
          notifications: [],
          unreadCount: 0,
          
          addNotification: (notification) => set((state) => {
            const newNotification = {
              ...notification,
              id: crypto.randomUUID(),
              timestamp: Date.now(),
              read: false,
            };
            state.notifications.unshift(newNotification);
            state.unreadCount += 1;
            
            // Limit notifications to 100
            if (state.notifications.length > 100) {
              state.notifications = state.notifications.slice(0, 100);
            }
          }),
          
          markAsRead: (id) => set((state) => {
            const notification = state.notifications.find(n => n.id === id);
            if (notification && !notification.read) {
              notification.read = true;
              state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
          }),
          
          markAllAsRead: () => set((state) => {
            state.notifications.forEach(n => { n.read = true; });
            state.unreadCount = 0;
          }),
          
          removeNotification: (id) => set((state) => {
            const index = state.notifications.findIndex(n => n.id === id);
            if (index !== -1) {
              const notification = state.notifications[index];
              if (!notification.read) {
                state.unreadCount = Math.max(0, state.unreadCount - 1);
              }
              state.notifications.splice(index, 1);
            }
          }),
          
          clearNotifications: () => set((state) => {
            state.notifications = [];
            state.unreadCount = 0;
          }),
          
          // Cache slice
          cache: new Map(),
          
          setCache: (key, data, ttl = 5 * 60 * 1000) => set((state) => {
            state.cache.set(key, {
              data,
              timestamp: Date.now(),
              ttl,
            });
          }),
          
          getCache: (key) => {
            const cached = get().cache.get(key);
            if (!cached) return null;
            
            const isExpired = Date.now() - cached.timestamp > cached.ttl;
            if (isExpired) {
              get().cache.delete(key);
              return null;
            }
            
            return cached.data;
          },
          
          invalidateCache: (pattern) => set((state) => {
            if (!pattern) {
              state.cache.clear();
              return;
            }
            
            const regex = new RegExp(pattern);
            Array.from(state.cache.keys()).forEach(key => {
              if (regex.test(key)) {
                state.cache.delete(key);
              }
            });
          }),
          
          clearCache: () => set((state) => {
            state.cache.clear();
          }),
          
          // Optimistic update slice
          pendingUpdates: new Map(),
          
          addOptimisticUpdate: (id, update, rollback) => set((state) => {
            state.pendingUpdates.set(id, { update, rollback });
            // Apply the update
            update(state);
          }),
          
          commitOptimisticUpdate: (id) => set((state) => {
            state.pendingUpdates.delete(id);
          }),
          
          rollbackOptimisticUpdate: (id) => set((state) => {
            const pending = state.pendingUpdates.get(id);
            if (pending) {
              pending.rollback(state);
              state.pendingUpdates.delete(id);
            }
          }),
        }))
      ),
      {
        name: 'unified-store',
        partialize: (state) => ({
          // Only persist non-sensitive data
          user: state.user,
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
          notifications: state.notifications.slice(0, 50), // Limit persisted notifications
        }),
      }
    ),
    {
      name: 'UnifiedStore',
    }
  )
);

// Selectors
export const useAuth = () => useUnifiedStore((state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isLoading,
  loginAttempts: state.loginAttempts,
  setUser: state.setUser,
  logout: state.logout,
  incrementLoginAttempts: state.incrementLoginAttempts,
  resetLoginAttempts: state.resetLoginAttempts,
}));

export const useUI = () => useUnifiedStore((state) => ({
  theme: state.theme,
  sidebarOpen: state.sidebarOpen,
  activeModal: state.activeModal,
  setTheme: state.setTheme,
  toggleSidebar: state.toggleSidebar,
  openModal: state.openModal,
  closeModal: state.closeModal,
}));

export const useNotifications = () => useUnifiedStore((state) => ({
  notifications: state.notifications,
  unreadCount: state.unreadCount,
  addNotification: state.addNotification,
  markAsRead: state.markAsRead,
  markAllAsRead: state.markAllAsRead,
  removeNotification: state.removeNotification,
  clearNotifications: state.clearNotifications,
}));

export const useCache = () => useUnifiedStore((state) => ({
  setCache: state.setCache,
  getCache: state.getCache,
  invalidateCache: state.invalidateCache,
  clearCache: state.clearCache,
}));

export const useOptimisticUpdates = () => useUnifiedStore((state) => ({
  addOptimisticUpdate: state.addOptimisticUpdate,
  commitOptimisticUpdate: state.commitOptimisticUpdate,
  rollbackOptimisticUpdate: state.rollbackOptimisticUpdate,
}));

// Utility functions
export const hydrateStore = () => {
  if (typeof window !== 'undefined') {
    useUnifiedStore.persist.rehydrate();
  }
};

// Performance monitoring
if (process.env.NODE_ENV === 'development') {
  useUnifiedStore.subscribe(
    (state) => state,
    (state, prevState) => {
          }
  );
}