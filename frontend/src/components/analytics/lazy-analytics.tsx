/**
 * Lazy-loaded analytics components to reduce initial bundle size
 */
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Loading placeholder for charts
const ChartSkeleton = () => (
  <div className="w-full h-[400px] p-4">
    <Skeleton className="w-full h-full" />
  </div>
);

// Lazy load heavy chart components
export const BookingMetrics = dynamic(
  () => import('./booking-metrics').then(mod => mod.BookingMetrics),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false 
  }
);

export const ComparisonChart = dynamic(
  () => import('./comparison-chart').then(mod => mod.ComparisonChart),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false 
  }
);

export const CustomerMetrics = dynamic(
  () => import('./customer-metrics').then(mod => mod.CustomerMetrics),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false 
  }
);

export const HeatmapChart = dynamic(
  () => import('./heatmap-chart').then(mod => mod.HeatmapChart),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false 
  }
);

export const OccupancyMetrics = dynamic(
  () => import('./occupancy-metrics').then(mod => mod.OccupancyMetrics),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false 
  }
);

export const PerformanceMetrics = dynamic(
  () => import('./performance-metrics').then(mod => mod.PerformanceMetrics),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false 
  }
);

export const RevenueMetrics = dynamic(
  () => import('./revenue-metrics').then(mod => mod.RevenueMetrics),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false 
  }
);

export const TrendsChart = dynamic(
  () => import('./trends-chart').then(mod => mod.TrendsChart),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false 
  }
);

// Export the header normally as it&apos;s lightweight
export { AnalyticsHeader } from './analytics-header';