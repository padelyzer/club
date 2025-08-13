'use client';

import React, { useRef, useCallback } from 'react';
import { useDrag, useGesture } from '@use-gesture/react';
import { useSpring, animated } from '@react-spring/web';
import { useUIStore } from '@/store/ui';
import { cn } from '@/lib/utils';

interface SwipeToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  disabled?: boolean;
  className?: string;
}

export const SwipeToRefresh: React.FC<SwipeToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 80,
  disabled = false,
  className,
}) => {
  const { isSwipeGestureActive, setSwipeGestureActive } = useUIStore();
  const isRefreshing = useRef(false);

  const [{ y }, api] = useSpring(() => ({ y: 0 }));

  const bind = useDrag(
    async ({ down, movement: [, my], velocity: [, vy], direction: [, dy] }) => {
      if (disabled || isRefreshing.current) return;

      // Only allow pull down when at top of scroll
      const isAtTop = window.scrollY === 0;
      if (!isAtTop && my > 0) return;

      if (down && my > 0) {
        setSwipeGestureActive(true);
        // Apply rubber band effect
        const dampedY =
          my > threshold ? threshold + (my - threshold) * 0.2 : my;
        api.start({ y: dampedY, immediate: true });
      } else {
        setSwipeGestureActive(false);

        if (my > threshold && vy > 0.1 && dy > 0) {
          // Trigger refresh
          isRefreshing.current = true;
          api.start({ y: threshold });

          try {
            await onRefresh();
          } finally {
            isRefreshing.current = false;
            api.start({ y: 0 });
          }
        } else {
          // Reset position
          api.start({ y: 0 });
        }
      }
    },
    {
      axis: 'y',
      filterTaps: true,
      rubberband: true,
    }
  );

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Pull indicator */}
      <animated.div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 transition-opacity"
        style={{
          height: threshold,
          transform: y.to((val) => `translateY(${val - threshold}px)`),
          opacity: y.to((val) => Math.min(val / threshold, 1)),
        }}
      >
        <div className="flex flex-col items-center space-y-2">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
            {isRefreshing.current ? 'Refreshing...' : 'Pull to refresh'}
          </span>
        </div>
      </animated.div>

      {/* Content */}
      <animated.div {...bind()} style={{ y }} className="touch-pan-y">
        {children}
      </animated.div>
    </div>
  );
};

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: {
    icon: React.ReactNode;
    label: string;
    color: string;
  };
  rightAction?: {
    icon: React.ReactNode;
    label: string;
    color: string;
  };
  threshold?: number;
  disabled?: boolean;
  className?: string;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  threshold = 100,
  disabled = false,
  className,
}) => {
  const [{ x, scale }, api] = useSpring(() => ({ x: 0, scale: 1 }));

  const bind = useDrag(
    ({ down, movement: [mx], velocity: [vx], direction: [dx] }) => {
      if (disabled) return;

      const trigger = Math.abs(mx) > threshold;
      const dir = dx > 0 ? 1 : -1;

      if (down) {
        api.start({
          x: mx,
          scale: 1 - Math.abs(mx) * 0.0005,
          immediate: true,
        });
      } else {
        if (trigger && Math.abs(vx) > 0.2) {
          // Execute action
          if (dir > 0 && onSwipeRight) {
            onSwipeRight();
          } else if (dir < 0 && onSwipeLeft) {
            onSwipeLeft();
          }
        }

        // Reset position
        api.start({ x: 0, scale: 1 });
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      rubberband: true,
    }
  );

  return (
    <div className={cn('relative overflow-hidden rounded-lg', className)}>
      {/* Left action */}
      {leftAction && (
        <animated.div
          className={cn(
            'absolute left-0 top-0 bottom-0 flex items-center justify-center px-6',
            leftAction.color
          )}
          style={{
            width: x.to((val) => Math.max(0, val)),
            opacity: x.to((val) => Math.min(val / threshold, 1)),
          }}
        >
          <div className="flex flex-col items-center space-y-1">
            {leftAction.icon}
            <span className="text-xs font-medium text-white">
              {leftAction.label}
            </span>
          </div>
        </animated.div>
      )}

      {/* Right action */}
      {rightAction && (
        <animated.div
          className={cn(
            'absolute right-0 top-0 bottom-0 flex items-center justify-center px-6',
            rightAction.color
          )}
          style={{
            width: x.to((val) => Math.max(0, -val)),
            opacity: x.to((val) => Math.min(-val / threshold, 1)),
          }}
        >
          <div className="flex flex-col items-center space-y-1">
            {rightAction.icon}
            <span className="text-xs font-medium text-white">
              {rightAction.label}
            </span>
          </div>
        </animated.div>
      )}

      {/* Card content */}
      <animated.div
        {...bind()}
        style={{ x, scale }}
        className="relative z-10 bg-white dark:bg-gray-800 touch-pan-x"
      >
        {children}
      </animated.div>
    </div>
  );
};

interface PinchZoomProps {
  children: React.ReactNode;
  minScale?: number;
  maxScale?: number;
  disabled?: boolean;
  className?: string;
}

export const PinchZoom: React.FC<PinchZoomProps> = ({
  children,
  minScale = 0.5,
  maxScale = 3,
  disabled = false,
  className,
}) => {
  const [{ scale, x, y }, api] = useSpring(() => ({
    scale: 1,
    x: 0,
    y: 0,
  }));

  const bind = useGesture(
    {
      onPinch: ({ offset: [s], origin: [ox, oy] }) => {
        if (disabled) return;

        const clampedScale = Math.min(Math.max(s, minScale), maxScale);
        api.start({ scale: clampedScale });
      },
      onDrag: ({ offset: [x, y] }) => {
        if (disabled) return;
        api.start({ x, y });
      },
      onWheel: ({ delta: [, dy], ctrlKey }) => {
        if (disabled || !ctrlKey) return;

        const newScale = Math.min(
          Math.max(scale.get() - dy * 0.01, minScale),
          maxScale
        );
        api.start({ scale: newScale });
      },
      onDoubleClick: () => {
        if (disabled) return;
        
        // Smart zoom: zoom in to 2x if at 1x, otherwise zoom out to 1x
        const currentScale = scale.get();
        const targetScale = currentScale === 1 ? 2 : 1;
        api.start({ scale: targetScale, x: 0, y: 0 });
      },
    },
    {
      pinch: { scaleBounds: { min: minScale, max: maxScale } },
      drag: { filterTaps: true },
    }
  );

  return (
    <div className={cn('overflow-hidden touch-none select-none', className)}>
      <animated.div
        {...bind()}
        style={{
          scale,
          x,
          y,
        }}
        className="origin-center"
      >
        {children}
      </animated.div>
    </div>
  );
};

interface DoubleTapProps {
  children: React.ReactNode;
  onDoubleTap: () => void;
  delay?: number;
  disabled?: boolean;
  className?: string;
}

export const DoubleTap: React.FC<DoubleTapProps> = ({
  children,
  onDoubleTap,
  delay = 300,
  disabled = false,
  className,
}) => {
  const lastTap = useRef(0);

  const handleTap = useCallback(() => {
    if (disabled) return;

    const now = Date.now();
    if (now - lastTap.current < delay) {
      onDoubleTap();
    }
    lastTap.current = now;
  }, [onDoubleTap, delay, disabled]);

  return (
    <div
      className={cn('cursor-pointer touch-manipulation', className)}
      onClick={handleTap}
    >
      {children}
    </div>
  );
};

interface LongPressProps {
  children: React.ReactNode;
  onLongPress: () => void;
  onCancel?: () => void;
  threshold?: number;
  disabled?: boolean;
  className?: string;
}

export const LongPress: React.FC<LongPressProps> = ({
  children,
  onLongPress,
  onCancel,
  threshold = 500,
  disabled = false,
  className,
}) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isPressed = useRef(false);

  const startPress = useCallback(() => {
    if (disabled) return;

    isPressed.current = true;
    timeoutRef.current = setTimeout(() => {
      if (isPressed.current) {
        onLongPress();
      }
    }, threshold);
  }, [onLongPress, threshold, disabled]);

  const endPress = useCallback(() => {
    isPressed.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      if (onCancel) {
        onCancel();
      }
    }
  }, [onCancel]);

  return (
    <div
      className={cn('touch-manipulation', className)}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onTouchCancel={endPress}
    >
      {children}
    </div>
  );
};
