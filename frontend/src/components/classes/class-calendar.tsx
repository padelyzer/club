'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

interface ClassCalendarProps {
  classes: any[];
  instructors: any[];
  onClassSelect: (classItem: any) => void;
  onCreateClass: (date: Date, time: string) => void;
}

export const ClassCalendar = ({
  classes,
  instructors,
  onClassSelect,
  onCreateClass,
}: ClassCalendarProps) => {
  const { t } = useTranslation();

  // Simple week view for now
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 8 PM

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">
          {t('classes.calendar', 'Class Calendar')}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <div className="grid grid-cols-8 gap-2 min-w-full">
          {/* Header */}
          <div className="p-2 font-medium text-center">Time</div>
          {days.map((day) => (
            <div key={day} className="p-2 font-medium text-center">
              {day}
            </div>
          ))}

          {/* Time slots */}
          {hours.map((hour) => (
            <div key={hour} className="contents">
              <div className="p-2 text-sm text-muted-foreground text-center">
                {hour}:00
              </div>
              {days.map((day, dayIndex) => (
                <div
                  key={`${hour}-${day}`}
                  className="p-2 border border-gray-200 dark:border-gray-700 min-h-16 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer relative"
                  onClick={() => onCreateClass(new Date(), `${hour}:00`)}
                >
                  {/* Show classes for this time slot */}
                  {classes
                    .filter((cls) => {
                      const classHour = parseInt(
                        cls.startTime?.split(':')[0] || '0'
                      );
                      return classHour === hour;
                    })
                    .map((cls) => (
                      <div
                        key={cls.id}
                        className="absolute inset-1 bg-blue-100 dark:bg-blue-900/20 rounded p-1 text-xs cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/30"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClassSelect(cls);
                        }}
                      >
                        <div className="font-medium truncate">{cls.name}</div>
                        <div className="text-muted-foreground">
                          {cls.instructor?.name}
                        </div>
                      </div>
                    ))}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 hover:opacity-100 absolute top-1 right-1 h-6 w-6 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
