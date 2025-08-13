'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useNotificationStore } from '@/store/notifications';
import {
  initializeNotifications,
  initializeWebSocketNotifications,
  notificationService,
} from '@/lib/notifications';
import { NotificationManagerState } from '@/types/notifications';

interface PWAContextValue {
  isInitialized: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  serviceState: NotificationManagerState;
  initialize: () => Promise<void>;
  install: () => Promise<boolean>;
  requestPermission: () => Promise<void>;
}

const PWAContext = createContext<PWAContextValue | undefined>(undefined);

interface PWAProviderProps {
  children: ReactNode;
  websocketClient?: any;
  autoInitialize?: boolean;
  showInstallPrompt?: boolean;
  installPromptDelay?: number;
}

export const PWAProvider: React.FC<PWAProviderProps> = ({
  children,
  websocketClient,
  autoInitialize = true,
  showInstallPrompt = true,
  installPromptDelay = 3000,
}) => {
  const {
    initializePWA,
    installPWA,
    requestPermission,
    pwaInstallationState,
    serviceState,
    checkInstallability,
  } = useNotificationStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(
    null
  );

  useEffect(() => {
    let mounted = true;

    const initializePWASystem = async () => {
      try {
        
        // Initialize PWA notifications
        await initializePWA();

        // Initialize WebSocket integration if client provided
        if (websocketClient) {
          await initializeWebSocketNotifications(websocketClient);
                  }

        // Check if PWA is already installed
        checkInstallability();

        // Register service worker update listener
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.addEventListener('controllerchange', () => {
                        window.location.reload();
          });
        }

        // Listen for app installation events
        window.addEventListener('appinstalled', () => {
                    checkInstallability();
        });

        // Listen for before install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
          e.preventDefault();
          (window as any).deferredPrompt = e;
          checkInstallability();
        });

        if (mounted) {
          setIsInitialized(true);
          setInitializationError(null);
                  }
      } catch (error) {
        // Silently fail - PWA is optional functionality
                if (mounted) {
          setInitializationError(
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }
    };

    if (autoInitialize && typeof window !== 'undefined') {
      // Delay initialization slightly to ensure everything is ready
      const timer = setTimeout(initializePWASystem, 100);
      return () => {
        clearTimeout(timer);
        mounted = false;
      };
    }

    return () => {
      mounted = false;
    };
  }, [autoInitialize, websocketClient, initializePWA, checkInstallability]);

  // Show install prompt after delay if enabled
  useEffect(() => {
    if (
      isInitialized &&
      showInstallPrompt &&
      pwaInstallationState === 'available' &&
      typeof window !== 'undefined'
    ) {
      const timer = setTimeout(() => {
        // Trigger install prompt display
        const event = new CustomEvent('pwa-install-prompt-show');
        window.dispatchEvent(event);
      }, installPromptDelay);

      return () => clearTimeout(timer);
    }
  }, [
    isInitialized,
    pwaInstallationState,
    showInstallPrompt,
    installPromptDelay,
  ]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
            notificationService.processOfflineQueue();
    };

    const handleOffline = () => {
          };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle visibility change to process notifications when app becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isInitialized) {
        // Process any pending notifications when app becomes visible
        notificationService.processOfflineQueue();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isInitialized]);

  const contextValue: PWAContextValue = {
    isInitialized,
    isInstalled: pwaInstallationState === 'installed',
    canInstall: pwaInstallationState === 'available',
    serviceState,
    initialize: async () => {
      await initializePWA();
      setIsInitialized(true);
    },
    install: installPWA,
    requestPermission,
  };

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
      {initializationError && (
        <PWAInitializationError
          error={initializationError}
          onRetry={() => {
            setInitializationError(null);
            contextValue.initialize();
          }}
        />
      )}
    </PWAContext.Provider>
  );
};

// Error display component
const PWAInitializationError: React.FC<{
  error: string;
  onRetry: () => void;
}> = ({ error, onRetry }) => {
  const [showError, setShowError] = useState(true);

  if (!showError) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-red-600 dark:text-red-400">⚠️</div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-900 dark:text-red-100">
              PWA Initialization Failed
            </h4>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
              {error}
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <button
                onClick={onRetry}
                className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => setShowError(false)}
                className="text-xs text-red-600 dark:text-red-400 hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook to use PWA context
export const usePWA = (): PWAContextValue => {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

// Hook to check if PWA features are available
export const usePWAFeatures = () => {
  const [features, setFeatures] = useState({
    serviceWorker: false,
    notifications: false,
    pushManager: false,
    install: false,
    badging: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setFeatures({
      serviceWorker: 'serviceWorker' in navigator,
      notifications: 'Notification' in window,
      pushManager: 'PushManager' in window,
      install:
        'beforeinstallprompt' in window ||
        window.matchMedia('(display-mode: standalone)').matches,
      badging: 'setAppBadge' in navigator,
    });
  }, []);

  return features;
};

// Component to automatically show install prompt
export const AutoInstallPrompt: React.FC = () => {
  const { canInstall } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleShowPrompt = () => {
      if (canInstall) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('pwa-install-prompt-show', handleShowPrompt);
    return () =>
      window.removeEventListener('pwa-install-prompt-show', handleShowPrompt);
  }, [canInstall]);

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-w-sm">
        {/* Dynamically import InstallPrompt to avoid SSR issues */}
        <React.Suspense fallback={<div>Loading...</div>}>
          <LazyInstallPrompt onClose={() => setShowPrompt(false)} />
        </React.Suspense>
      </div>
    </div>
  );
};

// Lazy-loaded install prompt
const LazyInstallPrompt = React.lazy(() =>
  import('./InstallPrompt')
);

export default PWAProvider;
