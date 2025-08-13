import { useEffect, useRef, useCallback } from 'react';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { useAuthStore } from '@/store/auth';
import { useActiveClub } from '@/store/clubs';

interface UseRealTimeAnalyticsOptions {
  enabled?: boolean;
  refreshInterval?: number; // milliseconds
  maxRetries?: number;
  retryDelay?: number; // milliseconds
}

/**
 * Hook for real-time analytics data fetching
 * Provides auto-refresh functionality with error handling and retry logic
 */
export function useRealTimeAnalytics({
  enabled = true,
  refreshInterval = 300000, // 5 minutes
  maxRetries = 3,
  retryDelay = 1000 // 1 second
}: UseRealTimeAnalyticsOptions = {}) {
  const { user, role } = useAuthStore();
  const { activeClub } = useActiveClub();
  const { refreshBIMetrics, biFetching, error, biLastUpdate } = useAnalyticsStore();
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get context-specific clubs filter
  const getClubsFilter = useCallback(() => {
    if (role === 'ROOT') return undefined; // Root sees all
    if (activeClub) return [activeClub.id];
    return undefined;
  }, [role, activeClub]);

  // Refresh data function
  const refreshData = useCallback(async () => {
    if (!user || biFetching) return;

    try {
      const clubsFilter = getClubsFilter();
      await refreshBIMetrics(clubsFilter);
      retryCountRef.current = 0; // Reset retry count on success
    } catch (error) {
      console.error('Real-time analytics refresh failed:', error);
      
      // Implement retry logic
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        retryTimeoutRef.current = setTimeout(() => {
          refreshData();
        }, retryDelay * retryCountRef.current); // Exponential backoff
      }
    }
  }, [user, biFetching, getClubsFilter, refreshBIMetrics, maxRetries, retryDelay]);

  // Start/stop auto-refresh
  const startAutoRefresh = useCallback(() => {
    if (intervalRef.current) return; // Already started
    
    intervalRef.current = setInterval(refreshData, refreshInterval);
  }, [refreshData, refreshInterval]);

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Manual refresh function
  const manualRefresh = useCallback(() => {
    stopAutoRefresh();
    refreshData().then(() => {
      if (enabled) {
        startAutoRefresh();
      }
    });
  }, [refreshData, enabled, startAutoRefresh, stopAutoRefresh]);

  // Effect to manage auto-refresh lifecycle
  useEffect(() => {
    if (enabled && user) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }

    return () => {
      stopAutoRefresh();
    };
  }, [enabled, user, startAutoRefresh, stopAutoRefresh]);

  // Effect to handle tab visibility change (pause/resume when tab is hidden/visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAutoRefresh();
      } else if (enabled && user) {
        startAutoRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, user, startAutoRefresh, stopAutoRefresh]);

  // Calculate time since last update
  const timeSinceLastUpdate = biLastUpdate 
    ? Math.floor((Date.now() - new Date(biLastUpdate).getTime()) / 1000)
    : null;

  const isStale = timeSinceLastUpdate ? timeSinceLastUpdate > refreshInterval / 1000 : false;

  return {
    isAutoRefreshEnabled: enabled && !!intervalRef.current,
    isRefreshing: biFetching,
    hasError: !!error,
    error,
    timeSinceLastUpdate,
    isStale,
    retryCount: retryCountRef.current,
    maxRetries,
    refreshData: manualRefresh,
    startAutoRefresh,
    stopAutoRefresh,
    // Status indicators
    isConnected: !error && timeSinceLastUpdate !== null,
    connectionStatus: error 
      ? 'error' 
      : biFetching 
        ? 'refreshing' 
        : isStale 
          ? 'stale' 
          : 'connected'
  };
}

/**
 * Hook for formatting time since last update
 */
export function useFormattedUpdateTime(seconds: number | null) {
  if (seconds === null) return 'Never';
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}