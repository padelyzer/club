/**
 * Hook for PWA Initialization
 * Handles automatic PWA setup and registration
 */

import { useEffect, useState } from 'react';
import { useNotificationStore } from '@/store/notifications';

interface PWAInitializationConfig {
  enableNotifications?: boolean;
  enableInstallPrompt?: boolean;
  enableOfflineQueue?: boolean;
  enableWebSocketIntegration?: boolean;
  websocketClient?: any;
  installPromptDelay?: number;
}

interface PWAInitializationState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  features: {
    serviceWorker: boolean;
    notifications: boolean;
    pushManager: boolean;
    install: boolean;
    badging: boolean;
  };
}

export const usePWAInitialization = (config: PWAInitializationConfig = {}) => {
  const {
    enableNotifications = true,
    enableInstallPrompt = true,
    enableOfflineQueue = true,
    enableWebSocketIntegration = true,
    websocketClient,
    installPromptDelay = 5000,
  } = config;

  const {
    initializePWA,
    checkInstallability,
    processOfflineQueue,
    pwaInstallationState,
    serviceState,
    permissionStatus,
  } = useNotificationStore();

  const [state, setState] = useState<PWAInitializationState>({
    isInitialized: false,
    isLoading: false,
    error: null,
    features: {
      serviceWorker: false,
      notifications: false,
      pushManager: false,
      install: false,
      badging: false,
    },
  });

  // Check PWA feature support
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setState((prev) => ({
      ...prev,
      features: {
        serviceWorker: 'serviceWorker' in navigator,
        notifications: 'Notification' in window,
        pushManager: 'PushManager' in window,
        install:
          'beforeinstallprompt' in window ||
          window.matchMedia('(display-mode: standalone)').matches,
        badging: 'setAppBadge' in navigator,
      },
    }));
  }, []);

  // Initialize PWA system
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (state.isInitialized || !state.features.serviceWorker) {
        return;
      }

      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        // Initialize PWA core
        await initializePWA();

        // Initialize WebSocket integration if enabled and client provided
        if (enableWebSocketIntegration && websocketClient) {
          const { initializeWebSocketNotifications } = await import(
            '@/lib/notifications'
          );
          await initializeWebSocketNotifications(websocketClient);
        }

        // Check installability
        checkInstallability();

        // Setup service worker update handling
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (
                  newWorker.state === 'installed' &&
                  navigator.serviceWorker.controller
                ) {
                  // New update available
                                    // Could show update prompt here
                }
              });
            }
          });
        }

        if (mounted) {
          setState((prev) => ({
            ...prev,
            isInitialized: true,
            isLoading: false,
          }));
        }
      } catch (error) {
                if (mounted) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error:
              error instanceof Error ? error.message : 'Initialization failed',
          }));
        }
      }
    };

    // Delay initialization slightly to ensure everything is ready
    const timer = setTimeout(initialize, 100);

    return () => {
      clearTimeout(timer);
      mounted = false;
    };
  }, [
    state.features.serviceWorker,
    state.isInitialized,
    initializePWA,
    checkInstallability,
    enableWebSocketIntegration,
    websocketClient,
  ]);

  // Handle offline queue processing
  useEffect(() => {
    if (!enableOfflineQueue || !state.isInitialized) return;

    const handleOnline = () => {
            processOfflineQueue();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        processOfflineQueue();
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.isInitialized, enableOfflineQueue, processOfflineQueue]);

  // Handle install prompt display
  useEffect(() => {
    if (
      !enableInstallPrompt ||
      !state.isInitialized ||
      pwaInstallationState !== 'available'
    ) {
      return;
    }

    const timer = setTimeout(() => {
      // Dispatch custom event for install prompt
      window.dispatchEvent(new CustomEvent('pwa-show-install-prompt'));
    }, installPromptDelay);

    return () => clearTimeout(timer);
  }, [
    enableInstallPrompt,
    state.isInitialized,
    pwaInstallationState,
    installPromptDelay,
  ]);

  // Handle app installation events
  useEffect(() => {
    const handleAppInstalled = () => {
            checkInstallability();
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
      checkInstallability();
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
    };
  }, [checkInstallability]);

  return {
    ...state,
    pwaState: {
      installationState: pwaInstallationState,
      serviceState,
      permissionStatus,
      canInstall: pwaInstallationState === 'available',
      isInstalled: pwaInstallationState === 'installed',
    },
    retry: () => {
      setState((prev) => ({ ...prev, error: null, isInitialized: false }));
    },
  };
};

// Helper hook for PWA install detection
export const usePWAInstallation = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if running in standalone mode
    const checkStandalone = () => {
      const standalone = window.matchMedia(
        '(display-mode: standalone)'
      ).matches;
      setIsStandalone(standalone);
    };

    // Check if app is installed (multiple methods)
    const checkInstalled = () => {
      const installed =
        // iOS Safari
        ('standalone' in window.navigator &&
          (window.navigator as any).standalone) ||
        // Android Chrome
        window.matchMedia('(display-mode: standalone)').matches ||
        // Desktop PWA
        window.matchMedia('(display-mode: window-controls-overlay)').matches;

      setIsInstalled(installed);
    };

    checkStandalone();
    checkInstalled();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => {
      checkStandalone();
      checkInstalled();
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return {
    isInstalled,
    isStandalone,
    isPWA: isInstalled || isStandalone,
  };
};

// Hook for PWA capabilities detection
export const usePWACapabilities = () => {
  const [capabilities, setCapabilities] = useState({
    notifications: false,
    push: false,
    backgroundSync: false,
    badging: false,
    share: false,
    fileHandling: false,
    webShare: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setCapabilities({
      notifications: 'Notification' in window,
      push: 'PushManager' in window,
      backgroundSync:
        'serviceWorker' in navigator &&
        'sync' in window.ServiceWorkerRegistration.prototype,
      badging: 'setAppBadge' in navigator,
      share: 'share' in navigator,
      fileHandling: 'launchQueue' in window,
      webShare: 'canShare' in navigator,
    });
  }, []);

  return capabilities;
};
