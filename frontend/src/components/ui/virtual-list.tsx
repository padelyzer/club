'use client';

import { useRef, useState, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number | ((index: number) => number);
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  containerHeight?: number | string;
  getItemKey?: (item: T, index: number) => string | number;
  onScroll?: (scrollTop: number) => void;
  placeholder?: React.ReactNode;
}

function VirtualListComponent<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 5,
  className,
  containerHeight = '100%',
  getItemKey,
  onScroll,
  placeholder,
}: VirtualListProps<T>) {
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeightPx, setContainerHeightPx] = useState(0);

  // Calculate item positions
  const getItemHeight = useCallback(
    (index: number) => {
      return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight;
    },
    [itemHeight]
  );

  const itemPositions = useMemo(() => {
    const positions: number[] = [0];
    for (let i = 0; i < items.length; i++) {
      positions.push(positions[i] + getItemHeight(i));
    }
    return positions;
  }, [items.length, getItemHeight]);

  const totalHeight = itemPositions[items.length] || 0;

  // Calculate visible items
  const { startIndex, endIndex, offsetY } = useMemo(() => {
    if (!containerHeightPx || items.length === 0) {
      return { startIndex: 0, endIndex: 0, offsetY: 0 };
    }

    // Binary search for start index
    let start = 0;
    let end = items.length - 1;
    
    while (start < end) {
      const mid = Math.floor((start + end) / 2);
      if (itemPositions[mid] < scrollTop) {
        start = mid + 1;
      } else {
        end = mid;
      }
    }
    
    start = Math.max(0, start - overscan);

    // Find end index
    let visibleEnd = start;
    while (
      visibleEnd < items.length &&
      itemPositions[visibleEnd] < scrollTop + containerHeightPx
    ) {
      visibleEnd++;
    }
    
    visibleEnd = Math.min(items.length - 1, visibleEnd + overscan);

    return {
      startIndex: start,
      endIndex: visibleEnd,
      offsetY: itemPositions[start] || 0,
    };
  }, [scrollTop, containerHeightPx, items.length, itemPositions, overscan]);

  // Handle scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);
    },
    [onScroll]
  );

  // Measure container
  useEffect(() => {
    const measureContainer = () => {
      if (scrollElementRef.current) {
        setContainerHeightPx(scrollElementRef.current.clientHeight);
      }
    };

    measureContainer();
    
    const resizeObserver = new ResizeObserver(measureContainer);
    if (scrollElementRef.current) {
      resizeObserver.observe(scrollElementRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Render visible items
  const visibleItems = useMemo(() => {
    const visible = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const item = items[i];
      if (item !== undefined) {
        const key = getItemKey ? getItemKey(item, i) : i;
        const itemStyle: React.CSSProperties = {
          position: 'absolute',
          top: itemPositions[i] - offsetY,
          left: 0,
          right: 0,
          height: getItemHeight(i),
        };
        
        visible.push(
          <div key={key} style={itemStyle}>
            {renderItem(item, i)}
          </div>
        );
      }
    }
    return visible;
  }, [
    items,
    startIndex,
    endIndex,
    offsetY,
    itemPositions,
    getItemHeight,
    renderItem,
    getItemKey,
  ]);

  if (items.length === 0 && placeholder) {
    return <>{placeholder}</>;
  }

  return (
    <div
      ref={scrollElementRef}
      className={cn('relative overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems}
        </div>
      </div>
    </div>
  );
}

// Export memoized component
export const VirtualList = memo(VirtualListComponent) as typeof VirtualListComponent;

// Utility hook for simple virtual lists
export function useSimpleVirtualList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);
  
  const visibleItems = items.slice(startIndex, endIndex + 1);
  
  return {
    visibleItems,
    totalHeight: items.length * itemHeight,
    offsetY: startIndex * itemHeight,
    handleScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    },
  };
}

// Import necessary dependencies
import { useMemo, useEffect } from 'react';