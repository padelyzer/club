'use client';

import React, { useEffect, useState } from 'react';
import { useUIStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNavigation } from './MobileNavigation';
import { Modal } from './Modal';
import { NotificationCenter } from './NotificationCenter';
import { OnboardingFlow } from './OnboardingFlow';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { OfflineIndicator } from '../ui/offline-indicator';
import { AccessibilityAudit } from '../ui/accessibility-audit';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { sidebarCollapsed, isMobile, setIsMobile, activeModal, theme } =
    useUIStore();

  const { isAuthenticated, user } = useAuthStore();
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  // Theme application
  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';
      root.setAttribute('data-theme', systemTheme);
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.setAttribute('data-theme', theme);
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  // Check for first visit to show onboarding
  useEffect(() => {
    if (isAuthenticated && user) {
      const hasSeenOnboarding = localStorage.getItem(`onboarding-${user.id}`);
      setIsFirstVisit(!hasSeenOnboarding);
    }
  }, [isAuthenticated, user]);

  // Keyboard navigation setup
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Global keyboard shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '/':
            event.preventDefault();
            // Focus search (implement later)
            break;
          case 'k':
            event.preventDefault();
            // Open command palette (implement later)
            break;
          case 'b':
            event.preventDefault();
            if (!isMobile) {
              useUIStore.getState().toggleSidebar();
            }
            break;
        }
      }

      // Escape key handling
      if (event.key === 'Escape') {
        if (activeModal) {
          useUIStore.getState().closeModal();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, isMobile]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ErrorBoundary>
        {/* Desktop Layout */}
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          {!isMobile && (
            <div
              className={cn(
                'relative z-30 flex-shrink-0 transition-all duration-300 ease-in-out',
                sidebarCollapsed ? 'w-16' : 'w-64'
              )}
            >
              <Sidebar />
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Top Bar */}
            <TopBar />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden bg-white dark:bg-gray-900">
              <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
                {children}
              </div>
            </main>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobile && <MobileNavigation />}

        {/* Modal System */}
        {activeModal && <Modal />}

        {/* Notification Center */}
        <NotificationCenter />

        {/* Onboarding Flow */}
        {isFirstVisit && <OnboardingFlow />}

        {/* Offline Indicator */}
        <OfflineIndicator showDetails />

        {/* Accessibility Audit (Development Only) */}
        <AccessibilityAudit />
      </ErrorBoundary>
    </div>
  );
};

// HOC for pages that need authentication
export const withAppLayout = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return function WrappedComponent(props: P) {
    return (
      <AppLayout>
        <Component {...props} />
      </AppLayout>
    );
  };
};
