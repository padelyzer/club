'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Zap,
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  Award,
  Target,
  BarChart3,
} from 'lucide-react';
import { PerformanceMetrics as PerformanceMetricsType } from '@/types/analytics';
import { MetricCard } from '@/components/charts/MetricCard';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';

interface PerformanceMetricsProps {
  data: PerformanceMetricsType | null;
  isLoading?: boolean;
}

export function PerformanceMetrics({
  data,
  isLoading,
}: PerformanceMetricsProps) {
  const { t } = useTranslation();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const performanceData = data
    ? [
        {
          metric: t('analytics.performance.efficiency'),
          value: data.operationalEfficiency.value,
          fullMark: 100,
        },
        {
          metric: t('analytics.performance.retention'),
          value: data.customerRetentionRate.value,
          fullMark: 100,
        },
        {
          metric: t('analytics.performance.nps'),
          value: (data.netPromoterScore.value + 100) / 2, // Convert from -100 to 100 range to 0-100
          fullMark: 100,
        },
        {
          metric: t('analytics.performance.utilization'),
          value: (data.revenuePerCourt.value / 1000) * 10, // Normalize for visualization
          fullMark: 100,
        },
      ]
    : [];

  const kpiData = data
    ? [
        {
          title: t('analytics.performance.revenuePerCourt'),
          value: formatCurrency(data.revenuePerCourt.value),
          previousValue: data.revenuePerCourt.previousValue
            ? formatCurrency(data.revenuePerCourt.previousValue)
            : undefined,
          icon: DollarSign,
          color: 'green' as const,
          trend: data.revenuePerCourt.trend,
        },
        {
          title: t('analytics.performance.revenuePerCustomer'),
          value: formatCurrency(data.revenuePerCustomer.value),
          previousValue: data.revenuePerCustomer.previousValue
            ? formatCurrency(data.revenuePerCustomer.previousValue)
            : undefined,
          icon: Users,
          color: 'blue' as const,
          trend: data.revenuePerCustomer.trend,
        },
        {
          title: t('analytics.performance.avgOccupancyDuration'),
          value: `${data.averageOccupancyDuration.value}h`,
          previousValue: data.averageOccupancyDuration.previousValue
            ? `${data.averageOccupancyDuration.previousValue}h`
            : undefined,
          icon: Clock,
          color: 'yellow' as const,
          trend: data.averageOccupancyDuration.trend,
        },
      ]
    : [];

  const getPerformanceLevel = (
    efficiency: number
  ): { label: string; color: string } => {
    if (efficiency >= 90)
      return {
        label: t('analytics.performance.excellent'),
        color: 'text-green-600 bg-green-100',
      };
    if (efficiency >= 75)
      return {
        label: t('analytics.performance.good'),
        color: 'text-blue-600 bg-blue-100',
      };
    if (efficiency >= 60)
      return {
        label: t('analytics.performance.moderate'),
        color: 'text-yellow-600 bg-yellow-100',
      };
    return {
      label: t('analytics.performance.needsImprovement'),
      color: 'text-red-600 bg-red-100',
    };
  };

  const performanceLevel = data
    ? getPerformanceLevel(data.operationalEfficiency.value)
    : null;

  return (
    <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
          <Zap className="h-6 w-6 text-purple-600" />
          <span>{t('analytics.performance.title')}</span>
        </h2>
        {performanceLevel && (
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${performanceLevel.color}`}
          >
            {performanceLevel.label}
          </span>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {kpiData.map((kpi) => (
          <div
            key={kpi.title}
            className="bg-white rounded-lg p-4 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-2">
              <kpi.icon className="h-5 w-5 text-gray-500" />
              {kpi.trend && (
                <TrendingUp
                  className={`h-4 w-4 ${
                    kpi.trend === 'up'
                      ? 'text-green-500'
                      : kpi.trend === 'down'
                        ? 'text-red-500 rotate-180'
                        : 'text-gray-500'
                  }`}
                />
              )}
            </div>
            <p className="text-xs text-gray-600 mb-1">{kpi.title}</p>
            <p className="text-lg font-semibold text-gray-900">{kpi.value}</p>
            {kpi.previousValue && (
              <p className="text-xs text-gray-500 mt-1">
                {t('analytics.performance.previous')}: {kpi.previousValue}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Performance Radar Chart */}
      {performanceData.length > 0 && (
        <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>{t('analytics.performance.overview')}</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={performanceData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fontSize: 12 }}
                  className="text-gray-600"
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                />
                <Radar
                  name="Performance"
                  dataKey="value"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Individual Performance Metrics */}
      <div className="space-y-4">
        {data && (
          <>
            {/* Customer Retention Rate */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {t('analytics.performance.customerRetention')}
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {data.customerRetentionRate.value.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={data.customerRetentionRate.value || ''}
                className="h-2"
              />
              {data.customerRetentionRate.changePercentage !== undefined && (
                <p className="text-xs text-gray-500 mt-2">
                  {data.customerRetentionRate.changePercentage > 0 ? '+' : ''}
                  {data.customerRetentionRate.changePercentage.toFixed(1)}%{' '}
                  {t('analytics.performance.vsPrevious')}
                </p>
              )}
            </div>

            {/* Net Promoter Score */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Award className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {t('analytics.performance.netPromoterScore')}
                  </span>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    data.netPromoterScore.value > 50
                      ? 'text-green-600'
                      : data.netPromoterScore.value > 0
                        ? 'text-blue-600'
                        : 'text-red-600'
                  }`}
                >
                  {data.netPromoterScore.value > 0 ? '+' : ''}
                  {data.netPromoterScore.value}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <Target className="h-3 w-3" />
                <span>
                  {data.netPromoterScore.value > 50
                    ? t('analytics.performance.npsExcellent')
                    : data.netPromoterScore.value > 0
                      ? t('analytics.performance.npsGood')
                      : t('analytics.performance.npsNeedsWork')}
                </span>
              </div>
            </div>

            {/* Operational Efficiency */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {t('analytics.performance.operationalEfficiency')}
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {data.operationalEfficiency.value.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={data.operationalEfficiency.value || ''}
                className="h-2"
              />
            </div>
          </>
        )}
      </div>

      {/* Performance Insights */}
      <div className="mt-4 bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          {t('analytics.performance.insights')}
        </h4>
        <div className="space-y-2">
          {data?.operationalEfficiency &&
            data.operationalEfficiency.value > 85 && (
              <p className="text-sm text-gray-600">
                • {t('analytics.performance.insightHighEfficiency')}
              </p>
            )}
          {data?.netPromoterScore && data.netPromoterScore.value > 50 && (
            <p className="text-sm text-gray-600">
              • {t('analytics.performance.insightHighNPS')}
            </p>
          )}
          {data?.revenuePerCourt && data.revenuePerCourt.trend === 'up' && (
            <p className="text-sm text-gray-600">
              • {t('analytics.performance.insightRevenueGrowth')}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
