import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { KPIData } from '@/types';

interface KPIWidgetProps {
  data: KPIData;
  config: {
    kpiId: string;
    icon?: React.ComponentType<{ className?: string }>;
    color?: string;
  };
}

export const KPIWidget = ({ data, config }: KPIWidgetProps) => {
  if (!data) return null;

  const formatValue = (value: number | string) => {
    if (typeof value === 'number') {
      if (config.kpiId.includes('revenue') || config.kpiId.includes('price')) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'EUR',
        }).format(value);
      }
      if (
        config.kpiId.includes('rate') ||
        config.kpiId.includes('percentage')
      ) {
        return `${value}%`;
      }
      return new Intl.NumberFormat('en-US').format(value);
    }
    return value;
  };

  return (
    <Card className="p-6 h-full">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {data.label}
          </p>
          <p className="text-2xl font-semibold">{formatValue(data.value)}</p>
          {data.change !== undefined && (
            <div className="flex items-center space-x-1">
              {data.change > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span
                className={cn(
                  'text-sm font-medium',
                  data.change > 0 ? 'text-green-500' : 'text-red-500'
                )}
              >
                {Math.abs(data.change)}%
              </span>
            </div>
          )}
        </div>
        {config.icon && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className={cn(
              'p-3 rounded-lg',
              config.color || 'bg-gray-100 dark:bg-gray-800'
            )}
          >
            <config.icon className="w-6 h-6" />
          </motion.div>
        )}
      </div>
    </Card>
  );
};
