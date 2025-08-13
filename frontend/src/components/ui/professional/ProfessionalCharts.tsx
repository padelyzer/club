'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card } from './Card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Chart Data Types
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}

// Professional Line Chart
interface ProfessionalLineChartProps {
  data: TimeSeriesDataPoint[];
  title?: string;
  subtitle?: string;
  height?: number;
  color?: string;
  showGrid?: boolean;
  showDots?: boolean;
  animated?: boolean;
  className?: string;
}

export const ProfessionalLineChart: React.FC<ProfessionalLineChartProps> = ({
  data,
  title,
  subtitle,
  height = 200,
  color = '#007AFF',
  showGrid = true,
  showDots = true,
  animated = true,
  className,
}) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const valueRange = maxValue - minValue || 1;

  const getPath = () => {
    if (data.length === 0) return '';

    const width = 100; // Use percentage for responsiveness
    const points = data.map((point, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = ((maxValue - point.value) / valueRange) * 80 + 10; // 10% padding top/bottom
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  const pathLength = data.length * 10; // Approximate path length for animation

  return (
    <Card variant="glass" padding="lg" className={cn('backdrop-blur-xl border-white/20', className)}>
      {(title || subtitle) && (
        <div className="mb-6">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600">{subtitle}</p>
          )}
        </div>
      )}

      <div className="relative" style={{ height }}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Grid */}
          {showGrid && (
            <g className="opacity-20">
              {[0, 25, 50, 75, 100].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="100"
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="0.2"
                  className="text-gray-400"
                />
              ))}
            </g>
          )}

          {/* Area fill */}
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {data.length > 0 && (
            <>
              <motion.path
                d={`${getPath()} L 100,100 L 0,100 Z`}
                fill="url(#areaGradient)"
                initial={{ opacity: 0 }}
                animate={{ opacity: animated ? 1 : 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />

              {/* Line */}
              <motion.path
                d={getPath()}
                stroke={color}
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={animated ? { pathLength: 0 } : {}}
                animate={animated ? { pathLength: 1 } : {}}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
              />

              {/* Dots */}
              {showDots && (
                <g>
                  {data.map((point, index) => {
                    const x = (index / (data.length - 1)) * 100;
                    const y = ((maxValue - point.value) / valueRange) * 80 + 10;
                    
                    return (
                      <motion.circle
                        key={index}
                        cx={x}
                        cy={y}
                        r="1.5"
                        fill={color}
                        stroke="white"
                        strokeWidth="1"
                        initial={animated ? { scale: 0, opacity: 0 } : {}}
                        animate={animated ? { scale: 1, opacity: 1 } : {}}
                        transition={{ duration: 0.3, delay: index * 0.1 + 1 }}
                      />
                    );
                  })}
                </g>
              )}
            </>
          )}
        </svg>

        {/* Value labels on hover */}
        <div className="absolute inset-0 flex items-end justify-between px-2">
          {data.slice(0, Math.min(data.length, 5)).map((point, index) => (
            <div key={index} className="text-xs text-gray-500 text-center">
              <div className="font-medium">{point.value}</div>
              <div className="opacity-75">{point.label || point.date}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

// Professional Bar Chart
interface ProfessionalBarChartProps {
  data: ChartDataPoint[];
  title?: string;
  subtitle?: string;
  height?: number;
  horizontal?: boolean;
  showValues?: boolean;
  animated?: boolean;
  className?: string;
}

export const ProfessionalBarChart: React.FC<ProfessionalBarChartProps> = ({
  data,
  title,
  subtitle,
  height = 200,
  horizontal = false,
  showValues = true,
  animated = true,
  className,
}) => {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <Card variant="glass" padding="lg" className={cn('backdrop-blur-xl border-white/20', className)}>
      {(title || subtitle) && (
        <div className="mb-6">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600">{subtitle}</p>
          )}
        </div>
      )}

      <div className="space-y-4" style={{ minHeight: height }}>
        {data.map((item, index) => {
          const percentage = (item.value / maxValue) * 100;
          const color = item.color || '#007AFF';

          return (
            <div key={item.label} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                {showValues && (
                  <span className="text-sm text-gray-600">{item.value}</span>
                )}
              </div>
              
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <motion.div
                    className="h-3 rounded-full"
                    style={{ backgroundColor: color }}
                    initial={animated ? { width: 0 } : { width: `${percentage}%` }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, delay: index * 0.1, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// Professional Donut Chart
interface ProfessionalDonutChartProps {
  data: ChartDataPoint[];
  title?: string;
  subtitle?: string;
  size?: number;
  centerText?: string;
  centerSubtext?: string;
  showLegend?: boolean;
  animated?: boolean;
  className?: string;
}

export const ProfessionalDonutChart: React.FC<ProfessionalDonutChartProps> = ({
  data,
  title,
  subtitle,
  size = 200,
  centerText,
  centerSubtext,
  showLegend = true,
  animated = true,
  className,
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 45;
  const strokeWidth = 10;
  const center = 50;
  
  let cumulativePercentage = 0;

  const defaultColors = [
    '#007AFF', '#34C759', '#FF9500', '#FF3B30', 
    '#AF52DE', '#FF2D92', '#5AC8FA', '#FFCC00'
  ];

  return (
    <Card variant="glass" padding="lg" className={cn('backdrop-blur-xl border-white/20', className)}>
      {(title || subtitle) && (
        <div className="mb-6">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600">{subtitle}</p>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row items-center gap-6">
        {/* Chart */}
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox="0 0 100 100">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const circumference = 2 * Math.PI * radius;
              const strokeDasharray = circumference;
              const strokeDashoffset = circumference - (percentage / 100) * circumference;
              const rotate = (cumulativePercentage / 100) * 360;
              
              const color = item.color || defaultColors[index % defaultColors.length];
              
              cumulativePercentage += percentage;

              return (
                <motion.circle
                  key={item.label}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={animated ? circumference : strokeDashoffset}
                  strokeLinecap="round"
                  transform={`rotate(${rotate - 90} ${center} ${center})`}
                  animate={animated ? { strokeDashoffset } : {}}
                  transition={{ duration: 1, delay: index * 0.2, ease: 'easeOut' }}
                />
              );
            })}
          </svg>

          {/* Center content */}
          {(centerText || centerSubtext) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              {centerText && (
                <div className="text-2xl font-bold text-gray-900">{centerText}</div>
              )}
              {centerSubtext && (
                <div className="text-sm text-gray-600">{centerSubtext}</div>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="space-y-3 flex-1">
            {data.map((item, index) => {
              const percentage = ((item.value / total) * 100).toFixed(1);
              const color = item.color || defaultColors[index % defaultColors.length];

              return (
                <motion.div
                  key={item.label}
                  className="flex items-center gap-3"
                  initial={animated ? { opacity: 0, x: 20 } : {}}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 + 0.5 }}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {item.label}
                    </div>
                    <div className="text-xs text-gray-600">
                      {item.value} ({percentage}%)
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};

// Professional Metric Card
interface ProfessionalMetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: string;
  loading?: boolean;
  className?: string;
}

export const ProfessionalMetricCard: React.FC<ProfessionalMetricCardProps> = ({
  title,
  value,
  change,
  changeLabel = 'vs último mes',
  icon,
  color = '#007AFF',
  loading = false,
  className,
}) => {
  const getTrendIcon = () => {
    if (change === undefined || change === 0) return <Minus className="w-4 h-4" />;
    return change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === 0) return 'text-gray-500';
    return change > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <Card 
      variant="glass" 
      padding="lg"
      className={cn('backdrop-blur-xl border-white/20 relative overflow-hidden', className)}
    >
      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        {icon && (
          <div 
            className="p-3 rounded-xl shadow-lg"
            style={{ backgroundColor: `${color}20` }}
          >
            <div style={{ color }} className="w-6 h-6 flex items-center justify-center">
              {icon}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <motion.h3 
          className="text-3xl font-bold text-gray-900"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {value}
        </motion.h3>
        
        <p className="text-sm font-medium text-gray-700">{title}</p>
        
        {change !== undefined && (
          <div className={cn('flex items-center gap-1 text-sm', getTrendColor())}>
            {getTrendIcon()}
            <span>
              {change > 0 ? '+' : ''}{change.toFixed(1)}% {changeLabel}
            </span>
          </div>
        )}
      </div>

      {/* Subtle background gradient */}
      <div 
        className="absolute inset-0 opacity-5 rounded-xl"
        style={{ 
          background: `linear-gradient(135deg, ${color} 0%, transparent 100%)` 
        }}
      />
    </Card>
  );
};

// Professional Stats Grid
interface ProfessionalStatsGridProps {
  metrics: Array<{
    title: string;
    value: string | number;
    change?: number;
    icon?: React.ReactNode;
    color?: string;
  }>;
  columns?: 2 | 3 | 4;
  loading?: boolean;
  className?: string;
}

export const ProfessionalStatsGrid: React.FC<ProfessionalStatsGridProps> = ({
  metrics,
  columns = 4,
  loading = false,
  className,
}) => {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn(`grid ${gridCols[columns]} gap-6`, className)}>
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <ProfessionalMetricCard
            title={metric.title}
            value={metric.value}
            change={metric.change}
            icon={metric.icon}
            color={metric.color}
            loading={loading}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default {
  ProfessionalLineChart,
  ProfessionalBarChart,
  ProfessionalDonutChart,
  ProfessionalMetricCard,
  ProfessionalStatsGrid,
};