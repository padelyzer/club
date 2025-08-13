import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient, useMutation, MutationOptions } from '@tanstack/react-query';
import { useUnifiedStore, useCache, useOptimisticUpdates } from '@/store/unified-store';

interface SyncOptions {
  key: string | string[];
  optimistic?: boolean;
  invalidateOnSuccess?: boolean;
  invalidatePattern?: string;
  cacheTime?: number;
  retryCount?: number;
  onError?: (error: any) => void;
  onSuccess?: (data: any) => void;
}

/**
 * Hook for synchronized data management with optimistic updates
 */
export function useDataSync<TData = any, TError = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: SyncOptions
) {
  const queryClient = useQueryClient();
  const { setCache, getCache, invalidateCache } = useCache();
  const { addOptimisticUpdate, commitOptimisticUpdate, rollbackOptimisticUpdate } = useOptimisticUpdates();
  const updateIdRef = useRef<string>();

  // Create cache key
  const getCacheKey = useCallback((variables?: TVariables) => {
    const baseKey = Array.isArray(options.key) ? options.key.join(':') : options.key;
    return variables ? `${baseKey}:${JSON.stringify(variables)}` : baseKey;
  }, [options.key]);

  // Optimistic update handler
  const handleOptimisticUpdate = useCallback((variables: TVariables, data: any) => {
    const updateId = crypto.randomUUID();
    updateIdRef.current = updateId;

    if (options.optimistic) {
      // Create optimistic update
      const update = (state: any) => {
        // Update React Query cache
        if (Array.isArray(options.key)) {
          queryClient.setQueryData(options.key, data);
        } else {
          queryClient.setQueryData([options.key], data);
        }
        
        // Update local cache
        setCache(getCacheKey(variables), data, options.cacheTime);
      };

      // Create rollback function
      const rollback = (state: any) => {
        // Restore React Query cache
        if (Array.isArray(options.key)) {
          queryClient.invalidateQueries({ queryKey: options.key });
        } else {
          queryClient.invalidateQueries({ queryKey: [options.key] });
        }
        
        // Clear local cache
        invalidateCache(getCacheKey(variables));
      };

      addOptimisticUpdate(updateId, update, rollback);
    }

    return updateId;
  }, [options.optimistic, options.key, options.cacheTime, queryClient, setCache, getCacheKey, invalidateCache, addOptimisticUpdate]);

  // Create mutation
  const mutation = useMutation<TData, TError, TVariables>({
    mutationFn,
    retry: options.retryCount ?? 3,
    onMutate: async (variables) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: Array.isArray(options.key) ? options.key : [options.key] });
      
      // Get current data for rollback
      const previousData = queryClient.getQueryData(Array.isArray(options.key) ? options.key : [options.key]);
      
      // Perform optimistic update if enabled
      if (options.optimistic && variables) {
        handleOptimisticUpdate(variables, variables);
      }
      
      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (options.optimistic && updateIdRef.current) {
        rollbackOptimisticUpdate(updateIdRef.current);
      }
      
      // Restore previous data
      if (context?.previousData) {
        queryClient.setQueryData(
          Array.isArray(options.key) ? options.key : [options.key],
          context.previousData
        );
      }
      
      options.onError?.(error);
    },
    onSuccess: (data, variables) => {
      // Commit optimistic update
      if (options.optimistic && updateIdRef.current) {
        commitOptimisticUpdate(updateIdRef.current);
      }
      
      // Update cache with actual data
      setCache(getCacheKey(variables), data, options.cacheTime);
      
      // Invalidate queries if requested
      if (options.invalidateOnSuccess) {
        if (options.invalidatePattern) {
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              const queryKey = query.queryKey.join(':');
              return new RegExp(options.invalidatePattern!).test(queryKey);
            }
          });
        } else {
          queryClient.invalidateQueries({ 
            queryKey: Array.isArray(options.key) ? options.key : [options.key] 
          });
        }
      }
      
      options.onSuccess?.(data);
    },
    onSettled: () => {
      // Clean up
      updateIdRef.current = undefined;
    },
  });

  return {
    ...mutation,
    getCachedData: useCallback(() => getCache(getCacheKey()), [getCache, getCacheKey]),
    invalidate: useCallback(() => {
      invalidateCache(getCacheKey());
      queryClient.invalidateQueries({ 
        queryKey: Array.isArray(options.key) ? options.key : [options.key] 
      });
    }, [invalidateCache, getCacheKey, queryClient, options.key]),
  };
}

/**
 * Hook for real-time data synchronization
 */
export function useRealtimeSync(channel: string, options?: {
  onMessage?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}) {
  const queryClient = useQueryClient();
  const { addNotification } = useUnifiedStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws/${channel}`);
      
      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        options?.onConnect?.();
        addNotification({
          type: 'success',
          title: 'Connected',
          message: `Connected to ${channel}`,
        });
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Update React Query cache based on message type
          if (data.type === 'update' && data.queryKey) {
            queryClient.setQueryData(data.queryKey, data.payload);
          } else if (data.type === 'invalidate' && data.queryKey) {
            queryClient.invalidateQueries({ queryKey: data.queryKey });
          }
          
          options?.onMessage?.(data);
        } catch (error) {
                  }
      };
      
      ws.onerror = (error) => {
        options?.onError?.(error);
        addNotification({
          type: 'error',
          title: 'Connection Error',
          message: `Failed to connect to ${channel}`,
        });
      };
      
      ws.onclose = () => {
        options?.onDisconnect?.();
        
        // Reconnect with exponential backoff
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };
      
      wsRef.current = ws;
    } catch (error) {
            options?.onError?.(error);
    }
  }, [channel, queryClient, addNotification, options]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
          }
  }, []);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    send,
    disconnect,
    reconnect: connect,
  };
}

/**
 * Hook for batch operations with progress tracking
 */
export function useBatchSync<T>(
  processFn: (item: T) => Promise<any>,
  options?: {
    batchSize?: number;
    onProgress?: (progress: number) => void;
    onComplete?: (results: any[]) => void;
    onError?: (errors: any[]) => void;
  }
) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef<AbortController>();

  const processBatch = useCallback(async (items: T[]) => {
    setIsProcessing(true);
    setProgress(0);
    
    const batchSize = options?.batchSize || 10;
    const results: any[] = [];
    const errors: any[] = [];
    
    abortControllerRef.current = new AbortController();
    
    try {
      for (let i = 0; i < items.length; i += batchSize) {
        if (abortControllerRef.current.signal.aborted) {
          break;
        }
        
        const batch = items.slice(i, i + batchSize);
        const batchPromises = batch.map(item => 
          processFn(item).catch(error => {
            errors.push({ item, error });
            return null;
          })
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter(Boolean));
        
        const currentProgress = Math.round(((i + batch.length) / items.length) * 100);
        setProgress(currentProgress);
        options?.onProgress?.(currentProgress);
      }
      
      if (errors.length > 0) {
        options?.onError?.(errors);
      }
      
      options?.onComplete?.(results);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [processFn, options]);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    processBatch,
    abort,
    isProcessing,
    progress,
  };
}

// Import useState
import { useState } from 'react';