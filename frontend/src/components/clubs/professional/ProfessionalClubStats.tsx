import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  Target,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/professional/Card';
import { cn } from '@/lib/utils';

interface ProfessionalClubStatsProps {
  courts?: number;
  members?: number;
  occupancy?: number;
  revenue?: number;
  growth?: {
    members?: number;
    occupancy?: number;
    revenue?: number;
  };
  variant?: 'inline' | 'grid' | 'cards';
  className?: string;
  animated?: boolean;
}

export const ProfessionalClubStats = memo<ProfessionalClubStatsProps>(({ 
  courts = 0,
  members = 0,
  occupancy = 0,
  revenue,
  growth,
  variant = 'grid',
  className,
  animated = true
}) => {
  const { t } = useTranslation();

  const stats = [
    {
      id: 'courts',
      icon: Calendar,
      label: t('clubs.courts'),
      value: courts,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-900',
    },
    {
      id: 'members',
      icon: Users,
      label: t('clubs.members'),
      value: members,
      growth: growth?.members,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      textColor: 'text-green-900',
    },
    {
      id: 'occupancy',
      icon: Target,
      label: t('clubs.occupancy'),
      value: `${occupancy}%`,
      growth: growth?.occupancy,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      textColor: 'text-purple-900',
    },
    ...(revenue !== undefined ? [{
      id: 'revenue',
      icon: TrendingUp,
      label: t('clubs.revenue'),
      value: `$${revenue.toLocaleString()}`,
      growth: growth?.revenue,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      textColor: 'text-orange-900',
    }] : []),
  ];

  const getTrendIcon = (growth?: number) => {
    if (!growth || growth === 0) return <Minus className="w-3 h-3" />;
    return growth > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const getTrendColor = (growth?: number) => {
    if (!growth || growth === 0) return 'text-gray-500';
    return growth > 0 ? 'text-green-600' : 'text-red-600';
  };

  if (variant === 'cards') {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
        {stats.map((stat, index) => (
          <motion.div
            key={stat.id}
            initial={animated ? { opacity: 0, y: 20 } : {}}
            animate={animated ? { opacity: 1, y: 0 } : {}}
            transition={animated ? { delay: index * 0.1, duration: 0.3 } : {}}
          >
            <Card variant="glass" padding="lg" className="text-center">
              {/* Icon */}
              <div className={cn(
                'w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center',
                stat.bgColor
              )}>
                <stat.icon className={cn('w-6 h-6', stat.iconColor)} />
              </div>

              {/* Value */}
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-600">
                  {stat.label}
                </p>
              </div>

              {/* Growth */}
              {stat.growth !== undefined && (
                <div className={cn(
                  'flex items-center justify-center gap-1 mt-2 text-xs font-medium',
                  getTrendColor(stat.growth)
                )}>
                  {getTrendIcon(stat.growth)}
                  <span>{Math.abs(stat.growth)}%</span>
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-4', className)}>
        {stats.map((stat, index) => (
          <motion.div
            key={stat.id}
            initial={animated ? { opacity: 0, scale: 0.9 } : {}}
            animate={animated ? { opacity: 1, scale: 1 } : {}}
            transition={animated ? { delay: index * 0.05, duration: 0.2 } : {}}
            className="text-center"
          >
            {/* Icon */}
            <div className={cn(
              'w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center',
              stat.bgColor
            )}>
              <stat.icon className={cn('w-5 h-5', stat.iconColor)} />
            </div>

            {/* Value */}
            <p className="text-lg font-semibold text-gray-900 mb-1">
              {stat.value}
            </p>
            
            {/* Label */}
            <p className="text-xs text-gray-600">
              {stat.label}
            </p>

            {/* Growth */}
            {stat.growth !== undefined && (
              <div className={cn(
                'flex items-center justify-center gap-1 mt-1 text-xs font-medium',
                getTrendColor(stat.growth)
              )}>
                {getTrendIcon(stat.growth)}
                <span>{Math.abs(stat.growth)}%</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    );
  }

  // Inline variant
  return (
    <div className={cn('flex flex-wrap items-center gap-4 text-sm', className)}>
      {stats.map((stat, index) => (
        <motion.div
          key={stat.id}
          initial={animated ? { opacity: 0, x: -10 } : {}}
          animate={animated ? { opacity: 1, x: 0 } : {}}
          transition={animated ? { delay: index * 0.05, duration: 0.2 } : {}}
          className="flex items-center gap-2"
        >
          <div className={cn(
            'w-8 h-8 rounded-md flex items-center justify-center',
            stat.bgColor
          )}>
            <stat.icon className={cn('w-4 h-4', stat.iconColor)} />
          </div>
          
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-gray-900">
              {stat.value}
            </span>
            <span className="text-gray-600">
              {stat.label}
            </span>
            
            {stat.growth !== undefined && (
              <div className={cn(
                'flex items-center gap-0.5 text-xs font-medium',
                getTrendColor(stat.growth)
              )}>
                {getTrendIcon(stat.growth)}
                <span>{Math.abs(stat.growth)}%</span>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.courts === nextProps.courts &&
    prevProps.members === nextProps.members &&
    prevProps.occupancy === nextProps.occupancy &&
    prevProps.revenue === nextProps.revenue &&
    prevProps.variant === nextProps.variant &&
    JSON.stringify(prevProps.growth) === JSON.stringify(nextProps.growth)
  );
});

ProfessionalClubStats.displayName = 'ProfessionalClubStats';

export default ProfessionalClubStats;