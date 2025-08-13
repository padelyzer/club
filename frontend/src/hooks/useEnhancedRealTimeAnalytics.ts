'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRealTimeAnalytics, useFormattedUpdateTime } from './useRealTimeAnalytics';
import { useAnalyticsWebSocket } from '@/lib/analytics/websocket';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { useAuthStore } from '@/store/auth';
import { useActiveClub } from '@/store/clubs';

interface EnhancedRealTimeOptions {
  enabled?: boolean;
  useWebSocket?: boolean;
  usePolling?: boolean;
  pollingInterval?: number;
  wsChannels?: string[];
}

/**
 * Enhanced hook that combines WebSocket real-time updates with polling fallback
 * Provides comprehensive analytics real-time functionality
 */
export function useEnhancedRealTimeAnalytics(options: EnhancedRealTimeOptions = {}) {
  const {
    enabled = true,
    useWebSocket = true,
    usePolling = true,
    pollingInterval = 300000, // 5 minutes
    wsChannels = ['bi_kpis', 'bi_revenue', 'bi_usage', 'bi_growth'],
  } = options;

  const { user, role } = useAuthStore();
  const { activeClub } = useActiveClub();
  const {
    setRealtimeData,
    updateRealtimeMetric,
    mergeRealtimeData,
    enableRealtimeMode,
    disableRealtimeMode,
    setRealtimeConnected,
    isRealtimeEnabled,
    realtimeConnected,
  } = useAnalyticsStore();

  // Polling-based real-time (fallback)
  const pollingAnalytics = useRealTimeAnalytics({
    enabled: enabled && usePolling && (!useWebSocket || !realtimeConnected),
    refreshInterval: pollingInterval,
  });

  // WebSocket-based real-time
  const wsAnalytics = useAnalyticsWebSocket({
    enabled: enabled && useWebSocket,
    channels: wsChannels,
  });

  // Connection status tracking
  const [connectionHealth, setConnectionHealth] = useState({
    primary: 'websocket' as 'websocket' | 'polling',
    wsStatus: 'disconnected' as 'connecting' | 'connected' | 'disconnected' | 'error',
    pollingStatus: 'inactive' as 'active' | 'inactive' | 'error',
    lastDataReceived: null as Date | null,
    alertsCount: 0,
  });

  // Handle WebSocket messages
  useEffect(() => {
    if (!wsAnalytics.isConnected) return;

    const handleBIKpis = (data: any) => {
      console.log('📊 Real-time KPIs update:', data);
      setRealtimeData('kpis', data);
      setConnectionHealth(prev => ({
        ...prev,
        lastDataReceived: new Date(),
      }));
    };

    const handleBIRevenue = (data: any) => {
      console.log('💰 Real-time Revenue update:', data);
      setRealtimeData('revenue', data);
      setConnectionHealth(prev => ({
        ...prev,
        lastDataReceived: new Date(),
      }));
    };

    const handleBIUsage = (data: any) => {
      console.log('🏟️ Real-time Usage update:', data);
      setRealtimeData('occupancy', data);
      setConnectionHealth(prev => ({
        ...prev,
        lastDataReceived: new Date(),
      }));
    };

    const handleBIGrowth = (data: any) => {
      console.log('📈 Real-time Growth update:', data);
      setRealtimeData('growth', data);
      setConnectionHealth(prev => ({
        ...prev,
        lastDataReceived: new Date(),
      }));
    };

    const handleBIAlert = (data: any) => {
      console.warn('⚠️ Analytics Alert:', data);
      setConnectionHealth(prev => ({
        ...prev,
        alertsCount: prev.alertsCount + 1,
        lastDataReceived: new Date(),
      }));
      
      // Here you could trigger toast notifications or other alert mechanisms
      // toast.warning(data.message, { action: { label: 'View', onClick: () => {} } });
    };

    // Add WebSocket message handlers
    wsAnalytics.addMessageHandler('bi_kpis', handleBIKpis);
    wsAnalytics.addMessageHandler('bi_revenue', handleBIRevenue);
    wsAnalytics.addMessageHandler('bi_usage', handleBIUsage);
    wsAnalytics.addMessageHandler('bi_growth', handleBIGrowth);
    wsAnalytics.addMessageHandler('bi_alert', handleBIAlert);

    return () => {
      wsAnalytics.removeMessageHandler('bi_kpis', handleBIKpis);
      wsAnalytics.removeMessageHandler('bi_revenue', handleBIRevenue);
      wsAnalytics.removeMessageHandler('bi_usage', handleBIUsage);
      wsAnalytics.removeMessageHandler('bi_growth', handleBIGrowth);
      wsAnalytics.removeMessageHandler('bi_alert', handleBIAlert);
    };
  }, [wsAnalytics.isConnected, setRealtimeData]);

  // Update connection status
  useEffect(() => {
    setRealtimeConnected(wsAnalytics.isConnected);
    
    setConnectionHealth(prev => ({
      ...prev,
      wsStatus: wsAnalytics.connectionState === 'connected' ? 'connected' :
                wsAnalytics.connectionState === 'connecting' ? 'connecting' :
                wsAnalytics.connectionState === 'disconnected' ? 'disconnected' : 'error',
      pollingStatus: pollingAnalytics.isAutoRefreshEnabled ? 'active' : 'inactive',
      primary: wsAnalytics.isConnected ? 'websocket' : 'polling',
    }));
  }, [
    wsAnalytics.isConnected,
    wsAnalytics.connectionState,
    pollingAnalytics.isAutoRefreshEnabled,
    setRealtimeConnected,
  ]);

  // Enable/disable real-time mode based on options
  useEffect(() => {
    if (enabled) {
      enableRealtimeMode();
    } else {
      disableRealtimeMode();
    }
  }, [enabled, enableRealtimeMode, disableRealtimeMode]);

  // Manual refresh that works with both systems
  const forceRefresh = useCallback(async () => {
    try {
      // Always use polling refresh as it's more reliable
      await pollingAnalytics.refreshData();
      
      // If WebSocket is connected, also request fresh data
      if (wsAnalytics.isConnected && wsAnalytics.send) {
        wsAnalytics.send({
          type: 'refresh_request',
          channels: wsChannels,
          club_id: activeClub?.id,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Failed to force refresh analytics:', error);
      throw error;
    }
  }, [pollingAnalytics, wsAnalytics, wsChannels, activeClub?.id]);

  // Subscribe to additional metrics
  const subscribeToMetric = useCallback((metric: string) => {
    if (wsAnalytics.isConnected && wsAnalytics.subscribeToChannel) {
      wsAnalytics.subscribeToChannel(`bi_${metric}`);
    }
  }, [wsAnalytics]);

  // Unsubscribe from metrics
  const unsubscribeFromMetric = useCallback((metric: string) => {
    if (wsAnalytics.isConnected && wsAnalytics.unsubscribeFromChannel) {
      wsAnalytics.unsubscribeFromChannel(`bi_${metric}`);
    }
  }, [wsAnalytics]);

  // Clear alerts
  const clearAlerts = useCallback(() => {
    setConnectionHealth(prev => ({
      ...prev,
      alertsCount: 0,
    }));
  }, []);

  // Get comprehensive status
  const getStatus = useCallback(() => {
    const timeSinceLastData = connectionHealth.lastDataReceived
      ? Math.floor((Date.now() - connectionHealth.lastDataReceived.getTime()) / 1000)
      : null;

    return {
      isEnabled: enabled,
      isConnected: wsAnalytics.isConnected || pollingAnalytics.isConnected,
      isPrimaryWebSocket: connectionHealth.primary === 'websocket',
      isPollingFallback: connectionHealth.primary === 'polling',
      connectionHealth,
      timeSinceLastData,
      formattedLastUpdate: useFormattedUpdateTime(timeSinceLastData),
      isStale: timeSinceLastData ? timeSinceLastData > pollingInterval / 1000 * 1.5 : false,
      hasAlerts: connectionHealth.alertsCount > 0,
      
      // Detailed status
      websocket: {
        connected: wsAnalytics.isConnected,
        status: wsAnalytics.connectionState,
        reconnectCount: wsAnalytics.reconnectCount,
      },
      polling: {
        enabled: pollingAnalytics.isAutoRefreshEnabled,
        refreshing: pollingAnalytics.isRefreshing,
        hasError: pollingAnalytics.hasError,
        retryCount: pollingAnalytics.retryCount,
        timeSinceLastUpdate: pollingAnalytics.timeSinceLastUpdate,
      },
    };
  }, [
    enabled,
    wsAnalytics,
    pollingAnalytics,
    connectionHealth,
    pollingInterval,
  ]);

  return {
    // Status
    ...getStatus(),
    
    // Actions
    forceRefresh,
    subscribeToMetric,
    unsubscribeFromMetric,
    clearAlerts,
    
    // Individual system access (for advanced use)
    websocket: wsAnalytics,
    polling: pollingAnalytics,
    
    // Store integration
    updateMetric: updateRealtimeMetric,
    mergeData: mergeRealtimeData,
  };
}