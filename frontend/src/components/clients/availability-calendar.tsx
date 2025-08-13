'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Calendar,
  Clock,
  Sun,
  Moon,
  Sunset,
  Plus,
  Minus,
  Settings,
  Info
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AvailabilitySchedule } from '@/types/client';

interface AvailabilityCalendarProps {
  value: AvailabilitySchedule;
  onChange: (schedule: AvailabilitySchedule) => void;
  disabled?: boolean;
  showTimeSlots?: boolean;
  className?: string;
}

const WEEKDAYS = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
];

const WEEKENDS = [
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

const TIME_PERIODS = [
  { 
    key: 'morning', 
    label: 'Morning', 
    icon: Sun, 
    time: '6:00 - 12:00',
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200'
  },
  { 
    key: 'afternoon', 
    label: 'Afternoon', 
    icon: Sun, 
    time: '12:00 - 18:00',
    color: 'text-orange-600 bg-orange-50 border-orange-200'
  },
  { 
    key: 'evening', 
    label: 'Evening', 
    icon: Moon, 
    time: '18:00 - 23:00',
    color: 'text-blue-600 bg-blue-50 border-blue-200'
  },
];

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

export function AvailabilityCalendar({
  value,
  onChange,
  disabled = false,
  showTimeSlots = false,
  className,
}: AvailabilityCalendarProps) {
  const { t } = useTranslation();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const updateDayAvailability = (
    dayType: 'weekdays' | 'weekends',
    dayKey: string,
    updates: Partial<AvailabilitySchedule['weekdays'][string]>
  ) => {
    const newSchedule = { ...value };
    newSchedule[dayType] = {
      ...newSchedule[dayType],
      [dayKey]: {
        ...newSchedule[dayType][dayKey],
        ...updates,
      }
    };
    onChange(newSchedule);
  };

  const togglePeriod = (
    dayType: 'weekdays' | 'weekends',
    dayKey: string,
    period: 'morning' | 'afternoon' | 'evening'
  ) => {
    const currentValue = value[dayType][dayKey]?.[period] || false;
    updateDayAvailability(dayType, dayKey, {
      [period]: !currentValue,
      available: true, // Auto-enable day if any period is selected
    });
  };

  const toggleDayAvailability = (
    dayType: 'weekdays' | 'weekends',
    dayKey: string
  ) => {
    const currentValue = value[dayType][dayKey]?.available || false;
    updateDayAvailability(dayType, dayKey, {
      available: !currentValue,
      morning: !currentValue,
      afternoon: !currentValue,
      evening: !currentValue,
    });
  };

  const getActivePeriods = (dayType: 'weekdays' | 'weekends', dayKey: string) => {
    const day = value[dayType][dayKey];
    if (!day) return 0;
    
    let count = 0;
    if (day.morning) count++;
    if (day.afternoon) count++;
    if (day.evening) count++;
    return count;
  };

  const renderDayCard = (
    day: { key: string; label: string; short: string },
    dayType: 'weekdays' | 'weekends'
  ) => {
    const dayData = value[dayType][day.key] || {
      available: false,
      morning: false,
      afternoon: false,
      evening: false,
    };
    
    const activePeriods = getActivePeriods(dayType, day.key);
    const isAvailable = dayData.available;

    return (
      <Card
        key={day.key}
        className={cn(
          'transition-all duration-200 cursor-pointer hover:shadow-apple-md',
          isAvailable 
            ? 'border-primary-200 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-800' 
            : 'border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => !disabled && toggleDayAvailability(dayType, day.key)}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                {day.short}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t(`common.days.${day.key}`)}
              </p>
            </div>
            
            <Switch
              checked={isAvailable}
              onCheckedChange={() => toggleDayAvailability(dayType, day.key)}
              disabled={disabled}
            />
          </div>

          {isAvailable && (
            <div className="space-y-2">
              {/* Time Periods */}
              <div className="grid grid-cols-3 gap-1">
                {TIME_PERIODS.map((period) => {
                  const isActive = dayData[period.key as keyof typeof dayData] as boolean;
                  const Icon = period.icon;
                  
                  return (
                    <TooltipProvider key={period.key}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              'h-8 px-2 text-xs',
                              isActive 
                                ? period.color 
                                : 'text-gray-400 hover:text-gray-600'
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!disabled) {
                                togglePeriod(dayType, day.key, period.key as any);
                              }
                            }}
                            disabled={disabled}
                          >
                            <Icon className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{period.label} ({period.time})</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>

              {/* Active periods badge */}
              {activePeriods > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activePeriods} {t('clients.availability.periodsActive')}
                </Badge>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <TooltipProvider>
      <div className={cn('space-y-6', className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium text-gray-900 dark:text-white">
              {t('clients.availability.title')}
            </Label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('clients.availability.description')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Info className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('clients.availability.help')}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Set all weekdays available with all periods
              const newSchedule = { ...value };
              WEEKDAYS.forEach(day => {
                newSchedule.weekdays[day.key] = {
                  available: true,
                  morning: true,
                  afternoon: true,
                  evening: true,
                };
              });
              onChange(newSchedule);
            }}
            disabled={disabled}
          >
            <Plus className="mr-1 h-3 w-3" />
            {t('clients.availability.allWeekdays')}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Set all weekends available with all periods
              const newSchedule = { ...value };
              WEEKENDS.forEach(day => {
                newSchedule.weekends[day.key] = {
                  available: true,
                  morning: true,
                  afternoon: true,
                  evening: true,
                };
              });
              onChange(newSchedule);
            }}
            disabled={disabled}
          >
            <Plus className="mr-1 h-3 w-3" />
            {t('clients.availability.allWeekends')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Clear all availability
              const newSchedule = { weekdays: {}, weekends: {} };
              [...WEEKDAYS, ...WEEKENDS].forEach(day => {
                const dayType = WEEKDAYS.includes(day) ? 'weekdays' : 'weekends';
                newSchedule[dayType][day.key] = {
                  available: false,
                  morning: false,
                  afternoon: false,
                  evening: false,
                };
              });
              onChange(newSchedule);
            }}
            disabled={disabled}
          >
            <Minus className="mr-1 h-3 w-3" />
            {t('common.clearAll')}
          </Button>
        </div>

        {/* Weekdays */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('clients.availability.weekdays')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {WEEKDAYS.map(day => renderDayCard(day, 'weekdays'))}
          </div>
        </div>

        {/* Weekends */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Sunset className="h-4 w-4" />
            {t('clients.availability.weekends')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {WEEKENDS.map(day => renderDayCard(day, 'weekends'))}
          </div>
        </div>

        {/* Advanced Time Slots */}
        {showTimeSlots && (
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {t('clients.availability.advancedSettings')}
                </span>
                <Clock className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-4">
              <Card className="p-4">
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('clients.availability.specificTimes')}
                  </p>
                  
                  {/* Day Selector */}
                  <Select value={selectedDay || ''} onValueChange={setSelectedDay}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('clients.availability.selectDay')} />
                    </SelectTrigger>
                    <SelectContent>
                      {[...WEEKDAYS, ...WEEKENDS].map(day => (
                        <SelectItem key={day.key} value={day.key || ''}>
                          {t(`common.days.${day.key}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Time Slots Grid */}
                  {selectedDay && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {TIME_SLOTS.map(time => {
                        const dayType = WEEKDAYS.find(d => d.key === selectedDay) ? 'weekdays' : 'weekends';
                        const dayData = value[dayType][selectedDay];
                        const specificTimes = dayData?.specific_times || [];
                        const isSelected = specificTimes.includes(time);

                        return (
                          <Button
                            key={time}
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              const newSpecificTimes = isSelected
                                ? specificTimes.filter(t => t !== time)
                                : [...specificTimes, time];
                              
                              updateDayAvailability(dayType, selectedDay, {
                                specific_times: newSpecificTimes,
                                available: newSpecificTimes.length > 0,
                              });
                            }}
                            disabled={disabled}
                          >
                            {time}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Availability Summary */}
        <Card className="p-4 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {t('clients.availability.summary')}
            </span>
          </div>
          
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {(() => {
              const weekdayCount = WEEKDAYS.filter(day => 
                value.weekdays[day.key]?.available
              ).length;
              const weekendCount = WEEKENDS.filter(day => 
                value.weekends[day.key]?.available
              ).length;
              const totalPeriods = [...WEEKDAYS, ...WEEKENDS].reduce((acc, day) => {
                const dayType = WEEKDAYS.includes(day) ? 'weekdays' : 'weekends';
                return acc + getActivePeriods(dayType, day.key);
              }, 0);

              return `${weekdayCount} ${t('clients.availability.weekdaysAvailable')}, ${weekendCount} ${t('clients.availability.weekendsAvailable')}, ${totalPeriods} ${t('clients.availability.totalPeriods')}`;
            })()}
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
}