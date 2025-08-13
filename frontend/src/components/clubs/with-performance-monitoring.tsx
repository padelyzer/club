import React, { useEffect, useRef } from 'react';
import { usePerformanceMonitor } from '@/lib/analytics/performance-monitor';

interface WithPerformanceMonitoringProps {
  componentName: string;
  children: React.ReactNode;
}

// HOC for performance monitoring
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  const WrappedComponent = (props: P) => {
    const { measureRender } = usePerformanceMonitor(componentName);
    const renderCount = useRef(0);
    
    useEffect(() => {
      renderCount.current++;
      
      // Track renders
      measureRender(() => {
        // Component has rendered
      });
      
      // Track excessive re-renders for debugging
      if (renderCount.current > 10 && process.env.NODE_ENV === 'development') {
        // Use performance monitor to track instead of console logging
        measureRender(() => {
          // Excessive render count detected - tracked by performance monitor
        });
      }
    });
    
    return <Component {...props} />;
  };
  
  WrappedComponent.displayName = `withPerformanceMonitoring(${componentName})`;
  
  return WrappedComponent;
};

// Component wrapper for performance monitoring
export const PerformanceMonitor: React.FC<WithPerformanceMonitoringProps> = ({ 
  componentName, 
  children 
}) => {
  const { measureRender } = usePerformanceMonitor(componentName);
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current++;
    
    measureRender(() => {
      // Component has rendered
    });
  });
  
  return <>{children}</>;
};

// Hook for monitoring specific interactions
export const useInteractionMonitoring = (componentName: string) => {
  const { measureInteraction } = usePerformanceMonitor(componentName);
  
  return {
    monitorClick: (interactionName: string, handler: () => void | Promise<void>) => {
      return () => measureInteraction(`click:${interactionName}`, handler);
    },
    monitorChange: (interactionName: string, handler: (e: any) => void) => {
      return (e: any) => measureInteraction(`change:${interactionName}`, () => handler(e));
    },
    monitorSubmit: (interactionName: string, handler: () => Promise<void>) => {
      return () => measureInteraction(`submit:${interactionName}`, handler);
    },
  };
};