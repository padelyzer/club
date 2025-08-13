import { Card } from '@/components/ui/card';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';

interface RevenueChartWidgetProps {
  data: {
    daily: { date: string; amount: number }[];
    total: number;
    change: number;
  };
}

export const RevenueChartWidget = ({ data }: RevenueChartWidgetProps) => {
  if (!data) return null;

  return (
    <Card className="p-6 h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-medium text-gray-600 dark:text-gray-400">
            Ingresos (30 días)
          </h3>
          <p className="text-2xl font-semibold mt-1">
            {formatCurrency(data.total)}
          </p>
        </div>
        <motion.div
          animate={{ rotate: data.change > 0 ? 0 : 180 }}
          className={cn(
            'p-2 rounded-lg',
            data.change > 0
              ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
          )}
        >
          <TrendingUp className="w-5 h-5" />
        </motion.div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.daily}>
            <XAxis
              dataKey="date"
              stroke="#999"
              fontSize={12}
              tickFormatter={(value) => new Date(value).getDate().toString()}
            />
            <YAxis
              stroke="#999"
              fontSize={12}
              tickFormatter={(value) => `$${value / 1000}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
              }}
              formatter={(value: any) => formatCurrency(value)}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#007AFF"
              strokeWidth={2}
              dot={false}
              animationDuration={1000}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
