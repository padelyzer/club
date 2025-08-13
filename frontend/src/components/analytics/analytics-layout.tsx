'use client';

import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AnalyticsContextInfo } from '@/lib/utils/analytics-context';
import { AnalyticsHeader } from './analytics-header';
import { RevenueMetrics } from './revenue-metrics';
import { OccupancyMetrics } from './occupancy-metrics';
import { CustomerMetrics } from './customer-metrics';
import { BookingMetrics } from './booking-metrics';
import { PerformanceMetrics } from './performance-metrics';
import { TrendsChart } from './trends-chart';
import { ComparisonChart } from './comparison-chart';
import { HeatmapChart } from './heatmap-chart';
import { LoadingState } from '@/components/ui/states/loading-state';
import { ErrorState } from '@/components/ui/states/error-state';
import { useAnalyticsStore } from '@/store/analyticsStore';
import {
  RevenueMetrics as RevenueMetricsType,
  OccupancyMetrics as OccupancyMetricsType,
  CustomerMetrics as CustomerMetricsType,
  BookingMetrics as BookingMetricsType,
  PerformanceMetrics as PerformanceMetricsType,
  TrendData,
  HeatmapData,
} from '@/types/analytics';

interface AnalyticsLayoutProps {
  context: AnalyticsContextInfo;
  contextHeader: ReactNode;
  contextOverview?: ReactNode;
  specialSections?: ReactNode;
  onRetry: () => void;
}

export function AnalyticsLayout({
  context,
  contextHeader,
  contextOverview,
  specialSections,
  onRetry,
}: AnalyticsLayoutProps) {
  const { t } = useTranslation();
  const {
    filters,
    revenue,
    occupancy,
    customers,
    bookings,
    performance,
    trends,
    heatmaps,
    isLoading,
    error,
  } = useAnalyticsStore();

  if (isLoading && !revenue) {
    return <LoadingState message={t(`analytics.loading.${context.type.toLowerCase()}`)} />;
  }

  if (error && !revenue) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Apple-style Context Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          {contextHeader}
          <AnalyticsHeader context={context} />
        </div>

        {/* Context Overview (optional) */}
        {contextOverview && (
          <div>
            {contextOverview}
          </div>
        )}

        {/* Special Context Sections (optional) */}
        {specialSections && (
          <div>
            {specialSections}
          </div>
        )}

        {/* Apple-style Main Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Revenue Section */}
          <div className="lg:col-span-2 xl:col-span-1">
            <RevenueMetrics data={revenue} isLoading={isLoading} />
          </div>

          {/* Occupancy Section */}
          <div className="lg:col-span-2 xl:col-span-1">
            <OccupancyMetrics data={occupancy} isLoading={isLoading} />
          </div>

          {/* Customer Section */}
          <div className="lg:col-span-2 xl:col-span-1">
            <CustomerMetrics data={customers} isLoading={isLoading} />
          </div>
        </div>

        {/* Apple-style Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <TrendsChart
            title={t('analytics.revenueTrend')}
            data={trends.revenue}
            type="revenue"
            isLoading={isLoading}
          />

          {/* Occupancy Trend */}
          <TrendsChart
            title={t('analytics.occupancyTrend')}
            data={trends.occupancy}
            type="occupancy"
            isLoading={isLoading}
          />
        </div>

        {/* Apple-style Heatmaps Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Occupancy Heatmap */}
          <HeatmapChart
            title={t('analytics.occupancyHeatmap')}
            data={heatmaps.occupancy}
            type="occupancy"
            isLoading={isLoading}
          />

          {/* Revenue Heatmap */}
          <HeatmapChart
            title={t('analytics.revenueHeatmap')}
            data={heatmaps.revenue}
            type="revenue"
            isLoading={isLoading}
          />
        </div>

        {/* Apple-style Additional Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Booking Metrics */}
          <BookingMetrics data={bookings} isLoading={isLoading} />

          {/* Performance Metrics */}
          <PerformanceMetrics data={performance} isLoading={isLoading} />
        </div>

        {/* Apple-style Comparison Charts */}
        {filters.comparisonEnabled && (
          <div>
            <ComparisonChart
              title={t('analytics.periodComparison')}
              metrics={{
                ...(revenue?.total !== undefined && { revenue: revenue.total }),
                ...(occupancy?.overall !== undefined && { occupancy: occupancy.overall }),
                ...(customers?.totalActive !== undefined && { customers: customers.totalActive }),
                ...(bookings?.total !== undefined && { bookings: bookings.total }),
              }}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Standard Overview Component for metrics display
 */
interface OverviewStatsProps {
  title: string;
  address?: string;
  revenue?: RevenueMetricsType;
  occupancy?: OccupancyMetricsType;
  customers?: CustomerMetricsType;
  bookings?: BookingMetricsType;
}

export function OverviewStats({
  title,
  address,
  revenue,
  occupancy,
  customers,
  bookings,
}: OverviewStatsProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          {title}
        </h2>
        {address && (
          <div className="text-sm text-gray-500 font-medium">
            {address}
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
            <div className="w-6 h-6 rounded-lg bg-blue-500"></div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {revenue?.total?.value ? `€${revenue.total.value.toLocaleString()}` : '-'}
          </div>
          <div className="text-sm text-gray-600 font-medium">{t('analytics.totalRevenue')}</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-3">
            <div className="w-6 h-6 rounded-lg bg-green-500"></div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {occupancy?.overall?.value ? `${occupancy.overall.value}%` : '-'}
          </div>
          <div className="text-sm text-gray-600 font-medium">{t('analytics.avgOccupancy')}</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-3">
            <div className="w-6 h-6 rounded-lg bg-purple-500"></div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {customers?.totalActive?.value ? customers.totalActive.value.toLocaleString() : '-'}
          </div>
          <div className="text-sm text-gray-600 font-medium">{t('analytics.activeCustomers')}</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-3">
            <div className="w-6 h-6 rounded-lg bg-orange-500"></div>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {bookings?.total?.value ? bookings.total.value.toLocaleString() : '-'}
          </div>
          <div className="text-sm text-gray-600 font-medium">{t('analytics.totalBookings')}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Court Performance Section for Club Analytics
 */
interface CourtPerformanceProps {
  occupancy?: OccupancyMetricsType;
}

export function CourtPerformance({ occupancy }: CourtPerformanceProps) {
  const { t } = useTranslation();

  if (!occupancy?.byCourt || Object.keys(occupancy.byCourt).length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center mr-3">
          <div className="w-5 h-5 rounded-lg bg-blue-500"></div>
        </div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          {t('analytics.courtPerformance')}
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(occupancy.byCourt).map(([courtId, metrics]) => (
          <div key={courtId} className="bg-gray-50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-900">
                {t('analytics.court')} {courtId}
              </div>
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <div className="w-3 h-3 rounded bg-green-500"></div>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {metrics.value}%
            </div>
            <div className="text-xs text-gray-500 font-medium mb-2">
              {t('analytics.occupancyRate')}
            </div>
            {metrics.trend && (
              <div className={`text-xs font-medium ${
                metrics.trend === 'up' ? 'text-green-600' : 
                metrics.trend === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {metrics.changePercentage !== undefined && (
                  `${metrics.changePercentage > 0 ? '+' : ''}${metrics.changePercentage.toFixed(1)}%`
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}