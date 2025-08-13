import React, { memo } from 'react';
import { Users, TrendingUp, Calendar, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface ClubStatsProps {
  courts?: number;
  members?: number;
  occupancy?: number;
  revenue?: number;
  variant?: 'inline' | 'grid';
  className?: string;
}

export const ClubStats = memo<ClubStatsProps>(({ 
  courts = 0,
  members = 0,
  occupancy = 0,
  revenue,
  variant = 'inline',
  className 
}) => {
  const { t } = useTranslation();

  const stats = [
    {
      icon: Calendar,
      label: t('clubs.courts', { count: courts }),
      value: courts,
      color: 'text-blue-600',
    },
    {
      icon: Users,
      label: t('clubs.members'),
      value: members,
      color: 'text-green-600',
    },
    {
      icon: Target,
      label: t('clubs.occupancy'),
      value: `${occupancy}%`,
      color: 'text-purple-600',
    },
    ...(revenue !== undefined ? [{
      icon: TrendingUp,
      label: t('clubs.revenue'),
      value: `$${revenue.toLocaleString()}`,
      color: 'text-orange-600',
    }] : []),
  ];

  if (variant === 'grid') {
    return (
      <div className={cn('grid grid-cols-2 gap-3', className)}>
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center gap-2">
            <stat.icon className={cn('h-4 w-4', stat.color)} />
            <div>
              <p className="text-sm font-medium">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-4 text-sm', className)}>
      {stats.map((stat, index) => (
        <div key={index} className="flex items-center gap-1">
          <stat.icon className={cn('h-4 w-4', stat.color)} />
          <span className="text-gray-600 dark:text-gray-400">
            {stat.value} {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.courts === nextProps.courts &&
    prevProps.members === nextProps.members &&
    prevProps.occupancy === nextProps.occupancy &&
    prevProps.revenue === nextProps.revenue &&
    prevProps.variant === nextProps.variant
  );
});

ClubStats.displayName = 'ClubStats';