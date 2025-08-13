'use client';

import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { useAuthStore } from '@/store/auth';
import {
  useRevenueMetrics,
  useOccupancyMetrics,
  useCustomerMetrics,
  useBookingMetrics,
  useTrendData,
  useHeatmap,
} from '@/lib/api/hooks/useAnalytics';
import { 
  AnalyticsHeader,
  RevenueMetrics,
  OccupancyMetrics,
  CustomerMetrics,
  BookingMetrics,
  TrendsChart,
  HeatmapChart
} from '@/components/analytics/lazy-analytics';
import { LoadingState } from '@/components/ui/states/loading-state';
import { ErrorState } from '@/components/ui/states/error-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';
import { AnalyticsFilters } from '@/types/analytics';

export default function RootAnalyticsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  
  const { filters } = useAnalyticsStore();

  // Check access
  const hasAccess = user?.is_superuser || user?.is_staff;

  // Build organization-wide filters (no club restriction)
  const rootFilters: AnalyticsFilters = useMemo(() => {
    return {
      ...filters,
      // Don't filter by clubs for ROOT - get organization-wide data
      clubs: undefined,
    };
  }, [filters]);

  // Fetch all analytics data for organization
  const { revenueMetrics, isLoading: revenueLoading, error: revenueError } = useRevenueMetrics(rootFilters);
  const { occupancyMetrics, isLoading: occupancyLoading, error: occupancyError } = useOccupancyMetrics(rootFilters);
  const { customerMetrics, isLoading: customerLoading, error: customerError } = useCustomerMetrics(rootFilters);
  const { bookingMetrics, isLoading: bookingLoading, error: bookingError } = useBookingMetrics(rootFilters);

  // Trend data
  const { trendData: revenueTrend, isLoading: revenueTrendLoading } = useTrendData({
    metric: 'revenue',
    filters: rootFilters,
  });
  const { trendData: occupancyTrend, isLoading: occupancyTrendLoading } = useTrendData({
    metric: 'occupancy',
    filters: rootFilters,
  });

  // Heatmap data
  const { heatmapData: occupancyHeatmap, isLoading: occupancyHeatmapLoading } = useHeatmap({
    type: 'occupancy',
    filters: rootFilters,
  });
  const { heatmapData: revenueHeatmap, isLoading: revenueHeatmapLoading } = useHeatmap({
    type: 'revenue',
    filters: rootFilters,
  });

  // Compute loading and error states
  const isLoading = revenueLoading || occupancyLoading || customerLoading || bookingLoading;
  const hasError = revenueError || occupancyError || customerError || bookingError;

  // Show access denied if user doesn't have ROOT permissions
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-md mx-auto mt-32">
            <Alert className="border-red-200 bg-red-50">
              <Shield className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                You need ROOT administrator privileges to access organization-wide analytics.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && !revenueMetrics) {
    return <LoadingState message="Loading ROOT analytics..." fullScreen={false} />;
  }

  if (hasError && !revenueMetrics) {
    return <ErrorState onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ROOT Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-semibold text-blue-600">ROOT Analytics</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Organization Analytics</h1>
          <p className="text-gray-600 mt-2">Comprehensive analytics across all clubs and organizations</p>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {/* Revenue Section */}
          <div className="lg:col-span-2 xl:col-span-1">
            <RevenueMetrics data={revenueMetrics} isLoading={revenueLoading} />
          </div>

          {/* Occupancy Section */}
          <div className="lg:col-span-2 xl:col-span-1">
            <OccupancyMetrics data={occupancyMetrics} isLoading={occupancyLoading} />
          </div>

          {/* Customer Section */}
          <div className="lg:col-span-2 xl:col-span-1">
            <CustomerMetrics data={customerMetrics} isLoading={customerLoading} />
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Trend */}
          <TrendsChart
            title="Revenue Trend (Organization-wide)"
            data={revenueTrend}
            type="revenue"
            isLoading={revenueTrendLoading}
          />

          {/* Occupancy Trend */}
          <TrendsChart
            title="Occupancy Trend (Organization-wide)"
            data={occupancyTrend}
            type="occupancy"
            isLoading={occupancyTrendLoading}
          />
        </div>

        {/* Heatmaps Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Occupancy Heatmap */}
          <HeatmapChart
            title="Occupancy Heatmap (All Clubs)"
            data={occupancyHeatmap}
            type="occupancy"
            isLoading={occupancyHeatmapLoading}
          />

          {/* Revenue Heatmap */}
          <HeatmapChart
            title="Revenue Heatmap (All Clubs)"
            data={revenueHeatmap}
            type="revenue"
            isLoading={revenueHeatmapLoading}
          />
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Booking Metrics */}
          <BookingMetrics data={bookingMetrics} isLoading={bookingLoading} />

          {/* Organization Performance */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization Performance</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {revenueMetrics?.total.value ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'EUR',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(revenueMetrics.total.value) : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600">Total Revenue</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {occupancyMetrics?.overall.value ? `${occupancyMetrics.overall.value.toFixed(1)}%` : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600">Avg Occupancy</div>
                </div>
              </div>
              
              {revenueMetrics && occupancyMetrics && (
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-700 mb-2">Organization Insights</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    {revenueMetrics.total.changePercentage && revenueMetrics.total.changePercentage > 5 && (
                      <p>• Organization revenue has grown by {revenueMetrics.total.changePercentage.toFixed(1)}%</p>
                    )}
                    {customerMetrics?.totalActive && customerMetrics.totalActive.value > 1000 && (
                      <p>• Strong customer base with {customerMetrics.totalActive.value} active customers</p>
                    )}
                    {bookingMetrics?.total && bookingMetrics.total.changePercentage && bookingMetrics.total.changePercentage > 0 && (
                      <p>• Bookings have increased by {bookingMetrics.total.changePercentage.toFixed(1)}%</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}