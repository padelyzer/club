'use client';

import React, { createContext, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WebSocketContextValue, WebSocketMessage } from '@/types/websocket';
import { useReservationStore } from '@/store/reservations';
import { useTournamentStore } from '@/store/tournamentsStore';
import { useNotificationStore } from '@/store/notifications';
import { useDashboardStore } from '@/store/dashboard';
import { useAuthStore } from '@/store/auth';
import { toast } from '@/lib/toast';

export const WebSocketContext = createContext<WebSocketContextValue | null>(
  null
);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
}) => {
  const { isAuthenticated } = useAuthStore();
  const reservationStore = useReservationStore();
  const tournamentStore = useTournamentStore();
  const notificationStore = useNotificationStore();
  const dashboardStore = useDashboardStore();

  const previousStateRef = useRef<string>('disconnected');
  const reconnectToastId = useRef<string | null>(null);
  
  // Check if we're on a public route
  const isPublicRoute = typeof window !== 'undefined' && (
    window.location.pathname.includes('/login') ||
    window.location.pathname.includes('/register') ||
    window.location.pathname.includes('/forgot-password') ||
    window.location.pathname.includes('/reset-password')
  );

  const handleStateChange = useCallback((state: string) => {
    const previousState = previousStateRef.current;
    previousStateRef.current = state;

    // Temporarily disable WebSocket toasts
    // Handle connection state changes with toasts
    // switch (state) {
    //   case 'connecting':
    //     if (previousState === 'disconnected' || previousState === 'error') {
    //       reconnectToastId.current = toast.loading(
    //         'Connecting to real-time updates...',
    //         {
    //           id: 'websocket-connecting',
    //         }
    //       );
    //     }
    //     break;

    //   case 'connected':
    //     if (reconnectToastId.current) {
    //       toast.success('Connected to real-time updates', {
    //         id: reconnectToastId.current,
    //         duration: 3000,
    //       });
    //       reconnectToastId.current = null;
    //     }
    //     break;

    //   case 'reconnecting':
    //     reconnectToastId.current = toast.loading(
    //       'Reconnecting to real-time updates...',
    //       {
    //         id: 'websocket-reconnecting',
    //       }
    //     );
    //     break;

    //   case 'disconnected':
    //     if (previousState === 'connected') {
    //       toast.error('Lost connection to real-time updates', {
    //         id: 'websocket-disconnected',
    //         duration: 5000,
    //       });
    //     }
    //     break;

    //   case 'error':
    //     if (reconnectToastId.current) {
    //       toast.error('Failed to connect to real-time updates', {
    //         id: reconnectToastId.current,
    //       });
    //       reconnectToastId.current = null;
    //     }
    //     break;
    // }
  }, []);

  const errorShownRef = useRef<Set<string>>(new Set());

  const handleError = useCallback((error: any) => {
    // WebSocket disabled - suppress all errors
    return;
  }, []);

  const wsContext = useWebSocket({
    autoConnect: false, // WebSocket is completely disabled
    debug: false, // Disable debug logs for disabled WebSocket
    onStateChange: handleStateChange,
    onError: handleError,
  });

  // Subscribe stores to WebSocket messages
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribers: Array<() => void> = [];

    // Subscribe reservation store
    unsubscribers.push(
      wsContext.subscribe({
        type: reservationStore.messageTypes,
        handler: (message: WebSocketMessage) => {
          reservationStore.handleWebSocketMessage(message);
        },
      })
    );

    // Subscribe tournament store
    unsubscribers.push(
      wsContext.subscribe({
        type: tournamentStore.messageTypes,
        handler: (message: WebSocketMessage) => {
          tournamentStore.handleWebSocketMessage(message);
        },
      })
    );

    // Subscribe notification store
    unsubscribers.push(
      wsContext.subscribe({
        type: notificationStore.messageTypes,
        handler: (message: WebSocketMessage) => {
          notificationStore.handleWebSocketMessage(message);
        },
      })
    );

    // Subscribe dashboard store
    unsubscribers.push(
      wsContext.subscribe({
        type: dashboardStore.messageTypes,
        handler: (message: WebSocketMessage) => {
          dashboardStore.handleWebSocketMessage(message);
        },
      })
    );

    // Handle court status changes globally
    unsubscribers.push(
      wsContext.subscribe({
        type: 'court:status_change',
        handler: (message: WebSocketMessage) => {
          const { court, newStatus, reason } = message.payload;

          if (newStatus === 'maintenance') {
            toast.warning(
              `Court ${court.name} is under maintenance${reason ? `: ${reason}` : ''}`,
              { duration: 5000 }
            );
          } else if (
            newStatus === 'active' &&
            court.previousStatus === 'maintenance'
          ) {
            toast.success(`Court ${court.name} is now available`, {
              duration: 3000,
            });
          }

          // Update reservation store's court data
          reservationStore.setCourts(
            reservationStore.courts.map((c) =>
              c.id === court.id ? { ...c, isActive: newStatus === 'active' } : c
            )
          );
        },
      })
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [
    isAuthenticated,
    wsContext,
    reservationStore,
    tournamentStore,
    notificationStore,
    dashboardStore,
  ]);

  // Handle authentication state changes
  useEffect(() => {
    // WebSocket temporarily disabled until backend is configured
    // if (isAuthenticated && !isPublicRoute && !wsContext.isConnected) {
    //   wsContext.connect();
    // } else if ((!isAuthenticated || isPublicRoute) && wsContext.isConnected) {
    //   wsContext.disconnect();
    // }
  }, [isAuthenticated, isPublicRoute, wsContext]);

  // Provide offline mode detection
  useEffect(() => {
    const handleOnline = () => {
      if (isAuthenticated) {
        toast.success('Back online');
        // WebSocket temporarily disabled
        // wsContext.connect();
      }
    };

    const handleOffline = () => {
      toast.error('You are offline - real-time updates disabled', {
        duration: 0,
        id: 'offline-mode',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isAuthenticated, wsContext]);

  return (
    <WebSocketContext.Provider value={wsContext || ''}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook to use WebSocket context
export const useWebSocketContext = (): WebSocketContextValue => {
  const context = React.useContext(WebSocketContext);
  if (!context) {
    throw new Error(
      'useWebSocketContext must be used within WebSocketProvider'
    );
  }
  return context;
};
