export * from './useDebounce';
export * from './useWebSocket';
export * from './usePWAInitialization';
export * from './use-error-recovery';

// NEW: BFF-optimized hooks
export * from './useAvailability';

// Re-export enhanced analytics hooks for convenience
export { 
  useDashboard,          // NEW: BFF-optimized dashboard hook
  useDashboardStats,     // LEGACY: backward compatibility
  useRevenueAnalytics,
  useOccupancyAnalytics,
  useClientAnalytics,
  usePredictiveAnalytics,
  useHeatmap,
  useAnalyticsExport
} from '@/lib/api/hooks/useAnalytics';

// Re-export enhanced auth hook
export { useAuth, usePasswordReset } from '@/lib/api/hooks/useAuth';
