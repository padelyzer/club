'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Repeat,
  CalendarDays,
  TrendingUp,
} from 'lucide-react';
import { BookingMetrics as BookingMetricsType } from '@/types/analytics';
import { MetricCard } from '@/components/charts/MetricCard';
import { Card } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Badge } from '@/components/ui/badge';

interface BookingMetricsProps {
  data: BookingMetricsType | null;
  isLoading?: boolean;
}

export function BookingMetrics({ data, isLoading }: BookingMetricsProps) {
  const { t } = useTranslation();

  const statusData = data
    ? [
        {
          name: t('analytics.bookings.confirmed'),
          value: data.byStatus.confirmed,
          color: '#10B981',
          icon: CheckCircle,
        },
        {
          name: t('analytics.bookings.pending'),
          value: data.byStatus.pending,
          color: '#F59E0B',
          icon: Clock,
        },
        {
          name: t('analytics.bookings.cancelled'),
          value: data.byStatus.cancelled,
          color: '#EF4444',
          icon: XCircle,
        },
        {
          name: t('analytics.bookings.completed'),
          value: data.byStatus.completed,
          color: '#3B82F6',
          icon: CheckCircle,
        },
      ].filter((item) => item.value > 0)
    : [];

  const totalBookings = statusData.reduce((sum, item) => sum + item.value, 0);

  const metricsData = data
    ? [
        {
          title: t('analytics.bookings.cancellationRate'),
          value: data.cancellationRate.value,
          previousValue: data.cancellationRate.previousValue,
          format: 'percentage' as const,
          icon: XCircle,
          color: 'red' as const,
          invertTrend: true,
        },
        {
          title: t('analytics.bookings.noShowRate'),
          value: data.noShowRate.value,
          previousValue: data.noShowRate.previousValue,
          format: 'percentage' as const,
          icon: AlertCircle,
          color: 'yellow' as const,
          invertTrend: true,
        },
        {
          title: t('analytics.bookings.avgAdvanceBooking'),
          value: data.averageAdvanceBooking.value,
          previousValue: data.averageAdvanceBooking.previousValue,
          format: 'number' as const,
          suffix: ' ' + t('analytics.bookings.days'),
          icon: Calendar,
          color: 'blue' as const,
        },
        {
          title: t('analytics.bookings.recurring'),
          value: data.recurringBookings.value,
          previousValue: data.recurringBookings.previousValue,
          format: 'percentage' as const,
          icon: Repeat,
          color: 'green' as const,
        },
      ]
    : [];

  const formatPercentage = (value: number, total: number) => {
    return total === 0 ? '0%' : `${((value / total) * 100).toFixed(1)}%`;
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
          <Calendar className="h-6 w-6 text-indigo-600" />
          <span>{t('analytics.bookings.title')}</span>
        </h2>
        {data?.peakDays && data.peakDays.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {t('analytics.bookings.peakDay')}: {data.peakDays[0]}
          </Badge>
        )}
      </div>

      {/* Total Bookings */}
      <div className="mb-6">
        <MetricCard
          title={t('analytics.bookings.total')}
          value={data?.total.value || 0}
          {...(data?.total.previousValue !== undefined && { previousValue: data.total.previousValue })}
          format="number"
          {...(data?.total.trend && { trend: data.total.trend })}
          color="blue"
          icon="trending-up"
          {...(isLoading !== undefined && { isLoading })}
        />
      </div>

      {/* Booking Status Distribution */}
      {statusData.length > 0 && (
        <div className="mb-6 bg-white rounded-lg p-4 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-4">
            {t('analytics.bookings.byStatus')}
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {statusData.map((status) => (
              <div
                key={status.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <status.icon
                    className="h-4 w-4"
                    style={{ color: status.color }}
                  />
                  <span className="text-sm text-gray-600">{status.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {status.value}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatPercentage(status.value, totalBookings)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Status Pie Chart */}
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [
                    value,
                    t('analytics.bookings.bookings'),
                  ]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {metricsData.map((metric) => (
          <div
            key={metric.title}
            className="bg-white rounded-lg p-4 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-2">
              <metric.icon className="h-5 w-5 text-gray-500" />
              {metric.previousValue !== undefined && (
                <TrendIndicator
                  current={metric.value}
                  previous={metric.previousValue}
                  {...(metric.invertTrend !== undefined && { inverted: metric.invertTrend })}
                />
              )}
            </div>
            <p className="text-xs text-gray-600 mb-1">{metric.title}</p>
            <p className="text-lg font-semibold text-gray-900">
              {metric.format === 'percentage'
                ? `${metric.value.toFixed(1)}%`
                : metric.value}
              {metric.suffix}
            </p>
          </div>
        ))}
      </div>

      {/* Peak Days */}
      {data?.peakDays && data.peakDays.length > 0 && (
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-start space-x-3">
            <CalendarDays className="h-5 w-5 text-indigo-500 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-gray-700">
                {t('analytics.bookings.peakDays')}
              </h4>
              <div className="flex flex-wrap gap-2 mt-2">
                {data.peakDays.map((day) => (
                  <Badge key={day} variant="outline" className="text-xs">
                    {day}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="mt-4 bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          {t('analytics.bookings.insights')}
        </h4>
        <div className="space-y-2">
          {data?.cancellationRate && data.cancellationRate.value > 15 && (
            <p className="text-sm text-gray-600">
              • {t('analytics.bookings.insightHighCancellation')}
            </p>
          )}
          {data?.recurringBookings && data.recurringBookings.value > 30 && (
            <p className="text-sm text-gray-600">
              •{' '}
              {t('analytics.bookings.insightHighRecurring', {
                percentage: data.recurringBookings.value.toFixed(0),
              })}
            </p>
          )}
          {data?.averageAdvanceBooking &&
            data.averageAdvanceBooking.value < 2 && (
              <p className="text-sm text-gray-600">
                • {t('analytics.bookings.insightLastMinute')}
              </p>
            )}
        </div>
      </div>
    </Card>
  );
}

function TrendIndicator({
  current,
  previous,
  inverted = false,
}: {
  current: number;
  previous: number;
  inverted?: boolean;
}) {
  const change = current - previous;
  const percentage = previous === 0 ? 0 : (change / previous) * 100;
  const isPositive = inverted ? change < 0 : change > 0;

  return (
    <span
      className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}
    >
      {percentage > 0 ? '+' : ''}
      {percentage.toFixed(1)}%
    </span>
  );
}
