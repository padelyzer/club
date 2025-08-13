'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MetricValue } from '@/types/analytics';
import { Card } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';

interface ComparisonChartProps {
  title: string;
  metrics: {
    revenue?: MetricValue | null;
    occupancy?: MetricValue | null;
    customers?: MetricValue | null;
    bookings?: MetricValue | null;
  };
  isLoading?: boolean;
}

export function ComparisonChart({
  title,
  metrics,
  isLoading,
}: ComparisonChartProps) {
  const { t } = useTranslation();

  const prepareData = () => {
    const data = [];

    if (metrics.revenue) {
      data.push({
        name: t('analytics.metrics.revenue'),
        current: metrics.revenue.value,
        previous: metrics.revenue.previousValue || 0,
        change: metrics.revenue.changePercentage || 0,
        format: 'currency',
      });
    }

    if (metrics.occupancy) {
      data.push({
        name: t('analytics.metrics.occupancy'),
        current: metrics.occupancy.value,
        previous: metrics.occupancy.previousValue || 0,
        change: metrics.occupancy.changePercentage || 0,
        format: 'percentage',
      });
    }

    if (metrics.customers) {
      data.push({
        name: t('analytics.metrics.customers'),
        current: metrics.customers.value,
        previous: metrics.customers.previousValue || 0,
        change: metrics.customers.changePercentage || 0,
        format: 'number',
      });
    }

    if (metrics.bookings) {
      data.push({
        name: t('analytics.metrics.bookings'),
        current: metrics.bookings.value,
        previous: metrics.bookings.previousValue || 0,
        change: metrics.bookings.changePercentage || 0,
        format: 'number',
      });
    }

    return data;
  };

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-[300px] bg-gray-100 rounded"></div>
        </div>
      </Card>
    );
  }

  const data = prepareData();

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          {t('analytics.noDataAvailable')}
        </div>
      </Card>
    );
  }

  // Normalize data for better visualization
  const normalizedData = data.map((item) => {
    if (item.format === 'currency') {
      return {
        ...item,
        displayCurrent: item.current,
        displayPrevious: item.previous,
        current: item.current / 1000, // Convert to thousands for better scale
        previous: item.previous / 1000,
      };
    }
    return {
      ...item,
      displayCurrent: item.current,
      displayPrevious: item.previous,
    };
  });

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <BarChart2 className="h-5 w-5 text-gray-500" />
          <span>{title}</span>
        </h3>
      </div>

      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={normalizedData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
              axisLine={{ stroke: '#e5e7eb' }}
              tickFormatter={(value) => {
                // Find the first currency item to determine formatting
                const currencyItem = normalizedData.find(
                  (item) => item.format === 'currency'
                );
                if (currencyItem) {
                  return `€${value}k`;
                }
                return value;
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-medium text-gray-900 mb-2">
                        {data.name}
                      </p>
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="text-gray-600">
                            {t('analytics.current')}:
                          </span>{' '}
                          <span className="font-semibold">
                            {formatValue(data.displayCurrent, data.format)}
                          </span>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-600">
                            {t('analytics.previous')}:
                          </span>{' '}
                          <span className="font-semibold">
                            {formatValue(data.displayPrevious, data.format)}
                          </span>
                        </p>
                        <div className="flex items-center space-x-1 pt-1 border-t">
                          {getChangeIcon(data.change)}
                          <span
                            className={`text-sm font-medium ${
                              data.change > 0
                                ? 'text-green-600'
                                : data.change < 0
                                  ? 'text-red-600'
                                  : 'text-gray-600'
                            }`}
                          >
                            {data.change > 0 ? '+' : ''}
                            {data.change.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Bar dataKey="previous" fill="#E5E7EB" radius={[8, 8, 0, 0]} />
            <Bar dataKey="current" radius={[8, 8, 0, 0]}>
              {normalizedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.change > 0
                      ? '#10B981'
                      : entry.change < 0
                        ? '#EF4444'
                        : '#6B7280'
                  }
                />
              ))}
              <LabelList
                position="top"
                content={({ x, y, width, value, index }) => {
                  const item = normalizedData[index!];
                  if (!item) return null;
                  return (
                    <g transform={`translate(${Number(x!) + Number(width!) / 2},${Number(y!) - 10})`}>
                      <text
                        x={0}
                        y={0}
                        fill={
                          item.change > 0
                            ? '#10B981'
                            : item.change < 0
                              ? '#EF4444'
                              : '#6B7280'
                        }
                        textAnchor="middle"
                        fontSize={12}
                        fontWeight={500}
                      >
                        {item.change > 0 ? '+' : ''}
                        {item.change.toFixed(1)}%
                      </text>
                    </g>
                  );
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-gray-300"></div>
          <span className="text-gray-600">{t('analytics.previousPeriod')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-green-500"></div>
          <span className="text-gray-600">{t('analytics.currentPeriod')}</span>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          {t('analytics.comparisonSummary', {
            improved: data.filter((d) => d.change > 0).length,
            total: data.length,
          })}
        </p>
      </div>
    </Card>
  );
}
