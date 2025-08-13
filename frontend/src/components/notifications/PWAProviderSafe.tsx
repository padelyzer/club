'use client';

import React, { createContext, useContext, ReactNode } from 'react';

interface PWAContextValue {
  isInitialized: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  serviceState: any;
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

// Simplified PWA Provider that won&apos;t cause hydration issues
export const PWAProvider: React.FC<PWAProviderProps> = ({
  children,
}) => {
  // Provide a minimal context that won&apos;t cause hydration issues
  const contextValue: PWAContextValue = {
    isInitialized: false,
    isInstalled: false,
    canInstall: false,
    serviceState: { status: 'inactive' },
    initialize: async () => {
      // No-op for now
    },
    install: async () => {
      return false;
    },
    requestPermission: async () => {
      // No-op for now
    },
  };

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = (): PWAContextValue => {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

export const usePWAFeatures = () => {
  return {
    serviceWorker: false,
    notifications: false,
    pushManager: false,
    install: false,
    badging: false,
  };
};

export const AutoInstallPrompt: React.FC = () => {
  return null;
};

export default PWAProvider;