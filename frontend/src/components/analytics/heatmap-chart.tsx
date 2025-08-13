'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Grid3X3, Info } from 'lucide-react';
import { HeatmapData } from '@/types/analytics';
import { Card } from '@/components/ui/card';
import { Tooltip as UITooltip } from '@/components/ui/tooltip';

interface HeatmapChartProps {
  title: string;
  data: HeatmapData | null;
  type: 'occupancy' | 'revenue';
  isLoading?: boolean;
}

export function HeatmapChart({
  title,
  data,
  type,
  isLoading,
}: HeatmapChartProps) {
  const { t } = useTranslation();

  const days = [
    t('analytics.days.monday'),
    t('analytics.days.tuesday'),
    t('analytics.days.wednesday'),
    t('analytics.days.thursday'),
    t('analytics.days.friday'),
    t('analytics.days.saturday'),
    t('analytics.days.sunday'),
  ];

  const hours = Array.from({ length: 17 }, (_, i) => {
    const hour = i + 7; // Start from 7 AM
    return `${hour}:00`;
  });

  const getColorIntensity = (
    value: number,
    min: number,
    max: number
  ): string => {
    if (!data || max === min) return 'bg-gray-100';

    const normalized = (value - min) / (max - min);

    if (type === 'occupancy') {
      // Blue gradient for occupancy
      if (normalized < 0.2) return 'bg-blue-100';
      if (normalized < 0.4) return 'bg-blue-200';
      if (normalized < 0.6) return 'bg-blue-300';
      if (normalized < 0.8) return 'bg-blue-400';
      return 'bg-blue-500';
    } else {
      // Green gradient for revenue
      if (normalized < 0.2) return 'bg-green-100';
      if (normalized < 0.4) return 'bg-green-200';
      if (normalized < 0.6) return 'bg-green-300';
      if (normalized < 0.8) return 'bg-green-400';
      return 'bg-green-500';
    }
  };

  const formatValue = (value: number): string => {
    if (type === 'occupancy') {
      return `${value.toFixed(0)}%`;
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
  };

  const getCellValue = (day: number, hour: number): number => {
    if (!data || !data.data) return 0;

    const cell = data.data.find((d) => d.day === day && d.hour === hour);
    return cell ? cell.value : 0;
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-[400px] bg-gray-100 rounded"></div>
        </div>
      </Card>
    );
  }

  if (!data || !data.data || data.data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="h-[400px] flex items-center justify-center text-gray-500">
          {t('analytics.noDataAvailable')}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Grid3X3 className="h-5 w-5 text-gray-500" />
          <span>{title}</span>
        </h3>
        <UITooltip content={t('analytics.heatmapInfo')}>
          <Info className="h-4 w-4 text-gray-400 cursor-help" />
        </UITooltip>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Hours header */}
          <div className="flex ml-20 mb-2">
            {hours.map((hour) => (
              <div
                key={hour}
                className="flex-1 text-xs text-gray-600 text-center"
                style={{ minWidth: '40px' }}
              >
                {hour}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="space-y-1">
            {days.map((day, dayIndex) => (
              <div key={day} className="flex items-center">
                <div className="w-20 text-sm text-gray-700 font-medium pr-2 text-right">
                  {day}
                </div>
                <div className="flex flex-1 space-x-1">
                  {hours.map((_, hourIndex) => {
                    const value = getCellValue(dayIndex, hourIndex + 7);
                    const colorClass = getColorIntensity(
                      value,
                      data.minValue,
                      data.maxValue
                    );

                    return (
                      <div
                        key={`${dayIndex}-${hourIndex}`}
                        className="relative group"
                        style={{ minWidth: '40px' }}
                      >
                        <div
                          className={`h-8 rounded transition-all duration-200 cursor-pointer hover:ring-2 hover:ring-offset-1 ${
                            type === 'occupancy'
                              ? 'hover:ring-blue-400'
                              : 'hover:ring-green-400'
                          } ${colorClass}`}
                        />
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                          <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                            <div className="font-medium">
                              {formatValue(value)}
                            </div>
                            <div className="text-gray-300">
                              {day} {hours[hourIndex]}
                            </div>
                          </div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {t('analytics.low')}
              </span>
              <div className="flex space-x-1">
                {[100, 200, 300, 400, 500].map((intensity) => (
                  <div
                    key={intensity}
                    className={`w-6 h-6 rounded ${
                      type === 'occupancy'
                        ? `bg-blue-${intensity}`
                        : `bg-green-${intensity}`
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {t('analytics.high')}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              {t('analytics.range')}: {formatValue(data.minValue)} -{' '}
              {formatValue(data.maxValue)}
            </div>
          </div>

          {/* Insights */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              {type === 'occupancy'
                ? t('analytics.heatmapInsightOccupancy')
                : t('analytics.heatmapInsightRevenue')}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
