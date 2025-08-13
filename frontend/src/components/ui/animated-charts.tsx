
const ResponsiveContainer = dynamic(() => import('recharts'), {

const LineChart = dynamic(() => import('recharts'), {

const BarChart = dynamic(() => import('recharts'), {
  loading: () => <div className="animate-pulse bg-gray-200 rounded h-32" />,
  ssr: false
});

  loading: () => <div className="animate-pulse bg-gray-200 rounded h-32" />,
  ssr: false
});

  loading: () => <div className="animate-pulse bg-gray-200 rounded h-32" />,
  ssr: false
});

'use client';

import dynamic from 'next/dynamic';

import React from 'react';
import { motion, useMotionValue, useSpring, useInView } from 'framer-motion';
import { springPresets, durations } from '@/lib/animations/spring-presets';
import { cn } from '@/lib/utils';

// Animated number counter
export interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  format?: (value: number) => string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 2,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
  format,
}) => {
  const ref = React.useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { 
    ...springPresets.fluid, 
    duration: duration * 1000 
  });
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  React.useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [motionValue, value, isInView]);

  React.useEffect(() => {
    const unsubscribe = springValue.onChange((latest) => {
      if (ref.current) {
        const formattedValue = format 
          ? format(latest)
          : latest.toFixed(decimals);
        ref.current.textContent = `${prefix}${formattedValue}${suffix}`;
      }
    });

    return unsubscribe;
  }, [springValue, prefix, suffix, decimals, format]);

  return <span ref={ref} className={className}>0</span>;
};

// Animated progress bar
export interface AnimatedProgressProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  showLabel?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  gradient?: boolean;
}

export const AnimatedProgress: React.FC<AnimatedProgressProps> = ({
  value,
  max = 100,
  className,
  barClassName,
  showLabel = false,
  label,
  size = 'md',
  variant = 'default',
  gradient = false,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const percentage = Math.min((value / max) * 100, 100);

  const sizeConfig = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const variantConfig = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  const gradientConfig = {
    default: 'bg-gradient-to-r from-blue-500 to-purple-600',
    success: 'bg-gradient-to-r from-green-400 to-green-600',
    warning: 'bg-gradient-to-r from-yellow-400 to-orange-500',
    error: 'bg-gradient-to-r from-red-400 to-red-600',
  };

  return (
    <div ref={ref} className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>{label}</span>
          <span>{value}/{max}</span>
        </div>
      )}
      <div className={cn(
        'w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden',
        sizeConfig[size]
      )}>
        <motion.div
          className={cn(
            'h-full rounded-full',
            gradient ? gradientConfig[variant] : variantConfig[variant],
            barClassName
          )}
          initial={{ width: 0 }}
          animate={{ width: isInView ? `${percentage}%` : 0 }}
          transition={{ ...springPresets.fluid, duration: 1.5 }}
        />
      </div>
    </div>
  );
};

// Animated pie chart
export interface PieSegment {
  value: number;
  color: string;
  label: string;
}

export interface AnimatedPieChartProps {
  data: PieSegment[];
  size?: number;
  thickness?: number;
  className?: string;
  showLabels?: boolean;
  centerContent?: React.ReactNode;
}

export const AnimatedPieChart: React.FC<AnimatedPieChartProps> = ({
  data,
  size = 200,
  thickness = 20,
  className,
  showLabels = false,
  centerContent,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, segment) => sum + segment.value, 0);
  
  let accumulatedPercentage = 0;

  return (
    <div ref={ref} className={cn('relative', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={thickness}
          className="text-gray-200 dark:text-gray-800"
        />
        
        {/* Animated segments */}
        {data.map((segment, index) => {
          const percentage = (segment.value / total) * 100;
          const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
          const strokeDashoffset = -((accumulatedPercentage / 100) * circumference);
          
          const element = (
            <motion.circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              initial={{ strokeDashoffset: circumference }}
              animate={{ 
                strokeDashoffset: isInView ? strokeDashoffset : circumference 
              }}
              transition={{ 
                ...springPresets.fluid, 
                duration: 1.5,
                delay: index * 0.2,
              }}
            />
          );
          
          accumulatedPercentage += percentage;
          return element;
        })}
      </svg>
      
      {/* Center content */}
      {centerContent && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: isInView ? 1 : 0, scale: isInView ? 1 : 0.5 }}
          transition={{ ...springPresets.bouncy, delay: 1 }}
        >
          {centerContent}
        </motion.div>
      )}
      
      {/* Labels */}
      {showLabels && (
        <div className="mt-4 space-y-2">
          {data.map((segment, index) => (
            <motion.div
              key={index}
              className="flex items-center gap-2 text-sm"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: isInView ? 1 : 0, x: isInView ? 0 : -20 }}
              transition={{ 
                ...springPresets.gentle, 
                delay: index * 0.1 + 0.5 
              }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span>{segment.label}</span>
              <span className="text-muted-foreground">
                ({((segment.value / total) * 100).toFixed(1)}%)
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// Animated bar chart
export interface BarData {
  label: string;
  value: number;
  color?: string;
}

export interface AnimatedBarChartProps {
  data: BarData[];
  height?: number;
  className?: string;
  showValues?: boolean;
  horizontal?: boolean;
  maxValue?: number;
}

export const AnimatedBarChart: React.FC<AnimatedBarChartProps> = ({
  data,
  height = 300,
  className,
  showValues = true,
  horizontal = false,
  maxValue,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  const max = maxValue || Math.max(...data.map(d => d.value));

  if (horizontal) {
    return (
      <div ref={ref} className={cn('space-y-4', className)}>
        {data.map((item, index) => {
          const percentage = (item.value / max) * 100;
          return (
            <div key={index} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{item.label}</span>
                {showValues && <span className="font-medium">{item.value}</span>}
              </div>
              <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden">
                <motion.div
                  className={cn(
                    'h-full rounded-lg',
                    item.color ? '' : 'bg-primary'
                  )}
                  style={{ backgroundColor: item.color }}
                  initial={{ width: 0 }}
                  animate={{ width: isInView ? `${percentage}%` : 0 }}
                  transition={{ 
                    ...springPresets.fluid, 
                    duration: 1,
                    delay: index * 0.1,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn('space-y-4', className)}>
      <div 
        className="flex items-end justify-between gap-2"
        style={{ height }}
      >
        {data.map((item, index) => {
          const percentage = (item.value / max) * 100;
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="relative flex-1 w-full flex items-end">
                {showValues && (
                  <motion.span
                    className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ 
                      opacity: isInView ? 1 : 0, 
                      y: isInView ? 0 : 10 
                    }}
                    transition={{ 
                      ...springPresets.gentle, 
                      delay: index * 0.1 + 0.5 
                    }}
                  >
                    {item.value}
                  </motion.span>
                )}
                <motion.div
                  className={cn(
                    'w-full rounded-t-lg',
                    item.color ? '' : 'bg-primary'
                  )}
                  style={{ backgroundColor: item.color }}
                  initial={{ height: 0 }}
                  animate={{ height: isInView ? `${percentage}%` : 0 }}
                  transition={{ 
                    ...springPresets.fluid, 
                    duration: 1,
                    delay: index * 0.1,
                  }}
                />
              </div>
              <span className="text-xs text-center text-muted-foreground">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Animated line chart (simplified SVG version)
export interface LineData {
  x: number;
  y: number;
  label?: string;
}

export interface AnimatedLineChartProps {
  data: LineData[];
  width?: number;
  height?: number;
  className?: string;
  strokeColor?: string;
  strokeWidth?: number;
  showDots?: boolean;
  showArea?: boolean;
}

export const AnimatedLineChart: React.FC<AnimatedLineChartProps> = ({
  data,
  width = 400,
  height = 200,
  className,
  strokeColor = '#3b82f6',
  strokeWidth = 2,
  showDots = true,
  showArea = false,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  if (!data.length) return null;

  const maxX = Math.max(...data.map(d => d.x));
  const maxY = Math.max(...data.map(d => d.y));
  const minY = Math.min(...data.map(d => d.y));
  
  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const getPoint = (item: LineData) => {
    const x = padding + (item.x / maxX) * chartWidth;
    const y = padding + ((maxY - item.y) / (maxY - minY)) * chartHeight;
    return { x, y };
  };

  const points = data.map(getPoint);
  const pathData = points.reduce((path, point, index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${path} ${command} ${point.x} ${point.y}`;
  }, '');

  const areaData = showArea 
    ? `${pathData} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`
    : '';

  return (
    <div ref={ref} className={cn('relative', className)}>
      <svg width={width} height={height} className="overflow-visible">
        {/* Area fill */}
        {showArea && (
          <motion.path
            d={areaData}
            fill={strokeColor}
            fillOpacity={0.1}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: isInView ? 1 : 0, 
              opacity: isInView ? 1 : 0 
            }}
            transition={{ ...springPresets.fluid, duration: 2 }}
          />
        )}
        
        {/* Line */}
        <motion.path
          d={pathData}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: isInView ? 1 : 0 }}
          transition={{ ...springPresets.fluid, duration: 2 }}
        />
        
        {/* Dots */}
        {showDots && points.map((point, index) => (
          <motion.circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={4}
            fill={strokeColor}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: isInView ? 1 : 0, 
              opacity: isInView ? 1 : 0 
            }}
            transition={{ 
              ...springPresets.bouncy, 
              delay: (index / points.length) * 1.5 + 0.5 
            }}
          />
        ))}
      </svg>
    </div>
  );
};

// Animated metric card
export interface AnimatedMetricCardProps {
  title: string;
  value: number;
  previousValue?: number;
  format?: (value: number) => string;
  prefix?: string;
  suffix?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  icon?: React.ReactNode;
}

export const AnimatedMetricCard: React.FC<AnimatedMetricCardProps> = ({
  title,
  value,
  previousValue,
  format,
  prefix,
  suffix,
  trend,
  className,
  icon,
}) => {
  const change = previousValue ? ((value - previousValue) / previousValue) * 100 : 0;
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';

  return (
    <motion.div
      className={cn(
        'p-6 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springPresets.gentle}
      whileHover={{ y: -2, boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      
      <div className="space-y-2">
        <AnimatedCounter
          value={value || ''}
          prefix={prefix}
          suffix={suffix}
          format={format}
          className="text-2xl font-bold"
        />
        
        {previousValue && (
          <motion.div
            className={cn('text-sm flex items-center gap-1', trendColor)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <span>{change > 0 ? '↗' : change < 0 ? '↘' : '→'}</span>
            <span>{Math.abs(change).toFixed(1)}%</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default {
  AnimatedCounter,
  AnimatedProgress,
  AnimatedPieChart,
  AnimatedBarChart,
  AnimatedLineChart,
  AnimatedMetricCard,
};