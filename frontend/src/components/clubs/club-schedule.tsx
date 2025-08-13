'use client';

import { Clock, Edit } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DaySchedule } from '@/types/club';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ClubScheduleProps {
  schedule: DaySchedule[];
  editable?: boolean;
  onEdit?: () => void;
}

export const ClubSchedule: React.FC<ClubScheduleProps> = ({
  schedule,
  editable = false,
  onEdit,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('clubs.operatingHours')}
          </h3>
        </div>
        {editable && (
          <Button onClick={onEdit} size="sm" variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            {t('common.edit')}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {schedule.map((day) => (
          <div
            key={day.day}
            className={cn(
              'flex items-center justify-between p-3 rounded-lg',
              day.is_open
                ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                : 'bg-gray-50 dark:bg-gray-800/50'
            )}
          >
            <span
              className={cn(
                'font-medium capitalize',
                day.is_open
                  ? 'text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {t(`days.${day.day}`)}
            </span>
            <span
              className={cn(
                day.is_open
                  ? 'text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {day.is_open && day.open_time && day.close_time
                ? `${day.open_time} - ${day.close_time}`
                : t('clubs.closed')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
