import React from 'react';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DaySchedule } from '@/types/club';

interface ClubStatusProps {
  schedule: DaySchedule[];
  size?: 'sm' | 'md';
  className?: string;
}

export const ClubStatus: React.FC<ClubStatusProps> = ({ 
  schedule, 
  size = 'md',
  className 
}) => {
  const { t } = useTranslation();

  const getOperatingStatus = () => {
    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[now.getDay()];
    const currentTime = now.toTimeString().slice(0, 5);

    const todaySchedule = schedule.find((s) => s.day === currentDay);

    if (!todaySchedule || !todaySchedule.is_open) {
      return { isOpen: false, text: t('clubs.closed') };
    }

    if (todaySchedule.open_time && todaySchedule.close_time) {
      const isOpen =
        currentTime >= todaySchedule.open_time &&
        currentTime <= todaySchedule.close_time;
      return {
        isOpen,
        text: isOpen ? t('clubs.openNow') : t('clubs.closed'),
        hours: `${todaySchedule.open_time} - ${todaySchedule.close_time}`,
      };
    }

    return { isOpen: false, text: t('clubs.closed') };
  };

  const status = getOperatingStatus();

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
  };

  return (
    <div className={cn('flex items-center gap-2', sizeClasses[size], className)}>
      <Clock className={cn('shrink-0', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      <Badge 
        variant={status.isOpen ? 'success' : 'secondary'}
        className={size === 'sm' ? 'text-xs' : ''}
      >
        {status.text}
      </Badge>
      {status.hours && (
        <span className="text-muted-foreground">
          {status.hours}
        </span>
      )}
    </div>
  );
};