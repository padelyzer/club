'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { MetricCard } from '@/components/charts/MetricCard';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface KPIMetric {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  trend: 'up' | 'down' | 'stable';
  changePercentage?: number;
  target?: number;
  unit: 'currency' | 'percentage' | 'number' | 'duration';
  category: 'revenue' | 'occupancy' | 'customers' | 'operations';
}

interface KPIDashboardData {
  totalRevenue: KPIMetric;
  occupancyRate: KPIMetric;
  activeUsers: KPIMetric;
  courtUtilization: KPIMetric;
  avgBookingValue: KPIMetric;
  customerSatisfaction: KPIMetric;
  newCustomers: KPIMetric;
  retentionRate: KPIMetric;
  monthlyRecurringRevenue: KPIMetric;
  peakHourUtilization: KPIMetric;
  lastUpdated: string;
  alertsCount: number;
  healthScore: number;
}

interface KPIDashboardProps {
  data: KPIDashboardData | null;
  isLoading?: boolean;
  compact?: boolean;
}

export function KPIDashboard({ data, isLoading, compact = false }: KPIDashboardProps) {
  const { t } = useTranslation();

  const formatValue = (value: number, unit: string) => {
    switch (unit) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'duration':
        return `${value.toFixed(1)}h`;
      default:
        return value.toLocaleString();
    }
  };

  const getMetricIcon = (category: string) => {
    switch (category) {
      case 'revenue':
        return DollarSign;
      case 'occupancy':
        return Activity;
      case 'customers':
        return Users;
      case 'operations':
        return Clock;
      default:
        return Target;
    }
  };

  const getMetricColor = (trend: string, changePercentage?: number) => {
    if (trend === 'up') return 'green';
    if (trend === 'down') return 'red';
    return 'gray';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return TrendingUp;
      case 'down':
        return TrendingDown;
      default:
        return Target;
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getHealthScoreStatus = (score: number) => {
    if (score >= 80) return { text: t('analytics.kpi.healthExcellent'), icon: CheckCircle };
    if (score >= 60) return { text: t('analytics.kpi.healthGood'), icon: Target };
    if (score >= 40) return { text: t('analytics.kpi.healthModerate'), icon: AlertCircle };
    return { text: t('analytics.kpi.healthPoor'), icon: AlertCircle };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p>{t('analytics.kpi.noDataAvailable')}</p>
        </div>
      </Card>
    );
  }

  const mainKPIs = [
    data.totalRevenue,
    data.occupancyRate,
    data.activeUsers,
    data.courtUtilization,
  ];

  const secondaryKPIs = [
    data.avgBookingValue,
    data.customerSatisfaction,
    data.newCustomers,
    data.retentionRate,
  ];

  const additionalKPIs = [
    data.monthlyRecurringRevenue,
    data.peakHourUtilization,
  ];

  const healthStatus = getHealthScoreStatus(data.healthScore);
  const HealthIcon = healthStatus.icon;

  return (
    <div className="space-y-6">
      {/* Health Score & Status Banner */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getHealthScoreColor(data.healthScore)}`}>
              <HealthIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {t('analytics.kpi.clubHealthScore')}
              </h3>
              <p className="text-sm text-gray-600">{healthStatus.text}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {data.healthScore}/100
            </div>
            {data.alertsCount > 0 && (
              <div className="flex items-center space-x-1 text-sm text-amber-600">
                <AlertCircle className="h-3 w-3" />
                <span>{data.alertsCount} {t('analytics.kpi.alerts')}</span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-3">
          <Progress value={data.healthScore} className="h-2" />
        </div>
      </Card>

      {/* Main KPIs */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Target className="h-5 w-5 text-blue-600" />
          <span>{t('analytics.kpi.primaryMetrics')}</span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {mainKPIs.map((kpi) => {
            const Icon = getMetricIcon(kpi.category);
            const TrendIcon = getTrendIcon(kpi.trend);
            
            return (
              <Card key={kpi.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <Icon className="h-5 w-5 text-gray-500" />
                  <div className="flex items-center space-x-1">
                    <TrendIcon
                      className={`h-3 w-3 ${
                        kpi.trend === 'up'
                          ? 'text-green-600'
                          : kpi.trend === 'down'
                            ? 'text-red-600 rotate-180'
                            : 'text-gray-600'
                      }`}
                    />
                    {kpi.changePercentage !== undefined && (
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          kpi.trend === 'up'
                            ? 'bg-green-100 text-green-700'
                            : kpi.trend === 'down'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {kpi.changePercentage > 0 ? '+' : ''}{kpi.changePercentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="mb-2">
                  <p className="text-xs text-gray-600 mb-1">{kpi.name}</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatValue(kpi.value, kpi.unit)}
                  </p>
                </div>

                {kpi.previousValue !== undefined && (
                  <p className="text-xs text-gray-500">
                    {t('analytics.kpi.previous')}: {formatValue(kpi.previousValue, kpi.unit)}
                  </p>
                )}

                {kpi.target !== undefined && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{t('analytics.kpi.target')}</span>
                      <span>{formatValue(kpi.target, kpi.unit)}</span>
                    </div>
                    <Progress 
                      value={(kpi.value / kpi.target) * 100} 
                      className="h-1" 
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Secondary KPIs */}
      {!compact && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Activity className="h-5 w-5 text-purple-600" />
            <span>{t('analytics.kpi.secondaryMetrics')}</span>
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {secondaryKPIs.map((kpi) => {
              const Icon = getMetricIcon(kpi.category);
              const TrendIcon = getTrendIcon(kpi.trend);
              
              return (
                <Card key={kpi.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-4 w-4 text-gray-500" />
                    <TrendIcon
                      className={`h-3 w-3 ${
                        kpi.trend === 'up'
                          ? 'text-green-600'
                          : kpi.trend === 'down'
                            ? 'text-red-600 rotate-180'
                            : 'text-gray-600'
                      }`}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mb-1">{kpi.name}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatValue(kpi.value, kpi.unit)}
                  </p>
                  {kpi.changePercentage !== undefined && (
                    <p className="text-xs text-gray-500 mt-1">
                      {kpi.changePercentage > 0 ? '+' : ''}{kpi.changePercentage.toFixed(1)}%
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Additional Metrics */}
      {!compact && additionalKPIs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-orange-600" />
            <span>{t('analytics.kpi.additionalMetrics')}</span>
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {additionalKPIs.map((kpi) => {
              const Icon = getMetricIcon(kpi.category);
              
              return (
                <Card key={kpi.id} className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{kpi.name}</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatValue(kpi.value, kpi.unit)}
                      </p>
                      {kpi.changePercentage !== undefined && (
                        <p className="text-xs text-gray-500">
                          {kpi.changePercentage > 0 ? '+' : ''}{kpi.changePercentage.toFixed(1)}% vs {t('analytics.kpi.previousPeriod')}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-center text-xs text-gray-500">
        {t('analytics.kpi.lastUpdated')}: {new Date(data.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
}