import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useInView } from 'react-intersection-observer';

/**
 * Performance optimization hooks
 */

// Debounce hook for expensive operations
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle hook for frequent updates
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastUpdated = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdated.current >= interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - (now - lastUpdated.current));

      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
}

// Memoized callback with dependencies
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps);
}

// Virtual list hook for large lists
export function useVirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = useMemo(
    () => Math.max(0, Math.floor(scrollTop / itemHeight) - overscan),
    [scrollTop, itemHeight, overscan]
  );

  const endIndex = useMemo(
    () =>
      Math.min(
        items.length - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
      ),
    [scrollTop, containerHeight, itemHeight, overscan, items.length]
  );

  const visibleItems = useMemo(
    () => items.slice(startIndex, endIndex + 1),
    [items, startIndex, endIndex]
  );

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    },
  };
}

// Lazy load hook with intersection observer
export function useLazyLoad(options?: IntersectionObserverInit) {
  const { ref, inView, entry } = useInView({
    threshold: 0.1,
    triggerOnce: true,
    ...options,
  });

  return { ref, isVisible: inView, entry };
}

// Performance monitor hook
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const renderStartTime = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTime.current;

    if (process.env.NODE_ENV === 'development') {
      if (renderTime > 16) {
        }ms to render (count: ${renderCount.current})`
        );
      }
    }

    renderStartTime.current = performance.now();
  });

  return {
    renderCount: renderCount.current,
    measureStart: () => {
      renderStartTime.current = performance.now();
    },
    measureEnd: (label: string) => {
      const duration = performance.now() - renderStartTime.current;
      if (process.env.NODE_ENV === 'development' && duration > 10) {
        }ms`);
      }
      return duration;
    },
  };
}

// Batch updates hook
export function useBatchUpdates<T>(
  batchSize: number = 10,
  delay: number = 100
) {
  const queue = useRef<T[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const processBatch = useCallback((callback: (items: T[]) => void) => {
    if (queue.current.length > 0) {
      const batch = queue.current.splice(0, batchSize);
      callback(batch);
    }
  }, [batchSize]);

  const addToQueue = useCallback((item: T, callback: (items: T[]) => void) => {
    queue.current.push(item);

    if (queue.current.length >= batchSize) {
      processBatch(callback);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        processBatch(callback);
      }, delay);
    }
  }, [batchSize, delay, processBatch]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { addToQueue, processBatch };
}

// Import useState
import { useState } from 'react';