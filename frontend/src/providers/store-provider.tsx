'use client';

import { useEffect, ReactNode } from 'react';
import { useUnifiedStore, hydrateStore } from '@/store/unified-store';
import { migrateToUnifiedStore } from '@/store/migrate-stores';

interface StoreProviderProps {
  children: ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  useEffect(() => {
    // Perform store migration on mount
    migrateToUnifiedStore();
    
    // Hydrate the store
    hydrateStore();
    
    // Set up performance monitoring in development
    if (process.env.NODE_ENV === 'development') {
      const unsubscribe = useUnifiedStore.subscribe(
        (state) => state,
        (state, prevState) => {
          // Log significant state changes
          const changes: string[] = [];
          
          if (state.user !== prevState.user) {
            changes.push('user');
          }
          if (state.notifications.length !== prevState.notifications.length) {
            changes.push('notifications');
          }
          if (state.theme !== prevState.theme) {
            changes.push('theme');
          }
          
          if (changes.length > 0) {
            }`);
          }
        }
      );
      
      return () => unsubscribe();
    }
  }, []);

  // Set up cache cleanup
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const { cache } = useUnifiedStore.getState();
      const now = Date.now();
      
      // Clean expired cache entries
      Array.from(cache.entries()).forEach(([key, value]) => {
        if (now - value.timestamp > value.ttl) {
          cache.delete(key);
        }
      });
    }, 60000); // Clean every minute
    
    return () => clearInterval(cleanupInterval);
  }, []);

  // Set up WebSocket reconnection for notifications
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    
    const connect = () => {
      if (!useUnifiedStore.getState().isAuthenticated) return;
      
      try {
        ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/notifications`);
        
        ws.onmessage = (event) => {
          try {
            const notification = JSON.parse(event.data);
            useUnifiedStore.getState().addNotification({
              type: notification.type || 'info',
              title: notification.title,
              message: notification.message,
            });
          } catch (error) {
                      }
        };
        
        ws.onerror = (error) => {
                  };
        
        ws.onclose = () => {
          // Reconnect after 5 seconds
          reconnectTimeout = setTimeout(connect, 5000);
        };
      } catch (error) {
              }
    };
    
    // Subscribe to auth changes
    const unsubscribe = useUnifiedStore.subscribe(
      (state) => state.isAuthenticated,
      (isAuthenticated) => {
        if (isAuthenticated && !ws) {
          connect();
        } else if (!isAuthenticated && ws) {
          ws.close();
          ws = null;
        }
      }
    );
    
    // Initial connection
    if (useUnifiedStore.getState().isAuthenticated) {
      connect();
    }
    
    return () => {
      unsubscribe();
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
      }
    };
  }, []);

  return <>{children}</>;
}

// Hook for accessing store in server components
export function useStoreHydration() {
  useEffect(() => {
    hydrateStore();
  }, [hydrateStore]);
}