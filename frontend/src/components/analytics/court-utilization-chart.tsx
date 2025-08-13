'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Clock,
  MapPin,
  TrendingUp,
  AlertTriangle,
  Target,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from '@/components/charts/lazy-recharts';

interface CourtUtilizationData {
  courtId: string;
  courtName: string;
  utilizationRate: number;
  hoursActive: number;
  totalHours: number;
  revenue: number;
  bookingsCount: number;
  trend: 'up' | 'down' | 'stable';
  peakHours: string[];
  maintenanceScheduled: boolean;
  efficiency: number;
}

interface TimeSlotData {
  hour: string;
  utilization: number;
  revenue: number;
  bookings: number;
  isPeak: boolean;
}

interface CourtUtilizationChartProps {
  courts: CourtUtilizationData[];
  timeSlots: TimeSlotData[];
  isLoading?: boolean;
  showRevenue?: boolean;
  compact?: boolean;
}

export function CourtUtilizationChart({
  courts,
  timeSlots,
  isLoading,
  showRevenue = true,
  compact = false,
}: CourtUtilizationChartProps) {
  const { t } = useTranslation();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return '#10B981'; // Green
    if (rate >= 60) return '#3B82F6'; // Blue
    if (rate >= 40) return '#F59E0B'; // Orange
    return '#EF4444'; // Red
  };

  const getUtilizationStatus = (rate: number) => {
    if (rate >= 80) return { text: t('analytics.courts.excellent'), color: 'bg-green-100 text-green-700' };
    if (rate >= 60) return { text: t('analytics.courts.good'), color: 'bg-blue-100 text-blue-700' };
    if (rate >= 40) return { text: t('analytics.courts.moderate'), color: 'bg-yellow-100 text-yellow-700' };
    return { text: t('analytics.courts.low'), color: 'bg-red-100 text-red-700' };
  };

  const getEfficiencyIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'down':
        return <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />;
      default:
        return <Target className="h-3 w-3 text-gray-600" />;
    }
  };

  const averageUtilization = courts.length > 0 
    ? courts.reduce((sum, court) => sum + court.utilizationRate, 0) / courts.length 
    : 0;

  const totalRevenue = courts.reduce((sum, court) => sum + court.revenue, 0);
  const totalBookings = courts.reduce((sum, court) => sum + court.bookingsCount, 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl"></div>
            ))}
          </div>
          <div className="h-80 bg-gray-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Apple-style Header with Summary */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              {t('analytics.courts.utilization')}
            </h2>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">
              {t('analytics.courts.averageUtilization')}
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {averageUtilization.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {t('analytics.courts.activeCourts')}
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {courts.length}
                </p>
              </div>
            </div>
          </div>

          {showRevenue && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {t('analytics.courts.totalRevenue')}
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(totalRevenue)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Clock className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {t('analytics.courts.totalBookings')}
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {totalBookings}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Individual Court Performance */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {t('analytics.courts.individualPerformance')}
          </h3>
          {courts.map((court) => {
            const status = getUtilizationStatus(court.utilizationRate);
            return (
              <div key={court.courtId} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">
                        {court.courtName}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {court.hoursActive}h / {court.totalHours}h {t('analytics.courts.active')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {court.maintenanceScheduled && (
                      <Badge variant="outline" className="text-orange-700 border-orange-200">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {t('analytics.courts.maintenance')}
                      </Badge>
                    )}
                    <Badge className={status.color}>
                      {status.text}
                    </Badge>
                    {getEfficiencyIcon(court.trend)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">
                      {t('analytics.courts.utilization')}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {court.utilizationRate.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={court.utilizationRate} 
                    className="h-2"
                    style={{
                      '--progress-background': getUtilizationColor(court.utilizationRate),
                    } as any}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  {showRevenue && (
                    <div>
                      <span className="text-gray-600">
                        {t('analytics.courts.revenue')}
                      </span>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(court.revenue)}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">
                      {t('analytics.courts.bookings')}
                    </span>
                    <p className="font-semibold text-gray-900">
                      {court.bookingsCount}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">
                      {t('analytics.courts.efficiency')}
                    </span>
                    <p className="font-semibold text-gray-900">
                      {court.efficiency.toFixed(1)}%
                    </p>
                  </div>
                  {court.peakHours.length > 0 && (
                    <div>
                      <span className="text-gray-600">
                        {t('analytics.courts.peakHours')}
                      </span>
                      <p className="font-semibold text-gray-900">
                        {court.peakHours.slice(0, 2).join(', ')}
                        {court.peakHours.length > 2 && '...'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hourly Utilization Chart */}
      {timeSlots.length > 0 && !compact && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center">
              <Clock className="h-3 w-3 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {t('analytics.courts.hourlyUtilization')}
            </h3>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timeSlots}>
                <defs>
                  <linearGradient id="utilizationGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  yAxisId="utilization"
                  tick={{ fontSize: 12 }}
                  stroke="#6b7280"
                  axisLine={{ stroke: '#e5e7eb' }}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                {showRevenue && (
                  <YAxis
                    yAxisId="revenue"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(value) => `€${value}`}
                  />
                )}
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'utilization') return [`${value}%`, t('analytics.courts.utilization')];
                    if (name === 'revenue') return [formatCurrency(value as number), t('analytics.courts.revenue')];
                    if (name === 'bookings') return [value, t('analytics.courts.bookings')];
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
                
                {/* Utilization bars with peak highlighting */}
                <Bar
                  yAxisId="utilization"
                  dataKey="utilization"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                  name="utilization"
                >
                  {timeSlots.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.isPeak ? '#10B981' : '#3B82F6'} 
                    />
                  ))}
                </Bar>
                
                {showRevenue && (
                  <Line
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={{ fill: '#F59E0B', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="revenue"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Peak Hours Legend */}
          <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              <span className="text-gray-600">{t('analytics.courts.normalHours')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span className="text-gray-600">{t('analytics.courts.peakHours')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}