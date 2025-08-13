import React, { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar,
  Clock,
  TrendingUp,
  Users,
  Target,
  CreditCard,
  Activity,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  Filter,
  Download,
  RefreshCw,
  Settings
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProfessionalDashboardLayout } from './ProfessionalDashboardLayout';
import { ProfessionalDashboardStats, createDashboardStats } from './ProfessionalDashboardStats';
import { ProfessionalQuickMetrics, createQuickMetrics } from './ProfessionalQuickMetrics';
import { Card } from '@/components/ui/professional/Card';
import { Button } from '@/components/ui/professional/Button';
import { cn } from '@/lib/utils';

interface DashboardData {
  // Main statistics
  totalReservations: number;
  totalRevenue: number;
  activeMembers: number;
  courtOccupancy: number;
  pendingPayments?: number;
  upcomingEvents?: number;
  
  // Changes (for trends)
  changes: {
    reservations: number;
    revenue: number;
    members: number;
    occupancy: number;
    payments?: number;
    events?: number;
  };
  
  // Quick metrics
  todayReservations: number;
  liveOccupancy: number;
  pendingApprovals: number;
  recentPayments: number;
  systemAlerts: number;
  onlineMembers: number;
  
  // Recent activity
  recentActivity?: Array<{
    id: string;
    type: 'reservation' | 'payment' | 'member' | 'alert';
    message: string;
    timestamp: string;
    status?: 'success' | 'warning' | 'danger' | 'info';
  }>;
}

interface ProfessionalDashboardOverviewProps {
  data: DashboardData;
  user?: {
    name: string;
    avatar?: string;
    role?: string;
  };
  loading?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
  onViewReservations?: () => void;
  onViewFinance?: () => void;
  onViewMembers?: () => void;
  onViewAnalytics?: () => void;
  onNotifications?: () => void;
  onSettings?: () => void;
  className?: string;
}

export const ProfessionalDashboardOverview = memo<ProfessionalDashboardOverviewProps>(({
  data,
  user,
  loading = false,
  onRefresh,
  onExport,
  onViewReservations,
  onViewFinance,
  onViewMembers,
  onViewAnalytics,
  onNotifications,
  onSettings,
  className
}) => {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setTimeout(() => setRefreshing(false), 1000);
      }
    }
  };

  // Create statistics with click handlers
  const dashboardStats = createDashboardStats({
    totalReservations: data.totalReservations,
    totalRevenue: data.totalRevenue,
    activeMembers: data.activeMembers,
    courtOccupancy: data.courtOccupancy,
    pendingPayments: data.pendingPayments,
    upcomingEvents: data.upcomingEvents,
    changes: data.changes
  }).map(stat => ({
    ...stat,
    onClick: () => {
      switch (stat.id) {
        case 'reservations':
          onViewReservations?.();
          break;
        case 'revenue':
          onViewFinance?.();
          break;
        case 'members':
          onViewMembers?.();
          break;
        case 'occupancy':
          onViewAnalytics?.();
          break;
        default:
          break;
      }
    }
  }));

  const quickMetrics = createQuickMetrics({
    todayReservations: data.todayReservations,
    liveOccupancy: data.liveOccupancy,
    pendingApprovals: data.pendingApprovals,
    recentPayments: data.recentPayments,
    systemAlerts: data.systemAlerts,
    onlineMembers: data.onlineMembers
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'reservation':
        return Calendar;
      case 'payment':
        return CreditCard;
      case 'member':
        return Users;
      case 'alert':
        return AlertTriangle;
      default:
        return Activity;
    }
  };

  const getActivityStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-orange-600 bg-orange-100';
      case 'danger':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <ProfessionalDashboardLayout
      title={t('dashboard.title')}
      subtitle={t('dashboard.subtitle')}
      user={user}
      notifications={data.systemAlerts}
      onNotifications={onNotifications}
      onSettings={onSettings}
      className={className}
    >
      <div className="space-y-8">
        {/* Apple-style Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">
                {t('dashboard.welcome', { name: user?.name?.split(' ')[0] || 'Admin' })}
              </h1>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString(undefined, { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="h-10 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
                {t('dashboard.refresh')}
              </button>
              
              {onExport && (
                <button
                  onClick={onExport}
                  className="h-10 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {t('dashboard.export')}
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Apple-style Quick Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {t('dashboard.quickMetrics.title')}
            </h2>
            <p className="text-sm text-gray-500">
              {t('dashboard.quickMetrics.subtitle')}
            </p>
          </div>
          <ProfessionalQuickMetrics
            metrics={quickMetrics}
            animated={true}
          />
        </motion.div>

        {/* Apple-style Main Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {t('dashboard.mainStats.title')}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button className="h-8 px-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" />
                  {t('dashboard.filter')}
                </button>
                <button 
                  onClick={onViewAnalytics}
                  className="h-8 px-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-1.5"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  {t('dashboard.analytics')}
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            <ProfessionalDashboardStats
              stats={dashboardStats}
              layout="grid"
              animated={true}
            />
          </div>
        </motion.div>

        {/* Apple-style Recent Activity */}
        {data.recentActivity && data.recentActivity.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {t('dashboard.recentActivity.title')}
                </h2>
                <button className="h-8 px-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-1.5">
                  {t('dashboard.viewAll')}
                  <Activity className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {data.recentActivity.slice(0, 5).map((activity, index) => {
                  const ActivityIcon = getActivityIcon(activity.type);
                  
                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + (index * 0.05) }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className={cn(
                        'p-2 rounded-xl',
                        getActivityStatusColor(activity.status)
                      )}>
                        <ActivityIcon className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>

                      {activity.status === 'success' && (
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Apple-style Performance Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('dashboard.insights.occupancyTrends')}
              </h3>
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <PieChart className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600 font-medium">
                  {t('dashboard.insights.peakHours')}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  18:00 - 22:00
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600 font-medium">
                  {t('dashboard.insights.avgSession')}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  1.5 {t('dashboard.insights.hours')}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600 font-medium">
                  {t('dashboard.insights.popularity')}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {t('dashboard.insights.weekend')}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('dashboard.insights.revenueGoals')}
              </h3>
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <Target className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-gray-600 font-medium">
                    {t('dashboard.insights.monthlyGoal')}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    75%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: '75%' }} />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">
                    ${(data.totalRevenue * 0.75).toLocaleString()} / ${data.totalRevenue.toLocaleString()}
                  </span>
                  <span className="font-semibold text-green-600">
                    +{data.changes.revenue}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </ProfessionalDashboardLayout>
  );
}, (prevProps, nextProps) => {
  return (
    JSON.stringify({
      totalReservations: prevProps.data.totalReservations,
      totalRevenue: prevProps.data.totalRevenue,
      activeMembers: prevProps.data.activeMembers,
      systemAlerts: prevProps.data.systemAlerts
    }) === JSON.stringify({
      totalReservations: nextProps.data.totalReservations,
      totalRevenue: nextProps.data.totalRevenue,
      activeMembers: nextProps.data.activeMembers,
      systemAlerts: nextProps.data.systemAlerts
    }) &&
    prevProps.loading === nextProps.loading &&
    prevProps.user?.name === nextProps.user?.name
  );
});

ProfessionalDashboardOverview.displayName = 'ProfessionalDashboardOverview';

// Apple-style Loading skeleton component
const DashboardSkeleton = memo(() => (
  <div className="space-y-4 p-8">
    {/* Header skeleton */}
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded-lg w-64 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded-lg w-48 animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 bg-gray-200 rounded-lg w-24 animate-pulse" />
          <div className="h-10 bg-gray-200 rounded-lg w-24 animate-pulse" />
        </div>
      </div>
    </div>

    {/* Quick metrics skeleton */}
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="mb-6">
        <div className="h-5 bg-gray-200 rounded-lg w-32 animate-pulse mb-2" />
        <div className="h-4 bg-gray-200 rounded-lg w-48 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 bg-gray-50 rounded-xl animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded-lg w-16" />
                <div className="h-3 bg-gray-200 rounded-lg w-24" />
              </div>
              <div className="w-2 h-2 bg-gray-200 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Main stats skeleton */}
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <div className="h-5 bg-gray-200 rounded-lg w-32 animate-pulse" />
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 bg-gray-50 rounded-xl animate-pulse">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <div className="w-12 h-12 bg-gray-200 rounded-2xl" />
                  <div className="w-16 h-6 bg-gray-200 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="h-6 bg-gray-200 rounded-lg w-20" />
                  <div className="h-4 bg-gray-200 rounded-lg w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
));

DashboardSkeleton.displayName = 'DashboardSkeleton';

export default ProfessionalDashboardOverview;