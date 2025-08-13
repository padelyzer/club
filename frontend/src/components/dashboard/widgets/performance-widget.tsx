import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Activity, Zap, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceMetric {
  label: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  icon: React.ComponentType<{ className?: string }>;
}

interface PerformanceWidgetProps {
  data: {
    apiResponseTime: number;
    pageLoadTime: number;
    activeUsers: number;
    serverUptime: number;
  };
}

export const PerformanceWidget = ({ data }: PerformanceWidgetProps) => {
  if (!data) return null;

  const metrics: PerformanceMetric[] = [
    {
      label: 'API Response',
      value: data.apiResponseTime,
      unit: 'ms',
      status:
        data.apiResponseTime < 200
          ? 'good'
          : data.apiResponseTime < 500
            ? 'warning'
            : 'critical',
      icon: Zap,
    },
    {
      label: 'Page Load',
      value: data.pageLoadTime,
      unit: 's',
      status:
        data.pageLoadTime < 2
          ? 'good'
          : data.pageLoadTime < 4
            ? 'warning'
            : 'critical',
      icon: Clock,
    },
    {
      label: 'Active Users',
      value: data.activeUsers,
      unit: '',
      status: 'good',
      icon: Activity,
    },
    {
      label: 'Uptime',
      value: data.serverUptime,
      unit: '%',
      status:
        data.serverUptime > 99.9
          ? 'good'
          : data.serverUptime > 99
            ? 'warning'
            : 'critical',
      icon: TrendingUp,
    },
  ];

  const getStatusColor = (status: PerformanceMetric['status']) => {
    switch (status) {
      case 'good':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'critical':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
    }
  };

  return (
    <Card className="p-6">
      <h3 className="font-medium text-gray-600 dark:text-gray-400 mb-4">
        Performance Monitoring
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {metric.label}
                </p>
                <p className="text-lg font-semibold mt-1">
                  {metric.value}
                  {metric.unit}
                </p>
              </div>
              <div
                className={cn('p-2 rounded-lg', getStatusColor(metric.status))}
              >
                <metric.icon className="w-4 h-4" />
              </div>
            </div>
            <motion.div
              className={cn(
                'absolute bottom-0 left-0 h-1 rounded-b-lg',
                metric.status === 'good'
                  ? 'bg-green-500'
                  : metric.status === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              )}
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
            />
          </motion.div>
        ))}
      </div>
    </Card>
  );
};
