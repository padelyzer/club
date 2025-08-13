'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  ShoppingCart,
  Users,
  Calendar,
  Banknote,
  ArrowUpRight,
} from 'lucide-react';
import { RevenueMetrics as RevenueMetricsType } from '@/types/analytics';
import { MetricCard } from '@/components/charts/MetricCard';
import { Card } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from '@/components/charts/lazy-recharts';

interface RevenueMetricsProps {
  data: RevenueMetricsType | null;
  isLoading?: boolean;
}

export function RevenueMetrics({ data, isLoading }: RevenueMetricsProps) {
  const { t } = useTranslation();

  const paymentMethodData = data
    ? [
        {
          name: t('analytics.paymentMethods.cash'),
          value: data.byPaymentMethod.cash,
          color: '#10B981',
        },
        {
          name: t('analytics.paymentMethods.card'),
          value: data.byPaymentMethod.card,
          color: '#3B82F6',
        },
        {
          name: t('analytics.paymentMethods.transfer'),
          value: data.byPaymentMethod.transfer,
          color: '#8B5CF6',
        },
        {
          name: t('analytics.paymentMethods.other'),
          value: data.byPaymentMethod.other,
          color: '#F59E0B',
        },
      ].filter((item) => item.value > 0)
    : [];

  const sourceData = data
    ? [
        {
          name: t('analytics.revenueSources.reservations'),
          value: data.bySource.reservations.value,
          change: data.bySource.reservations.changePercentage,
          icon: Calendar,
          color: 'blue',
        },
        {
          name: t('analytics.revenueSources.memberships'),
          value: data.bySource.memberships.value,
          change: data.bySource.memberships.changePercentage,
          icon: Users,
          color: 'green',
        },
        {
          name: t('analytics.revenueSources.classes'),
          value: data.bySource.classes.value,
          change: data.bySource.classes.changePercentage,
          icon: Users,
          color: 'yellow',
        },
        {
          name: t('analytics.revenueSources.products'),
          value: data.bySource.products.value,
          change: data.bySource.products.changePercentage,
          icon: ShoppingCart,
          color: 'red',
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

  return (
    <div className="space-y-6">
      {/* Apple-style Main Revenue Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              {t('analytics.revenue.title')}
            </h2>
          </div>
          {data?.projectedRevenue && (
            <div className="text-sm text-gray-500">
              {t('analytics.revenue.projected')}:{' '}
              <span className="font-semibold text-gray-900">
                {formatCurrency(data.projectedRevenue)}
              </span>
            </div>
          )}
        </div>

        {/* Total Revenue */}
        <div className="mb-6">
          <MetricCard
            title={t('analytics.revenue.total')}
            value={data?.total.value || 0}
            previousValue={data?.total.previousValue || 0}
            format="currency"
            trend={data?.total.trend || 'stable'}
            color="blue"
            icon="trending-up"
            isLoading={isLoading || false}
          />
        </div>

        {/* Apple-style Revenue by Source */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {sourceData.map((source) => (
            <div
              key={source.name}
              className="bg-gray-50 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center">
                    <source.icon className="h-3 w-3 text-gray-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {source.name}
                  </span>
                </div>
                {source.change !== undefined && (
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-lg ${
                      source.change > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {source.change > 0 ? '+' : ''}
                    {source.change.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(source.value)}
              </p>
            </div>
          ))}
        </div>

        {/* Apple-style Payment Methods Chart */}
        {paymentMethodData.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-5">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center">
                <CreditCard className="h-3 w-3 text-gray-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">
                {t('analytics.revenue.byPaymentMethod')}
              </h3>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string, entry: { value: number }) => (
                      <span className="text-xs">
                        {value}: {formatCurrency(entry.value)}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Apple-style Average Transaction Value */}
        {data?.averageTransactionValue && (
          <div className="mt-4 bg-gray-50 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center">
                  <Banknote className="h-3 w-3 text-gray-600" />
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {t('analytics.revenue.averageTransaction')}
                </span>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(data.averageTransactionValue.value)}
                </p>
                {data.averageTransactionValue.changePercentage !==
                  undefined && (
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-lg ${
                      data.averageTransactionValue.changePercentage > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {data.averageTransactionValue.changePercentage > 0
                      ? '+'
                      : ''}
                    {data.averageTransactionValue.changePercentage.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
