'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Trophy,
  Heart,
  TrendingUp,
  Star,
} from 'lucide-react';
import { CustomerMetrics as CustomerMetricsType } from '@/types/analytics';
import { MetricCard } from '@/components/charts/MetricCard';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface CustomerMetricsProps {
  data: CustomerMetricsType | null;
  isLoading?: boolean;
}

export function CustomerMetrics({ data, isLoading }: CustomerMetricsProps) {
  const { t } = useTranslation();

  const metricsGrid = data
    ? [
        {
          title: t('analytics.customers.new'),
          value: data.newCustomers.value,
          previousValue: data.newCustomers.previousValue,
          icon: UserPlus,
          color: 'green' as const,
        },
        {
          title: t('analytics.customers.returning'),
          value: data.returningCustomers.value,
          previousValue: data.returningCustomers.previousValue,
          icon: UserCheck,
          color: 'blue' as const,
        },
        {
          title: t('analytics.customers.churnRate'),
          value: data.churnRate.value,
          previousValue: data.churnRate.previousValue,
          format: 'percentage' as const,
          icon: UserX,
          color: 'red' as const,
          invertTrend: true, // Lower is better
        },
        {
          title: t('analytics.customers.satisfaction'),
          value: data.satisfactionScore.value,
          previousValue: data.satisfactionScore.previousValue,
          format: 'number' as const,
          icon: Heart,
          color: 'yellow' as const,
        },
      ]
    : [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Main Customer Card */}
      <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
            <Users className="h-6 w-6 text-green-600" />
            <span>{t('analytics.customers.title')}</span>
          </h2>
          {data?.averageLifetimeValue && (
            <div className="text-sm text-gray-600">
              {t('analytics.customers.avgLifetimeValue')}:{' '}
              <span className="font-semibold text-gray-900">
                {formatCurrency(data.averageLifetimeValue.value)}
              </span>
            </div>
          )}
        </div>

        {/* Total Active Customers */}
        <div className="mb-6">
          <MetricCard
            title={t('analytics.customers.totalActive')}
            value={data?.totalActive.value || 0}
            {...(data?.totalActive.previousValue !== undefined && {
              previousValue: data.totalActive.previousValue,
            })}
            format="number"
            {...(data?.totalActive.trend && { trend: data.totalActive.trend })}
            color="green"
            icon="trending-up"
            {...(isLoading !== undefined && { isLoading })}
          />
        </div>

        {/* Customer Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {metricsGrid.map((metric) => (
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
              </p>
            </div>
          ))}
        </div>

        {/* Top Customers */}
        {data?.topCustomers && data.topCustomers.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <Trophy className="h-4 w-4" />
                <span>{t('analytics.customers.topCustomers')}</span>
              </h3>
              <Badge variant="secondary" className="text-xs">
                {t('analytics.customers.thisMonth')}
              </Badge>
            </div>
            <div className="space-y-3">
              {data.topCustomers.slice(0, 5).map((customer, index) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <div className="h-full w-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                          {getInitials(customer.name)}
                        </div>
                      </Avatar>
                      {index < 3 && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 bg-yellow-400 rounded-full flex items-center justify-center">
                          <Star className="h-2.5 w-2.5 text-yellow-900 fill-current" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {customer.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {customer.reservations}{' '}
                        {t('analytics.customers.reservations')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(customer.totalSpent)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {customer.membershipStatus === 'active' && (
                        <Badge variant="success" className="text-xs">
                          {t('analytics.customers.member')}
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Insights */}
        <div className="mt-4 bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            {t('analytics.customers.insights')}
          </h4>
          <div className="space-y-2">
            {data?.newCustomers &&
              data.newCustomers.changePercentage &&
              data.newCustomers.changePercentage > 20 && (
                <p className="text-sm text-gray-700 font-medium">
                  •{' '}
                  {t('analytics.customers.insightGrowth', {
                    percentage: data.newCustomers.changePercentage.toFixed(0),
                  })}
                </p>
              )}
            {data?.churnRate && data.churnRate.value < 5 && (
              <p className="text-sm text-gray-700 font-medium">
                • {t('analytics.customers.insightLowChurn')}
              </p>
            )}
            {data?.satisfactionScore && data.satisfactionScore.value > 4.5 && (
              <p className="text-sm text-gray-700 font-medium">
                • {t('analytics.customers.insightHighSatisfaction')}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
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
      className={`text-xs font-medium px-2 py-1 rounded-lg ${
        isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {percentage > 0 ? '+' : ''}
      {percentage.toFixed(1)}%
    </span>
  );
}
