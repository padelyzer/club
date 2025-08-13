'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Clock,
  Sunrise,
  Sun,
  Moon,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { OccupancyMetrics as OccupancyMetricsType } from '@/types/analytics';
import { MetricCard } from '@/components/charts/MetricCard';
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
} from 'recharts';
import { Progress } from '@/components/ui/progress';

interface OccupancyMetricsProps {
  data: OccupancyMetricsType | null;
  isLoading?: boolean;
}

export function OccupancyMetrics({ data, isLoading }: OccupancyMetricsProps) {
  const { t } = useTranslation();

  const timeSlotData = data
    ? [
        {
          name: t('analytics.occupancy.morning'),
          value: data.byTimeSlot.morning.value,
          icon: Sunrise,
          color: '#FDE68A',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-700',
        },
        {
          name: t('analytics.occupancy.afternoon'),
          value: data.byTimeSlot.afternoon.value,
          icon: Sun,
          color: '#FCD34D',
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-700',
        },
        {
          name: t('analytics.occupancy.evening'),
          value: data.byTimeSlot.evening.value,
          icon: Moon,
          color: '#7C3AED',
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-700',
        },
      ]
    : [];

  const courtData = data
    ? Object.entries(data.byCourt).map(([court, metrics]) => ({
        name: court,
        value: metrics.value,
        color:
          metrics.value > 80
            ? '#10B981'
            : metrics.value > 60
              ? '#3B82F6'
              : metrics.value > 40
                ? '#F59E0B'
                : '#EF4444',
      }))
    : [];

  const getOccupancyColor = (value: number) => {
    if (value >= 80) return 'text-green-600 bg-green-100';
    if (value >= 60) return 'text-blue-600 bg-blue-100';
    if (value >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getOccupancyStatus = (value: number) => {
    if (value >= 80) return t('analytics.occupancy.status.excellent');
    if (value >= 60) return t('analytics.occupancy.status.good');
    if (value >= 40) return t('analytics.occupancy.status.moderate');
    return t('analytics.occupancy.status.low');
  };

  return (
    <div className="space-y-6">
      {/* Apple-style Main Occupancy Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center">
              <Activity className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              {t('analytics.occupancy.title')}
            </h2>
          </div>
          {data?.utilizationRate && (
            <div className="text-sm text-gray-500">
              {t('analytics.occupancy.utilization')}:{' '}
              <span
                className={`font-semibold px-3 py-1 rounded-lg ${getOccupancyColor(data.utilizationRate.value)}`}
              >
                {data.utilizationRate.value.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* Overall Occupancy */}
        <div className="mb-6">
          <MetricCard
            title={t('analytics.occupancy.overall')}
            value={data?.overall.value || 0}
            previousValue={data?.overall.previousValue || 0}
            format="percentage"
            trend={data?.overall.trend || 'stable'}
            color="blue"
            icon="trending-up"
            isLoading={isLoading || false}
          />
        </div>

        {/* Apple-style Time Slot Distribution */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center">
              <Clock className="h-3 w-3 text-gray-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">
              {t('analytics.occupancy.byTimeSlot')}
            </h3>
          </div>
          <div className="space-y-3">
            {timeSlotData.map((slot) => (
              <div
                key={slot.name}
                className="bg-gray-50 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg ${slot.bgColor} flex items-center justify-center`}>
                      <slot.icon className={`h-4 w-4 ${slot.textColor}`} />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {slot.name}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {slot.value.toFixed(1)}%
                  </span>
                </div>
                <Progress value={slot.value || ''} className="h-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Apple-style Court Occupancy Chart */}
        {courtData.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-5">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
              </div>
              <h3 className="text-sm font-semibold text-gray-900">
                {t('analytics.occupancy.byCourt')}
              </h3>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courtData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    domain={[0, 100]}
                  />
                  <Tooltip
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px',
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {courtData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Apple-style Peak Hours */}
        {data?.peakHours && data.peakHours.length > 0 && (
          <div className="mt-4 bg-blue-50 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">
                  {t('analytics.occupancy.peakHours')}
                </h4>
                <p className="text-sm text-gray-600 mt-1 font-medium">
                  {data.peakHours.join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Apple-style Occupancy Status */}
        {data?.overall && (
          <div className="mt-4 bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">
                {t('analytics.occupancy.currentStatus')}
              </span>
              <span
                className={`font-semibold px-3 py-1 rounded-lg text-sm ${getOccupancyColor(data.overall.value)}`}
              >
                {getOccupancyStatus(data.overall.value)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
