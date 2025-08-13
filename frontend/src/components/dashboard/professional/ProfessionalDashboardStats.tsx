import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  Calendar, 
  CreditCard,
  Activity,
  Target,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/professional/Card';
import { Button } from '@/components/ui/professional/Button';
import { cn } from '@/lib/utils';
import { professionalDesignSystem } from '@/styles/professional-design-system';

interface StatItem {
  id: string;
  label: string;
  value: string | number;
  previousValue?: string | number;
  change?: number;
  changeType?: 'percentage' | 'absolute';
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  color: keyof typeof professionalDesignSystem.colors;
  description?: string;
  onClick?: () => void;
}

interface ProfessionalDashboardStatsProps {
  stats: StatItem[];
  layout?: 'grid' | 'row' | 'masonry';
  animated?: boolean;
  className?: string;
}

export const ProfessionalDashboardStats = memo<ProfessionalDashboardStatsProps>(({
  stats,
  layout = 'grid',
  animated = true,
  className
}) => {
  const { t } = useTranslation();

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

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="w-3 h-3" />;
      case 'down':
        return <ArrowDown className="w-3 h-3" />;
      default:
        return <Minus className="w-3 h-3" />;
    }
  };

  const getTrendColor = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return 'text-green-600 bg-green-50/80';
      case 'down':
        return 'text-red-600 bg-red-50/80';
      default:
        return 'text-gray-500 bg-gray-50/80';
    }
  };

  const getColorClasses = (color: keyof typeof professionalDesignSystem.colors) => {
    const colorConfig = {
      primary: {
        bg: 'bg-blue-50/80',
        icon: 'text-blue-600',
        accent: 'from-blue-500/20 to-blue-600/20'
      },
      success: {
        bg: 'bg-green-50/80',
        icon: 'text-green-600',
        accent: 'from-green-500/20 to-green-600/20'
      },
      warning: {
        bg: 'bg-amber-50/80',
        icon: 'text-amber-600',
        accent: 'from-amber-500/20 to-amber-600/20'
      },
      danger: {
        bg: 'bg-red-50/80',
        icon: 'text-red-600',
        accent: 'from-red-500/20 to-red-600/20'
      },
      info: {
        bg: 'bg-purple-50/80',
        icon: 'text-purple-600',
        accent: 'from-purple-500/20 to-purple-600/20'
      },
      gray: {
        bg: 'bg-gray-50/80',
        icon: 'text-gray-600',
        accent: 'from-gray-500/20 to-gray-600/20'
      }
    };

    return colorConfig[color] || colorConfig.primary;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { 
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };

  const getLayoutClasses = () => {
    switch (layout) {
      case 'row':
        return 'flex flex-wrap gap-4';
      case 'masonry':
        return 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4';
      default:
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
    }
  };

  return (
    <motion.div
      variants={animated ? containerVariants : {}}
      initial={animated ? "hidden" : {}}
      animate={animated ? "visible" : {}}
      className={cn(getLayoutClasses(), className)}
    >
      {stats.map((stat, index) => {
        const colorClasses = getColorClasses(stat.color);
        
        return (
          <motion.div
            key={stat.id}
            variants={animated ? itemVariants : {}}
            whileHover={{ 
              scale: 1.02,
              transition: { duration: 0.2 }
            }}
            className={layout === 'masonry' ? 'break-inside-avoid' : ''}
          >
            <Card 
              variant="glass" 
              padding="lg"
              className={cn(
                'group cursor-pointer transition-all duration-300',
                'hover:shadow-xl hover:shadow-black/5',
                'border-white/20 backdrop-blur-md',
                stat.onClick && 'hover:border-blue-200/50'
              )}
              onClick={stat.onClick}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  'p-3 rounded-xl backdrop-blur-sm border border-white/20',
                  colorClasses.bg
                )}>
                  <stat.icon className={cn('w-6 h-6', colorClasses.icon)} />
                </div>

                {stat.change !== undefined && (
                  <div className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                    'backdrop-blur-sm border border-white/20',
                    getTrendColor(stat.trend)
                  )}>
                    {getTrendIcon(stat.trend)}
                    <span>
                      {stat.changeType === 'percentage' ? `${Math.abs(stat.change)}%` : formatValue(Math.abs(stat.change))}
                    </span>
                  </div>
                )}
              </div>

              {/* Main Content */}
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                    {formatValue(stat.value)}
                  </h3>
                  {stat.previousValue && (
                    <span className="text-sm text-gray-500">
                      vs {formatValue(stat.previousValue)}
                    </span>
                  )}
                </div>
                
                <p className="text-sm font-medium text-gray-700">
                  {stat.label}
                </p>

                {stat.description && (
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {stat.description}
                  </p>
                )}
              </div>

              {/* Footer */}
              {stat.onClick && (
                <div className="flex justify-end mt-4 pt-4 border-t border-gray-100/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                    className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {t('dashboard.viewDetails')}
                  </Button>
                </div>
              )}

              {/* Gradient Overlay */}
              <div className={cn(
                'absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100',
                'bg-gradient-to-br pointer-events-none transition-opacity duration-300',
                colorClasses.accent
              )} />
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return (
    JSON.stringify(prevProps.stats.map(s => ({ 
      id: s.id, 
      value: s.value, 
      change: s.change 
    }))) === JSON.stringify(nextProps.stats.map(s => ({ 
      id: s.id, 
      value: s.value, 
      change: s.change 
    }))) &&
    prevProps.layout === nextProps.layout &&
    prevProps.animated === nextProps.animated
  );
});

ProfessionalDashboardStats.displayName = 'ProfessionalDashboardStats';

// Predefined stat configurations for common dashboard metrics
export const createDashboardStats = (data: {
  totalReservations?: number;
  totalRevenue?: number;
  activeMembers?: number;
  courtOccupancy?: number;
  pendingPayments?: number;
  upcomingEvents?: number;
  changes?: {
    reservations?: number;
    revenue?: number;
    members?: number;
    occupancy?: number;
    payments?: number;
    events?: number;
  };
}): StatItem[] => {
  const { t } = useTranslation();
  
  return [
    {
      id: 'reservations',
      label: t('dashboard.stats.totalReservations'),
      value: data.totalReservations || 0,
      change: data.changes?.reservations,
      changeType: 'percentage',
      trend: data.changes?.reservations ? (data.changes.reservations > 0 ? 'up' : 'down') : 'neutral',
      icon: Calendar,
      color: 'primary',
      description: t('dashboard.stats.reservationsDescription')
    },
    {
      id: 'revenue',
      label: t('dashboard.stats.totalRevenue'),
      value: `$${(data.totalRevenue || 0).toLocaleString()}`,
      change: data.changes?.revenue,
      changeType: 'percentage',
      trend: data.changes?.revenue ? (data.changes.revenue > 0 ? 'up' : 'down') : 'neutral',
      icon: CreditCard,
      color: 'success',
      description: t('dashboard.stats.revenueDescription')
    },
    {
      id: 'members',
      label: t('dashboard.stats.activeMembers'),
      value: data.activeMembers || 0,
      change: data.changes?.members,
      changeType: 'absolute',
      trend: data.changes?.members ? (data.changes.members > 0 ? 'up' : 'down') : 'neutral',
      icon: Users,
      color: 'info',
      description: t('dashboard.stats.membersDescription')
    },
    {
      id: 'occupancy',
      label: t('dashboard.stats.courtOccupancy'),
      value: `${data.courtOccupancy || 0}%`,
      change: data.changes?.occupancy,
      changeType: 'percentage',
      trend: data.changes?.occupancy ? (data.changes.occupancy > 0 ? 'up' : 'down') : 'neutral',
      icon: Target,
      color: 'warning',
      description: t('dashboard.stats.occupancyDescription')
    },
    ...(data.pendingPayments !== undefined ? [{
      id: 'payments',
      label: t('dashboard.stats.pendingPayments'),
      value: data.pendingPayments,
      change: data.changes?.payments,
      changeType: 'absolute' as const,
      trend: data.changes?.payments ? (data.changes.payments > 0 ? 'up' : 'down') as const : 'neutral' as const,
      icon: Clock,
      color: 'danger' as const,
      description: t('dashboard.stats.paymentsDescription')
    }] : []),
    ...(data.upcomingEvents !== undefined ? [{
      id: 'events',
      label: t('dashboard.stats.upcomingEvents'),
      value: data.upcomingEvents,
      change: data.changes?.events,
      changeType: 'absolute' as const,
      trend: data.changes?.events ? (data.changes.events > 0 ? 'up' : 'down') as const : 'neutral' as const,
      icon: Activity,
      color: 'gray' as const,
      description: t('dashboard.stats.eventsDescription')
    }] : [])
  ];
};

export default ProfessionalDashboardStats;