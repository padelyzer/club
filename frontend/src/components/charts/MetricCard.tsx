'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3, Calendar, Users, DollarSign, LucideIcon } from 'lucide-react';
import { MetricCardConfig } from '@/types/analytics';
import { cn } from '@/lib/utils';

interface MetricCardProps extends MetricCardConfig {
  className?: string;
  onClick?: () => void;
  isLoading?: boolean;
}

const iconMap: Record<string, LucideIcon> = {
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'minus': Minus,
  'bar-chart': BarChart3,
  'calendar': Calendar,
  'users': Users,
  'dollar-sign': DollarSign,
};

export function MetricCard({
  title,
  value,
  previousValue,
  format = 'number',
  icon,
  color = 'gray',
  trend,
  sparkline,
  className,
  onClick,
  isLoading,
}: MetricCardProps) {
  const Icon = icon ? iconMap[icon] : null;
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'duration':
        return `${val}h`;
      default:
        return new Intl.NumberFormat('en-US').format(val);
    }
  };

  const calculateChange = (): { value: number; percentage: number } | null => {
    if (
      !previousValue ||
      typeof value !== 'number' ||
      typeof previousValue !== 'number'
    ) {
      return null;
    }

    const change = value - previousValue;
    const percentage = previousValue === 0 ? 0 : (change / previousValue) * 100;

    return { value: change, percentage };
  };

  const change = calculateChange();
  const actualTrend =
    trend ||
    (change
      ? change.value > 0
        ? 'up'
        : change.value < 0
          ? 'down'
          : 'stable'
      : 'stable');

  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    gray: 'bg-gray-50 border-gray-200 text-gray-900',
  };

  const trendColors = {
    up: 'text-green-600 bg-green-100',
    down: 'text-red-600 bg-red-100',
    stable: 'text-gray-600 bg-gray-100',
  };

  const TrendIcon =
    actualTrend === 'up'
      ? TrendingUp
      : actualTrend === 'down'
        ? TrendingDown
        : Minus;

  if (isLoading) {
    return (
      <div className={cn('p-6 rounded-xl border animate-pulse', className)}>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-6 rounded-xl border transition-all duration-200',
        colorClasses[color],
        onClick && 'cursor-pointer hover:shadow-md',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-2xl font-bold mt-2">{formatValue(value)}</p>

          {change && (
            <div className="flex items-center mt-2 space-x-2">
              <span
                className={cn(
                  'flex items-center px-2 py-1 rounded-full text-xs font-medium',
                  trendColors[actualTrend]
                )}
              >
                <TrendIcon className="h-3 w-3 mr-1" />
                {Math.abs(change.percentage).toFixed(1)}%
              </span>
              <span className="text-xs opacity-60">vs previous period</span>
            </div>
          )}
        </div>

        {Icon && (
          <div className="ml-4 p-3 rounded-lg bg-white bg-opacity-50">
            <Icon className="h-6 w-6 opacity-75" />
          </div>
        )}
      </div>

      {sparkline && sparkline.length > 0 && (
        <div className="mt-4 h-12">
          <svg
            className="w-full h-full"
            viewBox={`0 0 ${sparkline.length * 10} 48`}
            preserveAspectRatio="none"
          >
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeOpacity="0.3"
              points={sparkline
                .map((val, i) => {
                  const max = Math.max(...sparkline);
                  const min = Math.min(...sparkline);
                  const y = 48 - ((val - min) / (max - min)) * 48;
                  return `${i * 10},${y}`;
                })
                .join(' ')}
            />
          </svg>
        </div>
      )}
    </div>
  );
}
