'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { cn } from '@/lib/utils';
import { clubDesignTokens as tokens } from '@/styles/club-design-tokens';

/**
 * Premium Chart Components for Club Analytics
 * The world's most beautiful data visualizations
 */

// Chart color palette
const chartColors = {
  primary: '#6366f1', // Indigo
  secondary: '#8b5cf6', // Purple
  success: '#10b981', // Emerald
  warning: '#f59e0b', // Amber
  danger: '#ef4444', // Red
  info: '#3b82f6', // Blue
  gradient: {
    primary: ['#6366f1', '#8b5cf6'],
    success: ['#10b981', '#34d399'],
    warning: ['#f59e0b', '#fbbf24'],
    danger: ['#ef4444', '#f87171'],
  },
};

/**
 * Revenue Trend Chart
 */
interface RevenueTrendChartProps {
  data: Array<{
    date: string;
    revenue: number;
    reservations: number;
    memberships: number;
  }>;
  height?: number;
}

export const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({ 
  data, 
  height = 300 
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.8} />
            <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="reservationsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColors.success} stopOpacity={0.8} />
            <stop offset="95%" stopColor={chartColors.success} stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="date" 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          tickFormatter={(value) => `€${value}`}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          formatter={(value: any) => [`€${value}`, '']}
        />
        <Legend 
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="circle"
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={chartColors.primary}
          fillOpacity={1}
          fill="url(#revenueGradient)"
          strokeWidth={2}
          name="Ingresos Totales"
        />
        <Area
          type="monotone"
          dataKey="reservations"
          stroke={chartColors.success}
          fillOpacity={1}
          fill="url(#reservationsGradient)"
          strokeWidth={2}
          name="Reservas"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

/**
 * Occupancy Heat Map
 */
interface OccupancyHeatMapProps {
  data: Array<{
    day: string;
    hour: string;
    value: number;
  }>;
  height?: number;
}

export const OccupancyHeatMap: React.FC<OccupancyHeatMapProps> = ({ 
  data, 
  height = 400 
}) => {
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const hours = Array.from({ length: 15 }, (_, i) => `${i + 8}:00`);
  
  const getColor = (value: number) => {
    if (value > 90) return '#dc2626'; // Red
    if (value > 80) return '#ea580c'; // Orange
    if (value > 70) return '#f59e0b'; // Amber
    if (value > 60) return '#eab308'; // Yellow
    if (value > 50) return '#84cc16'; // Lime
    if (value > 40) return '#22c55e'; // Green
    return '#10b981'; // Emerald
  };
  
  return (
    <div className="relative" style={{ height }}>
      <div className="absolute inset-0 grid grid-cols-7 gap-1">
        {days.map((day, dayIndex) => (
          <div key={day} className="space-y-1">
            <div className="text-xs font-medium text-gray-600 text-center mb-2">
              {day}
            </div>
            {hours.map((hour, hourIndex) => {
              const dataPoint = data.find(
                d => d.day === day && d.hour === hour
              );
              const value = dataPoint?.value || 0;
              
              return (
                <motion.div
                  key={`${day}-${hour}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (dayIndex * hours.length + hourIndex) * 0.01 }}
                  className="relative group cursor-pointer"
                  style={{
                    paddingBottom: '100%',
                  }}
                >
                  <div
                    className={cn(
                      "absolute inset-0 rounded",
                      "transition-all duration-200",
                      "group-hover:scale-110 group-hover:z-10"
                    )}
                    style={{
                      backgroundColor: getColor(value),
                      opacity: value ? value / 100 : 0.1,
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs font-bold text-white bg-black/50 px-1 rounded">
                        {value}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Y-axis labels */}
      <div className="absolute -left-12 top-8 bottom-0 flex flex-col justify-between">
        {hours.map(hour => (
          <span key={hour} className="text-xs text-gray-500">
            {hour}
          </span>
        ))}
      </div>
    </div>
  );
};

/**
 * Member Growth Chart
 */
interface MemberGrowthChartProps {
  data: Array<{
    month: string;
    total: number;
    active: number;
    new: number;
  }>;
  height?: number;
}

export const MemberGrowthChart: React.FC<MemberGrowthChartProps> = ({ 
  data, 
  height = 300 
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="month" 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        />
        <Legend 
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="circle"
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke={chartColors.primary}
          strokeWidth={3}
          dot={{ fill: chartColors.primary, r: 4 }}
          activeDot={{ r: 6 }}
          name="Total"
        />
        <Line
          type="monotone"
          dataKey="active"
          stroke={chartColors.success}
          strokeWidth={3}
          dot={{ fill: chartColors.success, r: 4 }}
          activeDot={{ r: 6 }}
          name="Activos"
        />
        <Line
          type="monotone"
          dataKey="new"
          stroke={chartColors.warning}
          strokeWidth={3}
          strokeDasharray="5 5"
          dot={{ fill: chartColors.warning, r: 4 }}
          activeDot={{ r: 6 }}
          name="Nuevos"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

/**
 * Revenue Distribution Pie Chart
 */
interface RevenueDistributionChartProps {
  data: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
  height?: number;
}

export const RevenueDistributionChart: React.FC<RevenueDistributionChartProps> = ({ 
  data, 
  height = 300 
}) => {
  const colors = [
    chartColors.primary,
    chartColors.secondary,
    chartColors.success,
    chartColors.warning,
    chartColors.info,
  ];
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(entry) => `${entry.percentage}%`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          formatter={(value: any) => `€${value.toLocaleString()}`}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

/**
 * Performance Radar Chart
 */
interface PerformanceRadarChartProps {
  data: Array<{
    metric: string;
    value: number;
    fullMark: number;
  }>;
  height?: number;
}

export const PerformanceRadarChart: React.FC<PerformanceRadarChartProps> = ({ 
  data, 
  height = 300 
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data}>
        <defs>
          <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.8} />
            <stop offset="95%" stopColor={chartColors.secondary} stopOpacity={0.3} />
          </linearGradient>
        </defs>
        <PolarGrid 
          gridType="polygon"
          stroke="#e5e7eb"
        />
        <PolarAngleAxis 
          dataKey="metric" 
          tick={{ fontSize: 12 }}
          className="text-gray-600"
        />
        <Radar
          name="Performance"
          dataKey="value"
          stroke={chartColors.primary}
          fill="url(#radarGradient)"
          strokeWidth={2}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          formatter={(value: any) => `${value}%`}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};

/**
 * Comparison Bar Chart
 */
interface ComparisonBarChartProps {
  data: Array<{
    name: string;
    current: number;
    previous: number;
    target: number;
  }>;
  height?: number;
}

export const ComparisonBarChart: React.FC<ComparisonBarChartProps> = ({ 
  data, 
  height = 300 
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="name" 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          tickFormatter={(value) => `€${value}`}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          formatter={(value: any) => `€${value.toLocaleString()}`}
        />
        <Legend 
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="circle"
        />
        <Bar 
          dataKey="previous" 
          fill={chartColors.secondary} 
          opacity={0.6}
          name="Anterior"
          radius={[4, 4, 0, 0]}
        />
        <Bar 
          dataKey="current" 
          fill={chartColors.primary} 
          name="Actual"
          radius={[4, 4, 0, 0]}
        />
        <Bar 
          dataKey="target" 
          fill={chartColors.success} 
          opacity={0.4}
          name="Objetivo"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

/**
 * Mini Sparkline Chart
 */
interface SparklineChartProps {
  data: number[];
  color?: string;
  height?: number;
  showDots?: boolean;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({ 
  data, 
  color = chartColors.primary,
  height = 40,
  showDots = false 
}) => {
  const chartData = data.map((value, index) => ({ value, index }));
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={showDots ? { fill: color, r: 2 } : false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

const ClubCharts = {
  RevenueTrendChart,
  OccupancyHeatMap,
  MemberGrowthChart,
  RevenueDistributionChart,
  PerformanceRadarChart,
  ComparisonBarChart,
  SparklineChart,
};

export default ClubCharts;