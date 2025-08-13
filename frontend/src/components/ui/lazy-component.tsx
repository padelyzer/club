'use client';

import { lazy, Suspense, ComponentType } from 'react';
import { LoadingState } from './states/loading-state';

interface LazyComponentOptions {
  fallback?: React.ReactNode;
  delay?: number;
}

export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyComponentOptions = {}
) {
  const { fallback = <LoadingState />, delay = 0 } = options;
  
  const LazyComponent = lazy(async () => {
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    return importFunc();
  });

  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Utility for route-based lazy loading
export function lazyRoute<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  return createLazyComponent(importFunc, {
    fallback: <LoadingState message="Loading page..." />
  });
}

// Utility for heavy components
export function lazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  customFallback?: React.ReactNode
) {
  return createLazyComponent(importFunc, {
    fallback: customFallback || <LoadingState />
  });
}