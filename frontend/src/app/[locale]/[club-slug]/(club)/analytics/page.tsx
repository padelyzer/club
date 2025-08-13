'use client';

import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'next/navigation';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { useAuthStore } from '@/store/auth';
import { useClubs } from '@/store/clubs';
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
import { Building, Shield } from 'lucide-react';
import { AnalyticsFilters } from '@/types/analytics';

export default function ClubAnalyticsPage() {
  const { t } = useTranslation();
  const params = useParams();
  const { user } = useAuthStore();
  const clubs = useClubs();
  
  const { filters } = useAnalyticsStore();

  // Find current club based on slug
  const currentClub = useMemo(() => {
    const clubSlug = params['club-slug'] as string;
    return clubs.find(club => club.slug === clubSlug);
  }, [clubs, params]);

  // Build club-specific filters
  const clubFilters: AnalyticsFilters = useMemo(() => {
    if (!currentClub) return filters;
    
    return {
      ...filters,
      clubs: [currentClub.id],
    };
  }, [filters, currentClub]);

  // Fetch all analytics data for this club
  const { revenueMetrics, isLoading: revenueLoading, error: revenueError } = useRevenueMetrics(clubFilters);
  const { occupancyMetrics, isLoading: occupancyLoading, error: occupancyError } = useOccupancyMetrics(clubFilters);
  const { customerMetrics, isLoading: customerLoading, error: customerError } = useCustomerMetrics(clubFilters);
  const { bookingMetrics, isLoading: bookingLoading, error: bookingError } = useBookingMetrics(clubFilters);

  // Trend data
  const { trendData: revenueTrend, isLoading: revenueTrendLoading } = useTrendData({
    metric: 'revenue',
    filters: clubFilters,
  });
  const { trendData: occupancyTrend, isLoading: occupancyTrendLoading } = useTrendData({
    metric: 'occupancy',
    filters: clubFilters,
  });

  // Heatmap data
  const { heatmapData: occupancyHeatmap, isLoading: occupancyHeatmapLoading } = useHeatmap({
    type: 'occupancy',
    filters: clubFilters,
  });
  const { heatmapData: revenueHeatmap, isLoading: revenueHeatmapLoading } = useHeatmap({
    type: 'revenue',
    filters: clubFilters,
  });

  // Check access
  const hasAccess = user && currentClub;
  const isLoading = revenueLoading || occupancyLoading || customerLoading || bookingLoading;
  const hasError = revenueError || occupancyError || customerError || bookingError;

  // Show access denied if user doesn't have access to this club
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-md mx-auto mt-32">
            <Alert className="border-red-200 bg-red-50">
              <Shield className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {t('analytics.accessDenied.club') || "You don&apos;t have access to this club's analytics or the club doesn't exist."}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && !revenueMetrics) {
    return <LoadingState message={`Loading ${currentClub.name} analytics...`} fullScreen={false} />;
  }

  if (hasError && !revenueMetrics) {
    return <ErrorState onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Club Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Building className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-semibold text-blue-600">Club Analytics</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{currentClub.name}</h1>
          <p className="text-gray-600 mt-2">
            Analytics for {currentClub.name}
            {currentClub.address?.city && ` in ${currentClub.address.city}`}
          </p>
        </div>

        {/* Analytics Header with Filters */}
        <div className="mb-8">
          <AnalyticsHeader
            title={`${currentClub.name} Analytics`}
            subtitle="Track performance, revenue, and customer insights for your club"
          />
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
            title={`${currentClub.name} - Revenue Trend`}
            data={revenueTrend}
            type="revenue"
            isLoading={revenueTrendLoading}
          />

          {/* Occupancy Trend */}
          <TrendsChart
            title={`${currentClub.name} - Occupancy Trend`}
            data={occupancyTrend}
            type="occupancy"
            isLoading={occupancyTrendLoading}
          />
        </div>

        {/* Heatmaps Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Occupancy Heatmap */}
          <HeatmapChart
            title={`${currentClub.name} - Occupancy Heatmap`}
            data={occupancyHeatmap}
            type="occupancy"
            isLoading={occupancyHeatmapLoading}
          />

          {/* Revenue Heatmap */}
          <HeatmapChart
            title={`${currentClub.name} - Revenue Heatmap`}
            data={revenueHeatmap}
            type="revenue"
            isLoading={revenueHeatmapLoading}
          />
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Booking Metrics */}
          <BookingMetrics data={bookingMetrics} isLoading={bookingLoading} />

          {/* Club Performance Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {currentClub.name} Performance Summary
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {currentClub.courts?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Courts</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {revenueMetrics?.total.trend === 'up' ? '↗️' : 
                     revenueMetrics?.total.trend === 'down' ? '↘️' : '➡️'}
                  </div>
                  <div className="text-sm text-gray-600">Revenue Trend</div>
                </div>
              </div>
              
              {revenueMetrics && occupancyMetrics && (
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-700 mb-2">Key Insights</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    {revenueMetrics.total.changePercentage && revenueMetrics.total.changePercentage > 10 && (
                      <p>• Revenue has increased significantly by {revenueMetrics.total.changePercentage.toFixed(1)}%</p>
                    )}
                    {occupancyMetrics.overall.value > 80 && (
                      <p>• High occupancy rate of {occupancyMetrics.overall.value.toFixed(1)}%</p>
                    )}
                    {customerMetrics?.churnRate && customerMetrics.churnRate.value < 5 && (
                      <p>• Low customer churn rate of {customerMetrics.churnRate.value.toFixed(1)}%</p>
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