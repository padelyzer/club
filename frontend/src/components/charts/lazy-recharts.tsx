'use client';

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

// Loading component for charts
const ChartLoadingFallback = () => (
  <div className="flex items-center justify-center h-[300px]">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

// Lazy load all Recharts components
export const LineChart = dynamic(
  () => import('recharts').then(mod => mod.LineChart as any),
  { 
    loading: () => <ChartLoadingFallback />,
    ssr: false 
  }
) as ComponentType<any>;

export const BarChart = dynamic(
  () => import('recharts').then(mod => mod.BarChart as any),
  { 
    loading: () => <ChartLoadingFallback />,
    ssr: false 
  }
) as ComponentType<any>;

export const AreaChart = dynamic(
  () => import('recharts').then(mod => mod.AreaChart as any),
  { 
    loading: () => <ChartLoadingFallback />,
    ssr: false 
  }
) as ComponentType<any>;

export const PieChart = dynamic(
  () => import('recharts').then(mod => mod.PieChart as any),
  { 
    loading: () => <ChartLoadingFallback />,
    ssr: false 
  }
) as ComponentType<any>;

export const RadarChart = dynamic(
  () => import('recharts').then(mod => mod.RadarChart as any),
  { 
    loading: () => <ChartLoadingFallback />,
    ssr: false 
  }
) as ComponentType<any>;

export const RadialBarChart = dynamic(
  () => import('recharts').then(mod => mod.RadialBarChart as any),
  { 
    loading: () => <ChartLoadingFallback />,
    ssr: false 
  }
) as ComponentType<any>;

export const ComposedChart = dynamic(
  () => import('recharts').then(mod => mod.ComposedChart as any),
  { 
    loading: () => <ChartLoadingFallback />,
    ssr: false 
  }
) as ComponentType<any>;

// Export individual components that are often used with charts
export const ResponsiveContainer = dynamic(
  () => import('recharts').then(mod => mod.ResponsiveContainer as any),
  { ssr: false }
) as ComponentType<any>;

export const XAxis = dynamic(
  () => import('recharts').then(mod => mod.XAxis as any),
  { ssr: false }
) as ComponentType<any>;

export const YAxis = dynamic(
  () => import('recharts').then(mod => mod.YAxis as any),
  { ssr: false }
) as ComponentType<any>;

export const CartesianGrid = dynamic(
  () => import('recharts').then(mod => mod.CartesianGrid as any),
  { ssr: false }
) as ComponentType<any>;

export const Tooltip = dynamic(
  () => import('recharts').then(mod => mod.Tooltip as any),
  { ssr: false }
) as ComponentType<any>;

export const Legend = dynamic(
  () => import('recharts').then(mod => mod.Legend as any),
  { ssr: false }
) as ComponentType<any>;

export const Line = dynamic(
  () => import('recharts').then(mod => mod.Line as any),
  { ssr: false }
) as ComponentType<any>;

export const Bar = dynamic(
  () => import('recharts').then(mod => mod.Bar as any),
  { ssr: false }
) as ComponentType<any>;

export const Area = dynamic(
  () => import('recharts').then(mod => mod.Area as any),
  { ssr: false }
) as ComponentType<any>;

export const Pie = dynamic(
  () => import('recharts').then(mod => mod.Pie as any),
  { ssr: false }
) as ComponentType<any>;

export const Cell = dynamic(
  () => import('recharts').then(mod => mod.Cell as any),
  { ssr: false }
) as ComponentType<any>;

export const RadialBar = dynamic(
  () => import('recharts').then(mod => mod.RadialBar as any),
  { ssr: false }
) as ComponentType<any>;

export const Brush = dynamic(
  () => import('recharts').then(mod => mod.Brush as any),
  { ssr: false }
) as ComponentType<any>;

export const ReferenceLine = dynamic(
  () => import('recharts').then(mod => mod.ReferenceLine as any),
  { ssr: false }
) as ComponentType<any>;

export const LabelList = dynamic(
  () => import('recharts').then(mod => mod.LabelList as any),
  { ssr: false }
) as ComponentType<any>;

// Custom wrapper for complete chart components
export const LazyChart: React.FC<{
  component: ComponentType<any>;
  fallback?: React.ReactNode;
  [key: string]: any;
}> = ({ component: Component, fallback, ...props }) => {
  return <Component {...props} />;
};

// Utility to preload charts (useful for critical charts)
export const preloadRecharts = () => {
  import('recharts');
};