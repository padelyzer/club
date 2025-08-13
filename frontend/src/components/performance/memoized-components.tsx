/**
 * Memoized versions of heavy components
 * These components are wrapped with React.memo and custom comparison functions
 */

import { memo } from 'react';
import { shallowCompare, compareIgnoreFunctions } from '@/components/ui/with-performance';

// Finance Components with deep comparison
export const MemoizedMetricCard = memo(
  lazy(() => import('@/components/charts/MetricCard').then(m => ({ default: m.MetricCard }))),
  (prevProps, nextProps) => {
    // Only re-render if value or change actually changed
    return (
      prevProps.value === nextProps.value &&
      prevProps.change === nextProps.change &&
      prevProps.title === nextProps.title
    );
  }
);

// Chart components with expensive renders
export const MemoizedLineChart = memo(
  lazy(() => import('recharts').then(m => ({ default: m.LineChart }))),
  (prevProps, nextProps) => {
    // Compare data arrays by reference (assuming immutable updates)
    return prevProps.data === nextProps.data;
  }
);

export const MemoizedBarChart = memo(
  lazy(() => import('recharts').then(m => ({ default: m.BarChart }))),
  (prevProps, nextProps) => {
    return prevProps.data === nextProps.data;
  }
);

// Table components with large datasets
export const MemoizedDataTable = memo(
  ({ data, columns, ...props }: any) => {
    const Table = lazy(() => import('@/components/ui/data-table').then(m => ({ default: m.DataTable })));
    return <Table data={data} columns={columns} {...props} />;
  },
  (prevProps, nextProps) => {
    // Only re-render if data length changes or reference changes
    return (
      prevProps.data === nextProps.data ||
      (prevProps.data?.length === nextProps.data?.length &&
        prevProps.columns === nextProps.columns)
    );
  }
);

// Form components with complex state
export const MemoizedForm = memo(
  ({ children, ...props }: any) => {
    return <form {...props}>{children}</form>;
  },
  compareIgnoreFunctions // Ignore function prop changes
);

// List components with virtualization
export const MemoizedVirtualList = memo(
  ({ items, renderItem, itemHeight = 50, ...props }: any) => {
    const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
    const { visibleItems, totalHeight, offsetY, onScroll } = useVirtualList({
      items,
      itemHeight,
      containerHeight: containerRef?.clientHeight || 600,
    });

    return (
      <div
        ref={setContainerRef}
        onScroll={onScroll}
        style={{ height: '100%', overflow: 'auto' }}
        {...props}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleItems.map((item, index) => renderItem(item, index))}
          </div>
        </div>
      </div>
    );
  }
);

// Heavy modal components
export const MemoizedModal = memo(
  ({ isOpen, children, ...props }: any) => {
    if (!isOpen) return null;
    
    const Modal = lazy(() => import('@/components/ui/modal').then(m => ({ default: m.Modal })));
    return <Modal isOpen={isOpen} {...props}>{children}</Modal>;
  },
  (prevProps, nextProps) => {
    // Only re-render if open state changes
    return prevProps.isOpen === nextProps.isOpen;
  }
);

// Complex form components
export const MemoizedComplexForm = memo(
  ({ formData, onSubmit, ...props }: any) => {
    return (
      <form onSubmit={onSubmit} {...props}>
        {/* Form content */}
      </form>
    );
  },
  (prevProps, nextProps) => {
    // Deep comparison for form data
    return JSON.stringify(prevProps.formData) === JSON.stringify(nextProps.formData);
  }
);

// Import necessary dependencies
import { lazy, useState } from 'react';
import { useVirtualList } from '@/hooks/use-performance';