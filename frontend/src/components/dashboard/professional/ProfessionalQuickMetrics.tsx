import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  Calendar,
  Users,
  DollarSign,
  Target,
  ChevronRight,
  Zap
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/professional/Card';
import { Button } from '@/components/ui/professional/Button';
import { cn } from '@/lib/utils';

interface QuickMetric {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  status?: 'success' | 'warning' | 'danger' | 'info';
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}

interface ProfessionalQuickMetricsProps {
  metrics: QuickMetric[];
  title?: string;
  subtitle?: string;
  onViewAll?: () => void;
  animated?: boolean;
  compact?: boolean;
  className?: string;
}

export const ProfessionalQuickMetrics = memo<ProfessionalQuickMetricsProps>(({
  metrics,
  title,
  subtitle,
  onViewAll,
  animated = true,
  compact = false,
  className
}) => {
  const { t } = useTranslation();

  const getStatusStyles = (status?: 'success' | 'warning' | 'danger' | 'info') => {
    switch (status) {
      case 'success':
        return {
          bg: 'bg-green-50/80',
          border: 'border-green-200/50',
          icon: 'text-green-600',
          accent: 'bg-green-500'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50/80',
          border: 'border-amber-200/50',
          icon: 'text-amber-600',
          accent: 'bg-amber-500'
        };
      case 'danger':
        return {
          bg: 'bg-red-50/80',
          border: 'border-red-200/50',
          icon: 'text-red-600',
          accent: 'bg-red-500'
        };
      case 'info':
        return {
          bg: 'bg-blue-50/80',
          border: 'border-blue-200/50',
          icon: 'text-blue-600',
          accent: 'bg-blue-500'
        };
      default:
        return {
          bg: 'bg-gray-50/80',
          border: 'border-gray-200/50',
          icon: 'text-gray-600',
          accent: 'bg-gray-400'
        };
    }
  };

  const getTrendStyles = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return 'text-green-600 bg-green-50/80';
      case 'down':
        return 'text-red-600 bg-red-50/80';
      default:
        return 'text-gray-500 bg-gray-50/80';
    }
  };

  const formatValue = (value: string | number): string => {
    if (typeof value === 'number') {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      }
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toLocaleString();
    }
    return value;
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.3 }
    }
  };

  if (compact) {
    return (
      <motion.div
        variants={animated ? containerVariants : {}}
        initial={animated ? "hidden" : {}}
        animate={animated ? "visible" : {}}
        className={cn('space-y-3', className)}
      >
        {title && (
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {onViewAll && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewAll}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                {t('dashboard.viewAll')}
              </Button>
            )}
          </div>
        )}

        <div className="grid gap-3">
          {metrics.map((metric, index) => {
            const statusStyles = getStatusStyles(metric.status);
            
            return (
              <motion.div
                key={metric.id}
                variants={animated ? itemVariants : {}}
                whileHover={{ scale: 1.01 }}
              >
                <Card 
                  variant="glass"
                  padding="sm"
                  className={cn(
                    'group cursor-pointer transition-all duration-200',
                    'hover:shadow-md border-white/20',
                    metric.onClick && 'hover:border-blue-200/50'
                  )}
                  onClick={metric.onClick}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-2 rounded-lg backdrop-blur-sm border border-white/20',
                      statusStyles.bg
                    )}>
                      <metric.icon className={cn('w-4 h-4', statusStyles.icon)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {formatValue(metric.value)}
                        </p>
                        {metric.trend && (
                          <span className={cn(
                            'text-xs px-1.5 py-0.5 rounded-full font-medium',
                            getTrendStyles(metric.trend.direction)
                          )}>
                            {metric.trend.direction === 'up' ? '+' : metric.trend.direction === 'down' ? '-' : ''}
                            {Math.abs(metric.trend.value)}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 truncate">
                        {metric.title}
                      </p>
                    </div>

                    {/* Status indicator */}
                    <div className={cn('w-2 h-2 rounded-full', statusStyles.accent)} />
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={animated ? containerVariants : {}}
      initial={animated ? "hidden" : {}}
      animate={animated ? "visible" : {}}
      className={className}
    >
      <Card variant="glass" padding="lg" className="space-y-6">
        {/* Header */}
        {(title || subtitle) && (
          <div className="flex items-start justify-between">
            <div>
              {title && (
                <h3 className="text-xl font-semibold text-gray-900 mb-1">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-600">
                  {subtitle}
                </p>
              )}
            </div>
            
            {onViewAll && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewAll}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                {t('dashboard.viewAll')}
              </Button>
            )}
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {metrics.map((metric, index) => {
            const statusStyles = getStatusStyles(metric.status);
            
            return (
              <motion.div
                key={metric.id}
                variants={animated ? itemVariants : {}}
                whileHover={{ 
                  scale: 1.02,
                  transition: { duration: 0.2 }
                }}
              >
                <Card 
                  variant="white"
                  padding="md"
                  className={cn(
                    'group cursor-pointer transition-all duration-300',
                    'hover:shadow-lg hover:shadow-black/5',
                    'border-gray-100 hover:border-blue-200/50',
                    metric.onClick && 'hover:bg-blue-50/30'
                  )}
                  onClick={metric.onClick}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className={cn(
                        'p-2.5 rounded-xl backdrop-blur-sm border border-white/50',
                        statusStyles.bg
                      )}>
                        <metric.icon className={cn('w-5 h-5', statusStyles.icon)} />
                      </div>

                      {metric.status && (
                        <div className={cn('w-3 h-3 rounded-full', statusStyles.accent)} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <h4 className="text-2xl font-bold text-gray-900 tracking-tight">
                          {formatValue(metric.value)}
                        </h4>
                        {metric.trend && (
                          <span className={cn(
                            'text-xs px-2 py-1 rounded-full font-medium',
                            getTrendStyles(metric.trend.direction)
                          )}>
                            {metric.trend.direction === 'up' ? '↗' : metric.trend.direction === 'down' ? '↘' : '→'}
                            {Math.abs(metric.trend.value)}%
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm font-medium text-gray-700">
                        {metric.title}
                      </p>
                      
                      {metric.subtitle && (
                        <p className="text-xs text-gray-500">
                          {metric.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Trend Label */}
                    {metric.trend?.label && (
                      <p className="text-xs text-gray-500 font-medium">
                        {metric.trend.label}
                      </p>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return (
    JSON.stringify(prevProps.metrics.map(m => ({ 
      id: m.id, 
      value: m.value, 
      trend: m.trend?.value 
    }))) === JSON.stringify(nextProps.metrics.map(m => ({ 
      id: m.id, 
      value: m.value, 
      trend: m.trend?.value 
    }))) &&
    prevProps.title === nextProps.title &&
    prevProps.compact === nextProps.compact &&
    prevProps.animated === nextProps.animated
  );
});

ProfessionalQuickMetrics.displayName = 'ProfessionalQuickMetrics';

// Predefined quick metrics for dashboard
export const createQuickMetrics = (data: {
  todayReservations?: number;
  liveOccupancy?: number;
  pendingApprovals?: number;
  recentPayments?: number;
  systemAlerts?: number;
  onlineMembers?: number;
}): QuickMetric[] => {
  const { t } = useTranslation();
  
  return [
    {
      id: 'today_reservations',
      title: t('dashboard.quickMetrics.todayReservations'),
      value: data.todayReservations || 0,
      subtitle: t('dashboard.quickMetrics.scheduledToday'),
      status: data.todayReservations && data.todayReservations > 0 ? 'success' : 'info',
      icon: Calendar
    },
    {
      id: 'live_occupancy',
      title: t('dashboard.quickMetrics.liveOccupancy'),
      value: `${data.liveOccupancy || 0}%`,
      subtitle: t('dashboard.quickMetrics.courtsInUse'),
      status: data.liveOccupancy && data.liveOccupancy > 80 ? 'success' : data.liveOccupancy && data.liveOccupancy > 50 ? 'info' : 'warning',
      icon: Target
    },
    {
      id: 'pending_approvals',
      title: t('dashboard.quickMetrics.pendingApprovals'),
      value: data.pendingApprovals || 0,
      subtitle: t('dashboard.quickMetrics.requiresAttention'),
      status: data.pendingApprovals && data.pendingApprovals > 0 ? 'warning' : 'success',
      icon: Clock
    },
    {
      id: 'recent_payments',
      title: t('dashboard.quickMetrics.recentPayments'),
      value: data.recentPayments || 0,
      subtitle: t('dashboard.quickMetrics.last24Hours'),
      status: 'success',
      icon: DollarSign
    },
    {
      id: 'system_alerts',
      title: t('dashboard.quickMetrics.systemAlerts'),
      value: data.systemAlerts || 0,
      subtitle: t('dashboard.quickMetrics.activeIssues'),
      status: data.systemAlerts && data.systemAlerts > 0 ? 'danger' : 'success',
      icon: AlertCircle
    },
    {
      id: 'online_members',
      title: t('dashboard.quickMetrics.onlineMembers'),
      value: data.onlineMembers || 0,
      subtitle: t('dashboard.quickMetrics.currentlyActive'),
      status: 'info',
      icon: Users
    }
  ];
};

export default ProfessionalQuickMetrics;