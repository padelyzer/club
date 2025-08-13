import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  X,
  User,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Activity,
  DollarSign,
  Clock,
  TrendingUp,
  Edit,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { ApiClient } from '@/types/client';
import { useClientStats } from '@/lib/api/hooks/useClients';
import { useClientsStore } from '@/store/clientsStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ClientStats } from './client-stats';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ClientDetailProps {
  client: ApiClient;
  onClose: () => void;
}

export function ClientDetail({ client, onClose }: ClientDetailProps) {
  const { t } = useTranslation();
  const { openForm } = useClientsStore();
  const { stats, isLoading: statsLoading } = useClientStats(client.id);
  const [activeTab, setActiveTab] = useState<'info' | 'activity' | 'stats'>('info');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  const handleEdit = () => {
    openForm(client);
    onClose();
  };

  const tabs = [
    { id: 'info', label: t('clients.information'), icon: User },
    { id: 'activity', label: t('clients.activity'), icon: Activity },
    { id: 'stats', label: t('clients.statistics'), icon: TrendingUp },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-apple">
                  <User className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {client.first_name} {client.last_name}
                  </h2>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge
                      variant={client.is_active ? 'default' : 'secondary'}
                      className={cn(
                        client.is_active
                          ? 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                      )}
                    >
                      {client.is_active
                        ? t('common.active')
                        : t('common.inactive')
                      }
                    </Badge>
                    {client.membership && (
                      <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
                        {client.membership.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  {t('common.edit')}
                </Button>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'info' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Contact Information */}
                <Card className="p-6">
                  <h3 className="mb-4 flex items-center text-lg font-semibold text-gray-900 dark:text-white">
                    <Mail className="mr-2 h-5 w-5 text-gray-400" />
                    {t('clients.contactInfo')}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('clients.email')}
                      </p>
                      <p className="mt-1 font-medium text-gray-900 dark:text-white">
                        {client.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('clients.phone')}
                      </p>
                      <p className="mt-1 font-medium text-gray-900 dark:text-white">
                        {client.phone || t('common.notProvided')}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Membership Information */}
                {client.membership && (
                  <Card className="p-6">
                    <h3 className="mb-4 flex items-center text-lg font-semibold text-gray-900 dark:text-white">
                      <CreditCard className="mr-2 h-5 w-5 text-gray-400" />
                      {t('clients.membership')}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('clients.membershipType')}
                        </p>
                        <p className="mt-1 font-medium text-gray-900 dark:text-white">
                          {client.membership.name}
                        </p>
                      </div>
                      {client.membership.expires_at && (
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('clients.expiresAt')}
                          </p>
                          <p className="mt-1 font-medium text-gray-900 dark:text-white">
                            {format(new Date(client.membership.expires_at), 'PPP')}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Statistics Summary */}
                {stats && (
                  <Card className="p-6">
                    <h3 className="mb-4 flex items-center text-lg font-semibold text-gray-900 dark:text-white">
                      <TrendingUp className="mr-2 h-5 w-5 text-gray-400" />
                      {t('clients.quickStats')}
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary-600">
                          {stats.totalReservations}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('clients.totalReservations')}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(stats.totalSpent)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('clients.totalSpent')}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {stats.avgReservationsPerMonth}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('clients.avgReservationsPerMonth')}
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
              </motion.div>
            )}

            {activeTab === 'activity' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <Card className="p-6">
                  <h3 className="mb-4 flex items-center text-lg font-semibold text-gray-900 dark:text-white">
                    <Activity className="mr-2 h-5 w-5 text-gray-400" />
                    {t('clients.recentActivity')}
                  </h3>
                  <div className="space-y-4">
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('clients.activityComingSoon')}
                    </p>
                  </div>
                </Card>
              </motion.div>
            )}

            {activeTab === 'stats' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <ClientStats clientId={client.id} />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
