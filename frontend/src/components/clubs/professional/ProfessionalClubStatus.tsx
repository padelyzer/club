import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DaySchedule } from '@/types/club';
import { cn } from '@/lib/utils';

interface ProfessionalClubStatusProps {
  schedule: DaySchedule[];
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'card' | 'inline';
  showHours?: boolean;
  className?: string;
}

export const ProfessionalClubStatus = memo<ProfessionalClubStatusProps>(({ 
  schedule, 
  size = 'md',
  variant = 'badge',
  showHours = true,
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
      return { 
        isOpen: false, 
        text: t('clubs.closed'),
        nextOpen: getNextOpenTime(),
        hours: null
      };
    }

    if (todaySchedule.open_time && todaySchedule.close_time) {
      const isOpen =
        currentTime >= todaySchedule.open_time &&
        currentTime <= todaySchedule.close_time;
      
      return {
        isOpen,
        text: isOpen ? t('clubs.openNow') : t('clubs.closed'),
        hours: `${todaySchedule.open_time} - ${todaySchedule.close_time}`,
        nextOpen: !isOpen ? getNextOpenTime() : null,
      };
    }

    return { 
      isOpen: false, 
      text: t('clubs.closed'),
      nextOpen: getNextOpenTime(),
      hours: null
    };
  };

  const getNextOpenTime = () => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    
    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (now.getDay() + i) % 7;
      const nextDay = days[nextDayIndex];
      const nextSchedule = schedule.find(s => s.day === nextDay);
      
      if (nextSchedule?.is_open && nextSchedule.open_time) {
        const dayName = t(`days.${nextDay}`);
        return `${dayName} ${nextSchedule.open_time}`;
      }
    }
    
    return null;
  };

  const status = getOperatingStatus();

  const sizeClasses = {
    sm: {
      text: 'text-xs',
      icon: 'w-3 h-3',
      padding: 'px-2 py-1',
    },
    md: {
      text: 'text-sm',
      icon: 'w-4 h-4',
      padding: 'px-3 py-1.5',
    },
    lg: {
      text: 'text-base',
      icon: 'w-5 h-5',
      padding: 'px-4 py-2',
    },
  };

  const getStatusStyles = () => {
    if (status.isOpen) {
      return {
        bg: 'bg-green-50/80 backdrop-blur-md border-green-200/50',
        text: 'text-green-700',
        icon: 'text-green-600',
        dot: 'bg-green-500',
      };
    }
    return {
      bg: 'bg-gray-50/80 backdrop-blur-md border-gray-200/50',
      text: 'text-gray-700',
      icon: 'text-gray-500',
      dot: 'bg-gray-400',
    };
  };

  const styles = getStatusStyles();

  if (variant === 'card') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn('p-4 rounded-xl border', styles.bg, className)}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className={cn('p-2 rounded-lg', status.isOpen ? 'bg-green-100' : 'bg-gray-100')}>
            {status.isOpen ? (
              <CheckCircle className={cn('w-5 h-5', styles.icon)} />
            ) : (
              <XCircle className={cn('w-5 h-5', styles.icon)} />
            )}
          </div>
          
          <div className="flex-1">
            <p className={cn('font-semibold', styles.text)}>
              {status.text}
            </p>
            {status.hours && showHours && (
              <p className="text-xs text-gray-600">
                {status.hours}
              </p>
            )}
          </div>
          
          <div className={cn('w-3 h-3 rounded-full animate-pulse', styles.dot)} />
        </div>
        
        {status.nextOpen && (
          <p className="text-xs text-gray-500">
            {t('clubs.nextOpen')}: {status.nextOpen}
          </p>
        )}
      </motion.div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2', sizeClasses[size].text, className)}>
        <Clock className={cn('shrink-0', sizeClasses[size].icon, styles.icon)} />
        
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', styles.dot)} />
          <span className={styles.text}>
            {status.text}
          </span>
        </div>
        
        {status.hours && showHours && (
          <>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">
              {status.hours}
            </span>
          </>
        )}
      </div>
    );
  }

  // Badge variant (default)
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border',
        sizeClasses[size].padding,
        sizeClasses[size].text,
        styles.bg,
        className
      )}
    >
      <div className={cn('w-2 h-2 rounded-full animate-pulse', styles.dot)} />
      
      <span className={cn('font-medium', styles.text)}>
        {status.text}
      </span>
      
      {status.hours && showHours && size !== 'sm' && (
        <>
          <span className="text-gray-400">•</span>
          <span className="text-gray-600 font-normal">
            {status.hours}
          </span>
        </>
      )}
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return (
    JSON.stringify(prevProps.schedule) === JSON.stringify(nextProps.schedule) &&
    prevProps.size === nextProps.size &&
    prevProps.variant === nextProps.variant &&
    prevProps.showHours === nextProps.showHours
  );
});

ProfessionalClubStatus.displayName = 'ProfessionalClubStatus';

export default ProfessionalClubStatus;