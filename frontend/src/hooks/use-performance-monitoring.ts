import { useEffect, useRef, useCallback } from 'react';
import { monitoring, startMeasure, endMeasure } from '@/lib/monitoring/monitoring';
import { analytics } from '@/lib/monitoring/analytics';

interface PerformanceMetrics {
  renderTime: number;
  updateTime: number;
  effectTime: number;
  totalTime: number;
}

/**
 * Hook for measuring component performance
 */
export function useComponentPerformance(componentName: string) {
  const metrics = useRef<Partial<PerformanceMetrics>>({});
  const renderStart = useRef<number>(0);
  const mountTime = useRef<number>(Date.now());

  // Measure render time
  renderStart.current = performance.now();
  
  useEffect(() => {
    const renderTime = performance.now() - renderStart.current;
    metrics.current.renderTime = renderTime;
    
    // Track slow renders
    if (renderTime > 16.67) { // More than one frame (60fps)
      monitoring.captureMessage(
        `Slow render detected in ${componentName}`,
        'warning',
        { renderTime }
      );
    }
  });

  // Measure mount/unmount time
  useEffect(() => {
    const mountDuration = Date.now() - mountTime.current;
    
    monitoring.addBreadcrumb({
      message: `${componentName} mounted`,
      category: 'performance',
      data: { mountDuration },
    });

    return () => {
      const totalTime = Date.now() - mountTime.current;
      
      analytics.track('component_performance', {
        component: componentName,
        ...metrics.current,
        totalTime,
      });
    };
  }, [componentName]);

  const measureUpdate = useCallback((updateName: string) => {
    const measureKey = `${componentName}.${updateName}`;
    
    return {
      start: () => startMeasure(measureKey),
      end: (metadata?: any) => {
        const result = endMeasure(measureKey, metadata);
        if (result) {
          metrics.current.updateTime = (metrics.current.updateTime || 0) + result.duration;
        }
        return result;
      },
    };
  }, [componentName]);

  const measureEffect = useCallback((effectName: string, effect: () => void | (() => void)) => {
    const measureKey = `${componentName}.effect.${effectName}`;
    
    startMeasure(measureKey);
    const cleanup = effect();
    const result = endMeasure(measureKey);
    
    if (result) {
      metrics.current.effectTime = (metrics.current.effectTime || 0) + result.duration;
    }
    
    return cleanup;
  }, [componentName]);

  return {
    measureUpdate,
    measureEffect,
    metrics: metrics.current,
  };
}

/**
 * Hook for tracking render performance
 */
export function useRenderTracking(componentName: string, props?: Record<string, any>) {
  const renderCount = useRef(0);
  const previousProps = useRef<Record<string, any> | undefined>(props);
  const renderTimes = useRef<number[]>([]);

  useEffect(() => {
    renderCount.current++;
    const now = performance.now();
    renderTimes.current.push(now);
    
    // Keep only last 10 render times
    if (renderTimes.current.length > 10) {
      renderTimes.current.shift();
    }
    
    // Check for excessive re-renders
    if (renderTimes.current.length >= 5) {
      const recentRenders = renderTimes.current.slice(-5);
      const timeSpan = recentRenders[4] - recentRenders[0];
      
      if (timeSpan < 1000) { // 5 renders in less than 1 second
        monitoring.captureMessage(
          `Excessive re-renders detected in ${componentName}`,
          'warning',
          {
            renderCount: renderCount.current,
            timeSpan,
            propsChanged: getChangedProps(previousProps.current, props),
          }
        );
      }
    }
    
    previousProps.current = props;
  });

  return {
    renderCount: renderCount.current,
    lastRenderTime: renderTimes.current[renderTimes.current.length - 1] || 0,
  };
}

/**
 * Hook for lazy loading performance
 */
export function useLazyLoadPerformance(resourceName: string) {
  const loadStart = useRef<number>(0);
  
  const startLoading = useCallback(() => {
    loadStart.current = performance.now();
    startMeasure(`lazy-load.${resourceName}`);
  }, [resourceName]);
  
  const endLoading = useCallback((success: boolean = true) => {
    const result = endMeasure(`lazy-load.${resourceName}`, { success });
    
    if (result) {
      analytics.track('lazy_load_performance', {
        resource: resourceName,
        duration: result.duration,
        success,
      });
      
      // Track slow loads
      if (result.duration > 3000) {
        monitoring.captureMessage(
          `Slow lazy load: ${resourceName}`,
          'warning',
          { duration: result.duration }
        );
      }
    }
  }, [resourceName]);
  
  return {
    startLoading,
    endLoading,
  };
}

/**
 * Hook for API call performance
 */
export function useApiPerformance() {
  const activeCalls = useRef<Map<string, number>>(new Map());
  
  const trackApiCall = useCallback(async <T>(
    callName: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    const callId = `${callName}-${Date.now()}`;
    
    activeCalls.current.set(callId, startTime);
    startMeasure(`api.${callName}`);
    
    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;
      
      endMeasure(`api.${callName}`, { 
        status: 'success',
        duration,
      });
      
      monitoring.trackApiCall({
        url: callName,
        method: 'unknown',
        status: 200,
        duration,
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      endMeasure(`api.${callName}`, { 
        status: 'error',
        duration,
      });
      
      monitoring.trackApiCall({
        url: callName,
        method: 'unknown',
        duration,
        error: error as Error,
      });
      
      throw error;
    } finally {
      activeCalls.current.delete(callId);
    }
  }, []);
  
  const getActiveCalls = useCallback(() => {
    return Array.from(activeCalls.current.entries()).map(([id, startTime]) => ({
      id,
      duration: performance.now() - startTime,
    }));
  }, []);
  
  return {
    trackApiCall,
    getActiveCalls,
    activeCallCount: activeCalls.current.size,
  };
}

// Utility functions
function getChangedProps(
  prevProps?: Record<string, any>,
  nextProps?: Record<string, any>
): string[] {
  if (!prevProps || !nextProps) return [];
  
  const changed: string[] = [];
  const allKeys = new Set([...Object.keys(prevProps), ...Object.keys(nextProps)]);
  
  allKeys.forEach(key => {
    if (prevProps[key] !== nextProps[key]) {
      changed.push(key);
    }
  });
  
  return changed;
}