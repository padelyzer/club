import React, { memo, forwardRef, ComponentType } from 'react';
import { usePerformanceMonitor } from '@/hooks/use-performance';

interface WithPerformanceOptions {
  enableMemo?: boolean;
  compareProps?: (prevProps: any, nextProps: any) => boolean;
  trackRenders?: boolean;
  warnThreshold?: number; // milliseconds
}

/**
 * HOC that adds performance optimizations to components
 */
export function withPerformance<P extends object>(
  Component: ComponentType<P>,
  options: WithPerformanceOptions = {}
) {
  const {
    enableMemo = true,
    compareProps,
    trackRenders = process.env.NODE_ENV === 'development',
    warnThreshold = 16, // 60fps = 16ms per frame
  } = options;

  const displayName = Component.displayName || Component.name || 'Component';

  // Create wrapped component
  const WrappedComponent = forwardRef<any, P>((props, ref) => {
    const monitor = trackRenders ? usePerformanceMonitor(displayName) : null;

    if (trackRenders && monitor) {
      monitor.measureStart();
    }

    const element = <Component {...props} ref={ref} />;

    if (trackRenders && monitor) {
      const renderTime = monitor.measureEnd('render');
      if (renderTime > warnThreshold) {
        }ms`
        );
      }
    }

    return element;
  });

  WrappedComponent.displayName = `withPerformance(${displayName})`;

  // Apply memo if enabled
  if (enableMemo) {
    return memo(WrappedComponent, compareProps) as ComponentType<P>;
  }

  return WrappedComponent as ComponentType<P>;
}

/**
 * Custom comparison function for shallow prop comparison
 */
export function shallowCompare(prevProps: any, nextProps: any): boolean {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of prevKeys) {
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Custom comparison that ignores functions
 */
export function compareIgnoreFunctions(prevProps: any, nextProps: any): boolean {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of prevKeys) {
    const prevValue = prevProps[key];
    const nextValue = nextProps[key];

    // Skip function comparison
    if (typeof prevValue === 'function' && typeof nextValue === 'function') {
      continue;
    }

    if (prevValue !== nextValue) {
      return false;
    }
  }

  return true;
}

/**
 * Memoized component wrapper with custom comparison
 */
export function MemoizedComponent<P extends object>({
  component: Component,
  props,
  compare,
}: {
  component: ComponentType<P>;
  props: P;
  compare?: (prevProps: P, nextProps: P) => boolean;
}) {
  const MemoComponent = memo(Component, compare);
  return <MemoComponent {...props} />;
}