import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';
import { Calendar, Users, Trophy } from 'lucide-react';

interface ListWidgetProps {
  data: any[];
  config: {
    listType: string;
    limit?: number;
  };
}

export const ListWidget = ({ data, config }: ListWidgetProps) => {
  if (!data || data.length === 0) return null;

  const limitedData = config.limit ? data.slice(0, config.limit) : data;

  const renderItem = (item: any, index: number) => {
    switch (config.listType) {
      case 'topClients':
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-sm font-medium">{index + 1}</span>
              </div>
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {item.reservations} reservas
                </p>
              </div>
            </div>
            <p className="font-semibold">{formatCurrency(item.totalSpent)}</p>
          </motion.div>
        );

      case 'upcomingEvents':
        const icons = {
          reservation: Calendar,
          tournament: Trophy,
          class: Users,
        };
        const Icon = icons[item.type as keyof typeof icons] || Calendar;

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {item.time} • {item.participants} participantes
                </p>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="p-6 h-full">
      <h3 className="font-medium text-gray-600 dark:text-gray-400 mb-4">
        {config.listType === 'topClients'
          ? 'Mejores Clientes'
          : 'Próximos Eventos'}
      </h3>
      <div className="space-y-2">
        {limitedData.map((item, index) => renderItem(item, index))}
      </div>
    </Card>
  );
};
