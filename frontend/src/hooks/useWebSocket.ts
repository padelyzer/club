import { useEffect, useRef, useCallback, useState } from 'react';
import { getWebSocketClient } from '@/lib/websocket/client';
import {
  WebSocketMessage,
  WebSocketState,
  WebSocketError,
  WebSocketSubscription,
  WebSocketContextValue,
} from '@/types/websocket';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  debug?: boolean;
  onStateChange?: (state: WebSocketState) => void;
  onError?: (error: WebSocketError) => void;
}

export function useWebSocket(
  options: UseWebSocketOptions = {}
): WebSocketContextValue {
  const { autoConnect = true, debug = false, onStateChange, onError } = options;

  const [state, setState] = useState<WebSocketState>('disconnected');
  const [error, setError] = useState<WebSocketError | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const clientRef = useRef(
    getWebSocketClient({
      debug: false, // Force disable debug
      autoReconnect: false, // Disable reconnect
      enableHeartbeat: false, // Disable heartbeat
      onStateChange: (newState) => {
        // Do nothing - WebSocket is disabled
      },
      onError: (err) => {
        // Do nothing - WebSocket is disabled
      },
    })
  );

  useEffect(() => {
    const client = clientRef.current;

    if (autoConnect) {
      client.connect();
    }

    return () => {
      // Don't disconnect on unmount - let the provider handle it
    };
  }, [autoConnect]);

  const subscribe = useCallback(
    (subscription: Omit<WebSocketSubscription, 'id'>): (() => void) => {
      return clientRef.current.subscribe(subscription);
    },
    []
  );

  const send = useCallback(
    (message: Omit<WebSocketMessage, 'id' | 'timestamp'>): void => {
      clientRef.current.send(message);
    },
    []
  );

  const connect = useCallback((): void => {
    clientRef.current.connect();
  }, []);

  const disconnect = useCallback((): void => {
    clientRef.current.disconnect();
  }, []);

  const getConnectionInfo = useCallback(() => {
    return clientRef.current.getConnectionInfo();
  }, []);

  return {
    state,
    isConnected,
    error,
    subscribe,
    send,
    connect,
    disconnect,
    getConnectionInfo,
  };
}

// Hook for subscribing to specific message types
export function useWebSocketSubscription<T = any>(
  messageTypes: WebSocketMessage['type'] | WebSocketMessage['type'][],
  handler: (message: WebSocketMessage<T>) => void,
  deps: React.DependencyList = []
) {
  const { subscribe } = useWebSocket({ autoConnect: false });

  useEffect(() => {
    const unsubscribe = subscribe({
      type: messageTypes,
      handler: handler as (message: WebSocketMessage) => void,
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// Hook for real-time data synchronization
export function useWebSocketSync<T>(
  messageType: WebSocketMessage['type'],
  initialData: T,
  reducer: (data: T, message: WebSocketMessage) => T
): T {
  const [data, setData] = useState<T>(initialData);

  useWebSocketSubscription(
    messageType,
    (message) => {
      setData((prevData) => reducer(prevData, message));
    },
    [messageType, reducer]
  );

  return data;
}
