'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Activity,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { GrowthMetrics as GrowthMetricsType } from '@/types/analytics';
import { MetricCard } from '@/components/charts/MetricCard';
import { Card } from '@/components/ui/card';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Bar,
} from '@/components/charts/lazy-recharts';

interface GrowthMetricsProps {
  data: GrowthMetricsType | null;
  isLoading?: boolean;
}

export function GrowthMetrics({ data, isLoading }: GrowthMetricsProps) {
  const { t } = useTranslation();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Main KPI metrics
  const kpiMetrics = data
    ? [
        {
          title: t('analytics.growth.newCustomers'),
          value: data.newCustomers.current,
          previousValue: data.newCustomers.previous,
          change: data.newCustomers.growthRate,
          icon: Users,
          color: 'blue' as const,
          trend: data.newCustomers.growthRate > 0 ? 'up' : data.newCustomers.growthRate < 0 ? 'down' : 'stable' as const,
        },
        {
          title: t('analytics.growth.revenueGrowth'),
          value: formatCurrency(data.revenueGrowth.current),
          previousValue: formatCurrency(data.revenueGrowth.previous),
          change: data.revenueGrowth.growthRate,
          icon: DollarSign,
          color: 'green' as const,
          trend: data.revenueGrowth.growthRate > 0 ? 'up' : data.revenueGrowth.growthRate < 0 ? 'down' : 'stable' as const,
        },
        {
          title: t('analytics.growth.bookingGrowth'),
          value: data.bookingGrowth.current,
          previousValue: data.bookingGrowth.previous,
          change: data.bookingGrowth.growthRate,
          icon: Calendar,
          color: 'purple' as const,
          trend: data.bookingGrowth.growthRate > 0 ? 'up' : data.bookingGrowth.growthRate < 0 ? 'down' : 'stable' as const,
        },
        {
          title: t('analytics.growth.retention'),
          value: `${data.retention.current.toFixed(1)}%`,
          previousValue: `${data.retention.previous.toFixed(1)}%`,
          change: data.retention.growthRate,
          icon: Activity,
          color: 'yellow' as const,
          trend: data.retention.growthRate > 0 ? 'up' : data.retention.growthRate < 0 ? 'down' : 'stable' as const,
        },
      ]
    : [];

  // Time series data for growth chart
  const growthChartData = data?.monthlyGrowth
    ? data.monthlyGrowth.map((month) => ({
        month: month.month,
        customers: month.customers,
        revenue: month.revenue / 1000, // Convert to thousands for better chart display
        bookings: month.bookings,
        retention: month.retention,
      }))
    : [];

  // Cohort data for retention analysis
  const cohortData = data?.cohortAnalysis
    ? data.cohortAnalysis.map((cohort) => ({
        period: cohort.period,
        retention: cohort.retentionRate,
        revenue: cohort.revenueRetention,
      }))
    : [];

  const getGrowthIcon = (change: number) => {
    if (change > 0) return ArrowUpRight;
    if (change < 0) return ArrowDownRight;
    return Target;
  };

  const getGrowthColor = (change: number) => {
    if (change > 0) return 'text-green-600 bg-green-100';
    if (change < 0) return 'text-red-600 bg-red-100';
    return 'text-gray-600 bg-gray-100';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-xl"></div>
            ))}
          </div>
          <div className="h-80 bg-gray-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Apple-style Main Growth Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              {t('analytics.growth.title')}
            </h2>
          </div>
          {data?.overallGrowthRate && (
            <div className="text-sm text-gray-500">
              {t('analytics.growth.overall')}:{' '}
              <span className={`font-semibold px-3 py-1 rounded-lg ${getGrowthColor(data.overallGrowthRate)}`}>
                {formatPercentage(data.overallGrowthRate)}
              </span>
            </div>
          )}
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpiMetrics.map((metric) => {
            const GrowthIcon = getGrowthIcon(metric.change);
            return (
              <div key={metric.title} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center">
                      <metric.icon className="h-3 w-3 text-gray-600" />
                    </div>
                    <span className="text-xs font-semibold text-gray-900 truncate">
                      {metric.title}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <GrowthIcon className={`h-3 w-3 ${metric.change > 0 ? 'text-green-600' : metric.change < 0 ? 'text-red-600' : 'text-gray-600'}`} />
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-lg ${getGrowthColor(metric.change)}`}
                    >
                      {formatPercentage(metric.change)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-gray-900">
                    {typeof metric.value === 'string' ? metric.value : metric.value.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t('analytics.growth.previous')}: {typeof metric.previousValue === 'string' ? metric.previousValue : metric.previousValue.toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Growth Trend Chart */}
        {growthChartData.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-5 mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center">
                <TrendingUp className="h-3 w-3 text-gray-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">
                {t('analytics.growth.monthlyTrends')}
              </h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={growthChartData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    yAxisId="count"
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    yAxisId="revenue"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(value) => `€${value}k`}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === 'revenue') return [`€${value}k`, t('analytics.growth.revenue')];
                      if (name === 'customers') return [value, t('analytics.growth.newCustomers')];
                      if (name === 'bookings') return [value, t('analytics.growth.bookings')];
                      return [value, name];
                    }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px',
                    }}
                  />
                  <Legend />
                  
                  {/* Revenue as area chart */}
                  <Area
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                    name="revenue"
                  />
                  
                  {/* Customers and bookings as lines */}
                  <Line
                    yAxisId="count"
                    type="monotone"
                    dataKey="customers"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="customers"
                  />
                  <Line
                    yAxisId="count"
                    type="monotone"
                    dataKey="bookings"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    dot={{ fill: '#8B5CF6', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="bookings"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Cohort Retention Analysis */}
        {cohortData.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-5">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center">
                <Activity className="h-3 w-3 text-gray-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">
                {t('analytics.growth.cohortRetention')}
              </h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cohortData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    axisLine={{ stroke: '#e5e7eb' }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    formatter={(value: number, name) => [
                      `${value.toFixed(1)}%`,
                      name === 'retention' 
                        ? t('analytics.growth.customerRetention')
                        : t('analytics.growth.revenueRetention')
                    ]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="retention"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={{ fill: '#F59E0B', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="retention"
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={{ fill: '#EF4444', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Growth Insights */}
        <div className="mt-6 bg-blue-50 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Target className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">
                {t('analytics.growth.insights')}
              </h4>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                {data?.overallGrowthRate && data.overallGrowthRate > 10 && (
                  <p>• {t('analytics.growth.insightHighGrowth')}</p>
                )}
                {data?.retention && data.retention.current > 80 && (
                  <p>• {t('analytics.growth.insightHighRetention')}</p>
                )}
                {data?.revenueGrowth && data.revenueGrowth.growthRate > data.newCustomers.growthRate && (
                  <p>• {t('analytics.growth.insightRevenueOutpacing')}</p>
                )}
                {data?.newCustomers && data.newCustomers.growthRate < 5 && (
                  <p>• {t('analytics.growth.insightSlowCustomerGrowth')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}