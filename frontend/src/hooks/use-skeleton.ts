import React, { useState, useEffect } from 'react';

interface UseSkeletonOptions {
  delay?: number; // Delay before showing skeleton
  minDuration?: number; // Minimum time to show skeleton
  showOnMount?: boolean; // Show skeleton immediately on mount
}

/**
 * Hook to manage skeleton loading states
 */
export function useSkeleton(
  isLoading: boolean,
  options: UseSkeletonOptions = {}
) {
  const {
    delay = 200, // 200ms delay to prevent flash
    minDuration = 500, // Show for at least 500ms
    showOnMount = true,
  } = options;

  const [showSkeleton, setShowSkeleton] = useState(showOnMount && isLoading);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    let delayTimer: NodeJS.Timeout;
    let minDurationTimer: NodeJS.Timeout;

    if (isLoading) {
      // Start delay timer
      delayTimer = setTimeout(() => {
        setShowSkeleton(true);
        setStartTime(Date.now());
      }, delay);
    } else if (showSkeleton && startTime) {
      // Calculate remaining time to meet minimum duration
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDuration - elapsed);

      if (remaining > 0) {
        minDurationTimer = setTimeout(() => {
          setShowSkeleton(false);
          setStartTime(null);
        }, remaining);
      } else {
        setShowSkeleton(false);
        setStartTime(null);
      }
    } else {
      setShowSkeleton(false);
      setStartTime(null);
    }

    return () => {
      clearTimeout(delayTimer);
      clearTimeout(minDurationTimer);
    };
  }, [isLoading, showSkeleton, startTime, delay, minDuration]);

  return showSkeleton;
}

/**
 * Hook for progressive skeleton loading
 */
export function useProgressiveSkeleton(
  items: any[],
  isLoading: boolean,
  options: {
    batchSize?: number;
    batchDelay?: number;
  } = {}
) {
  const { batchSize = 3, batchDelay = 100 } = options;
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!isLoading || items.length === 0) {
      setVisibleCount(items.length);
      return;
    }

    setVisibleCount(Math.min(batchSize, items.length));

    const timer = setInterval(() => {
      setVisibleCount((prev) => {
        const next = prev + batchSize;
        if (next >= items.length) {
          clearInterval(timer);
          return items.length;
        }
        return next;
      });
    }, batchDelay);

    return () => clearInterval(timer);
  }, [items.length, isLoading, batchSize, batchDelay]);

  return {
    visibleItems: items.slice(0, visibleCount),
    isComplete: visibleCount >= items.length,
  };
}

/**
 * Hook for skeleton with error recovery
 */
export function useSkeletonWithRetry(
  isLoading: boolean,
  error: any,
  retry: () => void,
  options: UseSkeletonOptions = {}
) {
  const showSkeleton = useSkeleton(isLoading, options);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    if (error && retryCount < maxRetries) {
      const timer = setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        retry();
      }, 1000 * Math.pow(2, retryCount)); // Exponential backoff

      return () => clearTimeout(timer);
    }
  }, [error, retryCount, retry, maxRetries]);

  return {
    showSkeleton,
    isRetrying: retryCount > 0 && isLoading,
    retryCount,
    canRetry: retryCount < maxRetries,
  };
}

/**
 * Component wrapper for skeleton loading
 */
export function withSkeleton<P extends object>(
  Component: React.ComponentType<P>,
  SkeletonComponent: React.ComponentType,
  options?: UseSkeletonOptions
): React.ComponentType<P & { isLoading?: boolean }> {
  return function WithSkeletonComponent(props: P & { isLoading?: boolean }) {
    const { isLoading = false, ...componentProps } = props;
    const showSkeleton = useSkeleton(isLoading, options);

    if (showSkeleton) {
      return React.createElement(SkeletonComponent);
    }

    return React.createElement(Component, componentProps as P);
  };
}