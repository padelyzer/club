import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  Clock,
  DollarSign,
  Activity,
  Target,
} from 'lucide-react';
import { ApiClient } from '@/types/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/states/loading-state';

interface ClientStatsProps {
  client: ApiClient;
  stats: any;
  loading: boolean;
}

export function ClientStats({ client, stats, loading }: ClientStatsProps) {
  const { t } = useTranslation();

  if (loading) {
    return <LoadingState />;
  }

  if (!stats) {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-500 dark:text-gray-400">
          {t('clients.noStatsAvailable')}
        </p>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  // Mock data for charts - replace with real data from stats
  const monthlyReservations = [
    { month: 'Jan', reservations: 4 },
    { month: 'Feb', reservations: 6 },
    { month: 'Mar', reservations: 8 },
    { month: 'Apr', reservations: 5 },
    { month: 'May', reservations: 9 },
    { month: 'Jun', reservations: 7 },
  ];

  const courtUsage = [
    { name: 'Court A', value: 35, color: '#3b82f6' },
    { name: 'Court B', value: 25, color: '#10b981' },
    { name: 'Court C', value: 20, color: '#f59e0b' },
    { name: 'Court D', value: 20, color: '#ef4444' },
  ];

  const timePreferences = [
    { hour: '08:00', bookings: 2 },
    { hour: '10:00', bookings: 5 },
    { hour: '12:00', bookings: 3 },
    { hour: '14:00', bookings: 4 },
    { hour: '16:00', bookings: 8 },
    { hour: '18:00', bookings: 10 },
    { hour: '20:00', bookings: 6 },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('clients.averageSpend')}
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                {formatCurrency(stats.average_spend || 0)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-primary-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('clients.favoriteCourt')}
              </p>
              <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                {stats.favorite_court || t('common.none')}
              </p>
            </div>
            <Target className="h-8 w-8 text-success-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('clients.favoriteTime')}
              </p>
              <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                {stats.favorite_time || t('common.none')}
              </p>
            </div>
            <Clock className="h-8 w-8 text-warning-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('clients.membershipStatus')}
              </p>
              <Badge className="mt-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white">
                {stats.membership_status || t('common.none')}
              </Badge>
            </div>
            <Activity className="h-8 w-8 text-danger-500" />
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Reservations */}
        <Card className="p-6">
          <h3 className="mb-4 flex items-center text-lg font-semibold text-gray-900 dark:text-white">
            <Calendar className="mr-2 h-5 w-5 text-gray-400" />
            {t('clients.monthlyReservations')}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyReservations}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="reservations"
                fill="#3b82f6"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Court Usage */}
        <Card className="p-6">
          <h3 className="mb-4 flex items-center text-lg font-semibold text-gray-900 dark:text-white">
            <Target className="mr-2 h-5 w-5 text-gray-400" />
            {t('clients.courtUsage')}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={courtUsage}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {courtUsage.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Time Preferences */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="mb-4 flex items-center text-lg font-semibold text-gray-900 dark:text-white">
            <Clock className="mr-2 h-5 w-5 text-gray-400" />
            {t('clients.timePreferences')}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={timePreferences}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="bookings"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Additional Insights */}
      <Card className="p-6">
        <h3 className="mb-4 flex items-center text-lg font-semibold text-gray-900 dark:text-white">
          <TrendingUp className="mr-2 h-5 w-5 text-gray-400" />
          {t('clients.insights')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-400">
              {t('clients.loyaltyScore')}
            </p>
            <p className="mt-1 text-2xl font-bold text-blue-900 dark:text-blue-400">
              85%
            </p>
            <p className="mt-1 text-xs text-blue-700 dark:text-blue-500">
              {t('clients.basedOnFrequency')}
            </p>
          </div>

          <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <p className="text-sm font-medium text-green-900 dark:text-green-400">
              {t('clients.retentionProbability')}
            </p>
            <p className="mt-1 text-2xl font-bold text-green-900 dark:text-green-400">
              92%
            </p>
            <p className="mt-1 text-xs text-green-700 dark:text-green-500">
              {t('clients.nextMonth')}
            </p>
          </div>

          <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-400">
              {t('clients.growthPotential')}
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-400">
              +45%
            </p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-500">
              {t('clients.revenueOpportunity')}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
