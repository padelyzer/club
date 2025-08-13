'use client';

import { useState, useEffect, useCallback } from 'react';
import OfflineManager from '@/lib/offline/offline-manager';
import { useFavoritesStore } from '@/lib/stores/favorites-store';

/**
 * Offline Hook
 * Provides offline capabilities and sync management
 */

interface OfflineState {
  isOnline: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  syncQueueLength: number;
  lastSyncTime: number | null;
  cacheInfo: {
    size: number;
    items: number;
  } | null;
  error: string | null;
}

export const useOffline = () => {
  const [state, setState] = useState<OfflineState>({
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    isLoading: true,
    isSyncing: false,
    syncQueueLength: 0,
    lastSyncTime: null,
    cacheInfo: null,
    error: null
  });

  const offlineManager = OfflineManager.getInstance();
  const { favoriteClubIds, customLists } = useFavoritesStore();

  // Initialize and setup listeners
  useEffect(() => {
    const updateConnectionStatus = (isOnline: boolean) => {
      setState(prev => ({ ...prev, isOnline }));
    };

    const initializeOffline = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        // Setup connectivity listener
        offlineManager.addConnectivityListener(updateConnectionStatus);

        // Load initial data
        const [lastSyncTime, cacheInfo, syncQueueLength] = await Promise.all([
          offlineManager.getMetadata('lastFullSync'),
          offlineManager.getCacheSize(),
          Promise.resolve(offlineManager.getSyncQueueLength())
        ]);

        setState(prev => ({
          ...prev,
          isOnline: offlineManager.getConnectionStatus(),
          lastSyncTime,
          cacheInfo,
          syncQueueLength,
          isLoading: false
        }));

        // Auto-sync if data is stale and we're online
        if (offlineManager.getConnectionStatus()) {
          const isStale = await offlineManager.isDataStale();
          if (isStale) {
            await syncData();
          }
        }
      } catch (error) {
                setState(prev => ({
          ...prev,
          error: 'Failed to initialize offline capabilities',
          isLoading: false
        }));
      }
    };

    initializeOffline();

    // Cleanup listener on unmount
    return () => {
      offlineManager.removeConnectivityListener(updateConnectionStatus);
    };
  }, []);

  // Sync favorites and lists when they change
  useEffect(() => {
    const syncUserData = async () => {
      try {
        await Promise.all([
          offlineManager.storeFavorites(favoriteClubIds),
          offlineManager.storeCustomLists(customLists)
        ]);
        
        // Update cache info
        const cacheInfo = await offlineManager.getCacheSize();
        setState(prev => ({ ...prev, cacheInfo }));
      } catch (error) {
              }
    };

    if (!state.isLoading) {
      syncUserData();
    }
  }, [favoriteClubIds, customLists, state.isLoading]);

  // Sync all data
  const syncData = useCallback(async () => {
    if (state.isSyncing) return;

    setState(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      await offlineManager.syncAllData();
      
      const [lastSyncTime, cacheInfo, syncQueueLength] = await Promise.all([
        offlineManager.getMetadata('lastFullSync'),
        offlineManager.getCacheSize(),
        Promise.resolve(offlineManager.getSyncQueueLength())
      ]);

      setState(prev => ({
        ...prev,
        lastSyncTime,
        cacheInfo,
        syncQueueLength,
        isSyncing: false
      }));
    } catch (error) {
            setState(prev => ({
        ...prev,
        error: 'Sync failed. Will retry automatically.',
        isSyncing: false
      }));
    }
  }, [state.isSyncing]);

  // Clear cache
  const clearCache = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await offlineManager.clearCache();
      
      const cacheInfo = await offlineManager.getCacheSize();
      setState(prev => ({
        ...prev,
        cacheInfo,
        syncQueueLength: 0,
        lastSyncTime: null,
        isLoading: false
      }));
    } catch (error) {
            setState(prev => ({
        ...prev,
        error: 'Failed to clear cache',
        isLoading: false
      }));
    }
  }, []);

  // Get offline data
  const getOfflineClubs = useCallback(async () => {
    try {
      return await offlineManager.getStoredClubs();
    } catch (error) {
            return [];
    }
  }, []);

  const getOfflineFavorites = useCallback(async () => {
    try {
      return await offlineManager.getStoredFavorites();
    } catch (error) {
            return [];
    }
  }, []);

  const getOfflineCustomLists = useCallback(async () => {
    try {
      return await offlineManager.getStoredCustomLists();
    } catch (error) {
            return [];
    }
  }, []);

  // Queue offline actions
  const queueFavoriteAction = useCallback(async (clubId: string, action: 'add' | 'remove') => {
    try {
      await offlineManager.addToSyncQueue({
        type: action === 'add' ? 'create' : 'delete',
        resource: 'favorite',
        data: { clubId }
      });

      setState(prev => ({
        ...prev,
        syncQueueLength: offlineManager.getSyncQueueLength()
      }));
    } catch (error) {
          }
  }, []);

  const queueListAction = useCallback(async (list: any, action: 'create' | 'update' | 'delete') => {
    try {
      await offlineManager.addToSyncQueue({
        type: action,
        resource: 'list',
        data: list
      });

      setState(prev => ({
        ...prev,
        syncQueueLength: offlineManager.getSyncQueueLength()
      }));
    } catch (error) {
          }
  }, []);

  return {
    // State
    ...state,
    cacheSize: state.cacheInfo,
    
    // Actions
    syncData,
    clearCache,
    syncAllData: syncData,
    
    // Data access
    getOfflineClubs,
    getOfflineFavorites,
    getOfflineCustomLists,
    getStoredClubs: getOfflineClubs,
    getStoredFavorites: getOfflineFavorites,
    
    // Storage actions
    storeClubs: useCallback(async (clubs: any[]) => {
      await offlineManager.storeClubs(clubs);
      const cacheInfo = await offlineManager.getCacheSize();
      setState(prev => ({ ...prev, cacheInfo }));
    }, []),
    storeFavorites: useCallback(async (favorites: string[]) => {
      await offlineManager.storeFavorites(favorites);
      const cacheInfo = await offlineManager.getCacheSize();
      setState(prev => ({ ...prev, cacheInfo }));
    }, []),
    getCacheSize: useCallback(async () => {
      return await offlineManager.getCacheSize();
    }, []),
    
    // Queue actions
    queueFavoriteAction,
    queueListAction,
    
    // Utilities
    isDataStale: useCallback(async (maxAge?: number) => {
      return await offlineManager.isDataStale(maxAge);
    }, []),
  };
};

/**
 * Simplified offline status hook
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  return isOnline;
};