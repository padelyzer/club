import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatCurrency, formatNumber, cn } from '@/lib/utils';
import { User } from '@/types';
import { DashboardMetrics } from '@/lib/api/services/dashboard.service';
import { DisplayMD, Body, CaptionLG, HeadlineSM, CaptionSM } from '@/components/ui/typography';

interface DashboardHeaderProps {
  user: User;
  metrics: DashboardMetrics;
}

export const DashboardHeader = ({ user, metrics }: DashboardHeaderProps) => {
  const greeting = getGreeting();

  const kpiCards = [
    {
      title: 'Ingresos del Mes',
      value: formatCurrency(metrics.monthlyRevenue),
      change: metrics.revenueChange,
      icon: DollarSign,
      color: 'text-success',
    },
    {
      title: 'Reservas Hoy',
      value: formatNumber(metrics.todayReservations),
      change: metrics.reservationsChange,
      icon: Calendar,
      color: 'text-primary',
    },
    {
      title: 'Clientes Activos',
      value: formatNumber(metrics.activeClients),
      change: metrics.clientsChange,
      icon: Users,
      color: 'text-info',
    },
    {
      title: 'Ocupación',
      value: `${metrics.occupancyRate}%`,
      change: metrics.occupancyChange,
      icon: TrendingUp,
      color: 'text-warning',
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between"
      >
        <div>
          <DisplayMD className="text-gray-900 dark:text-gray-100">
            {greeting}, {user?.firstName || user?.username || 'Admin'}
          </DisplayMD>
          <Body className="text-gray-600 dark:text-gray-400 mt-1">
            Aquí está el resumen de tu club hoy
          </Body>
        </div>

        <div className="mt-4 md:mt-0">
          <CaptionLG className="text-gray-500 dark:text-gray-500">
            {new Date().toLocaleDateString('es-MX', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </CaptionLG>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CaptionLG className="text-gray-600 dark:text-gray-400">
                    {kpi.title}
                  </CaptionLG>
                  <HeadlineSM>{kpi.value}</HeadlineSM>
                  <div className="flex items-center space-x-1">
                    {kpi.change > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <CaptionSM
                      className={cn(
                        'font-medium',
                        kpi.change > 0 ? 'text-green-500' : 'text-red-500'
                      )}
                    >
                      {Math.abs(kpi.change)}%
                    </CaptionSM>
                  </div>
                </div>
                <div
                  className={cn(
                    'p-3 rounded-lg bg-gray-50 dark:bg-gray-800',
                    kpi.color
                  )}
                >
                  <kpi.icon className="w-6 h-6" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}
