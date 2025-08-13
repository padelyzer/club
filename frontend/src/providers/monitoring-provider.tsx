'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { analytics } from '@/lib/monitoring/analytics';
import { monitoring } from '@/lib/monitoring/monitoring';
import { useAuth } from '@/lib/api/hooks/useAuth';

interface MonitoringProviderProps {
  children: React.ReactNode;
  config?: {
    googleAnalyticsId?: string;
    sentryDsn?: string;
    customEndpoint?: string;
    environment?: string;
  };
}

export function MonitoringProvider({ children, config }: MonitoringProviderProps) {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // Initialize analytics
    analytics.initialize({
      googleAnalytics: config?.googleAnalyticsId 
        ? { measurementId: config.googleAnalyticsId }
        : undefined,
      customAnalytics: config?.customEndpoint
        ? { endpoint: config.customEndpoint }
        : undefined,
    });

    // Initialize monitoring
    monitoring.initialize({
      sentry: config?.sentryDsn
        ? {
            dsn: config.sentryDsn,
            environment: config?.environment || process.env.NODE_ENV,
            tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
          }
        : undefined,
      logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
      captureConsoleErrors: process.env.NODE_ENV === 'production',
      captureUnhandledRejections: true,
    });
  }, [config]);

  // Track user identification
  useEffect(() => {
    if (isAuthenticated && user) {
      // Set user context
      monitoring.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      });

      // Identify in analytics
      analytics.identify(user.id, {
        email: user.email,
        role: user.role,
        clubId: user.club_id,
      });
    } else {
      monitoring.clearUser();
    }
  }, [isAuthenticated, user]);

  // Track navigation
  useEffect(() => {
    monitoring.addBreadcrumb({
      message: `Navigated to ${pathname}`,
      category: 'navigation',
      level: 'info',
    });
  }, [pathname]);

  // Track performance metrics on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Track page load performance
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (perfData) {
        analytics.track('page_performance', {
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
          domInteractive: perfData.domInteractive - perfData.fetchStart,
          timeToFirstByte: perfData.responseStart - perfData.requestStart,
        });
      }
    });

    // Track resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target && (event.target as any).tagName) {
        const target = event.target as HTMLElement;
        monitoring.captureMessage(
          `Resource loading error: ${target.tagName}`,
          'error',
          {
            src: (target as any).src || (target as any).href,
            type: target.tagName.toLowerCase(),
          }
        );
      }
    }, true);
  }, []);

  return <>{children}</>;
}

// Hook for tracking component analytics
export function useComponentAnalytics(componentName: string) {
  useEffect(() => {
    const startTime = Date.now();
    
    monitoring.addBreadcrumb({
      message: `${componentName} mounted`,
      category: 'component',
      level: 'debug',
    });

    return () => {
      const duration = Date.now() - startTime;
      
      analytics.track('component_lifecycle', {
        component: componentName,
        action: 'unmount',
        duration,
      });
    };
  }, [componentName]);

  const trackAction = (action: string, properties?: Record<string, any>) => {
    analytics.track('component_action', {
      component: componentName,
      action,
      ...properties,
    });
  };

  const trackError = (error: Error, context?: any) => {
    monitoring.captureException(error, {
      component: componentName,
      ...context,
    });
  };

  return {
    trackAction,
    trackError,
  };
}

// Hook for tracking feature usage
export function useFeatureTracking(featureName: string) {
  useEffect(() => {
    analytics.track('feature_viewed', {
      feature: featureName,
      timestamp: Date.now(),
    });
  }, [featureName]);

  const trackUsage = (action: string, metadata?: Record<string, any>) => {
    analytics.track('feature_used', {
      feature: featureName,
      action,
      ...metadata,
    });
  };

  return { trackUsage };
}

// Hook for tracking user interactions
export function useInteractionTracking() {
  const trackClick = (elementName: string, metadata?: Record<string, any>) => {
    analytics.track('element_clicked', {
      element: elementName,
      ...metadata,
    });
  };

  const trackFormSubmit = (formName: string, success: boolean, metadata?: Record<string, any>) => {
    analytics.track('form_submitted', {
      form: formName,
      success,
      ...metadata,
    });
  };

  const trackSearch = (query: string, resultCount: number, metadata?: Record<string, any>) => {
    analytics.track('search_performed', {
      query,
      resultCount,
      ...metadata,
    });
  };

  return {
    trackClick,
    trackFormSubmit,
    trackSearch,
  };
}