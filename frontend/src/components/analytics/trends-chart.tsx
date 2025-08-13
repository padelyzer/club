'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Calendar, Filter } from 'lucide-react';
import { TrendData } from '@/types/analytics';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
} from 'recharts';

interface TrendsChartProps {
  title: string;
  data: TrendData | null;
  type: 'revenue' | 'occupancy' | 'bookings' | 'customers';
  isLoading?: boolean;
  showComparison?: boolean;
  height?: number;
}

export function TrendsChart({
  title,
  data,
  type,
  isLoading,
  showComparison = true,
  height = 300,
}: TrendsChartProps) {
  const { t } = useTranslation();

  const getChartColor = () => {
    switch (type) {
      case 'revenue':
        return { current: '#10B981', previous: '#6EE7B7' };
      case 'occupancy':
        return { current: '#3B82F6', previous: '#93C5FD' };
      case 'bookings':
        return { current: '#8B5CF6', previous: '#C4B5FD' };
      case 'customers':
        return { current: '#F59E0B', previous: '#FCD34D' };
      default:
        return { current: '#6B7280', previous: '#D1D5DB' };
    }
  };

  const formatValue = (value: number) => {
    switch (type) {
      case 'revenue':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      case 'occupancy':
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  };

  const colors = getChartColor();

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

  if (!data || !data.datasets || data.datasets.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          {t('analytics.noDataAvailable')}
        </div>
      </Card>
    );
  }

  // Transform data for Recharts
  const chartData = data.labels.map((label, index) => {
    const point: any = { name: label };
    data.datasets.forEach((dataset) => {
      if (dataset.label === 'Current' || !dataset.label) {
        point.current = dataset.data[index];
      } else if (dataset.label === 'Previous' && dataset.previousData) {
        point.previous = dataset.previousData[index];
      }
    });
    return point;
  });

  const showArea = type === 'revenue' || type === 'occupancy';
  const ChartComponent = showArea ? AreaChart : LineChart;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-gray-500" />
          <span>{title}</span>
        </h3>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-1" />
            {t('analytics.customRange')}
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={chartData}>
            <defs>
              <linearGradient
                id={`gradient-${type}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={colors.current}
                  stopOpacity={0.3}
                />
                <stop offset="95%" stopColor={colors.current} stopOpacity={0} />
              </linearGradient>
            </defs>
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
                if (type === 'revenue') return `€${(value / 1000).toFixed(0)}k`;
                if (type === 'occupancy') return `${value}%`;
                return value.toLocaleString();
              }}
            />
            <Tooltip
              formatter={formatValue}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px',
              }}
              labelStyle={{ color: '#374151', fontWeight: 500 }}
            />
            {showComparison && data.datasets[0]?.previousData && (
              <Legend
                verticalAlign="top"
                height={36}
                iconType="line"
                formatter={(value) => {
                  if (value === 'current') return t('analytics.currentPeriod');
                  if (value === 'previous')
                    return t('analytics.previousPeriod');
                  return value;
                }}
              />
            )}

            {showArea ? (
              <>
                <Area
                  type="monotone"
                  dataKey="current"
                  stroke={colors.current}
                  strokeWidth={2}
                  fill={`url(#gradient-${type})`}
                  name="current"
                />
                {showComparison && data.datasets[0]?.previousData && (
                  <Area
                    type="monotone"
                    dataKey="previous"
                    stroke={colors.previous}
                    strokeWidth={2}
                    fill="none"
                    strokeDasharray="5 5"
                    name="previous"
                  />
                )}
              </>
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey="current"
                  stroke={colors.current}
                  strokeWidth={2}
                  dot={{ fill: colors.current, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="current"
                />
                {showComparison && data.datasets[0]?.previousData && (
                  <Line
                    type="monotone"
                    dataKey="previous"
                    stroke={colors.previous}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: colors.previous, r: 3 }}
                    name="previous"
                  />
                )}
              </>
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </div>

      {/* Chart Summary */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors.current }}
            ></div>
            <span className="text-gray-600">
              {t('analytics.currentPeriod')}
            </span>
          </div>
          {showComparison && data.datasets[0]?.previousData && (
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors.previous }}
              ></div>
              <span className="text-gray-600">
                {t('analytics.previousPeriod')}
              </span>
            </div>
          )}
        </div>
        <span className="text-gray-500">
          {t('analytics.dataPoints', { count: chartData.length })}
        </span>
      </div>
    </Card>
  );
}
