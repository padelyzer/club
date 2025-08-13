'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Clock,
  Save,
  RotateCcw,
  Copy,
  Plus,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/ui/states/loading-state';
import { ErrorState } from '@/components/ui/states/error-state';
import {
  useEmployeeSchedule,
  useUpdateEmployeeSchedule,
} from '@/lib/api/hooks/useEmployees';
import { WeeklySchedule } from '@/types/employee';
import { motion } from 'framer-motion';
import { toast } from '@/lib/toast';

interface EmployeeScheduleProps {
  clubId: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 0, label: 'Sunday', short: 'Sun' },
];

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

export function EmployeeSchedule({
  clubId,
  employeeId,
  employeeName,
  employeeRole,
}: EmployeeScheduleProps) {
  const { t } = useTranslation();
  const [editMode, setEditMode] = useState(false);
  const [localSchedules, setLocalSchedules] = useState<WeeklySchedule[]>([]);

  const {
    data: schedule,
    isLoading,
    error,
  } = useEmployeeSchedule(clubId, employeeId);
  const updateSchedule = useUpdateEmployeeSchedule(clubId, employeeId);

  // Initialize local schedules when data loads
  useState(() => {
    if (schedule?.schedules) {
      setLocalSchedules(schedule.schedules);
    }
  });

  const handleSave = async () => {
    try {
      await updateSchedule.mutateAsync(localSchedules);
      setEditMode(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleCancel = () => {
    setLocalSchedules(schedule?.schedules || []);
    setEditMode(false);
  };

  const handleAddSchedule = (dayOfWeek: number) => {
    const newSchedule: WeeklySchedule = {
      day_of_week: dayOfWeek,
      start_time: '09:00',
      end_time: '18:00',
      is_available: true,
    };
    setLocalSchedules([...localSchedules, newSchedule]);
  };

  const handleRemoveSchedule = (index: number) => {
    setLocalSchedules(localSchedules.filter((_, i) => i !== index));
  };

  const handleUpdateSchedule = (
    index: number,
    field: keyof WeeklySchedule,
    value: any
  ) => {
    const updated = [...localSchedules];
    updated[index] = { ...updated[index], [field]: value };
    setLocalSchedules(updated);
  };

  const handleCopyToAll = (sourceIndex: number) => {
    const sourceSchedule = localSchedules[sourceIndex];
    const newSchedules = DAYS_OF_WEEK.map((day) => ({
      ...sourceSchedule,
      day_of_week: day.value,
    }));
    setLocalSchedules(newSchedules);
    toast.success(t('employees.scheduleCopied'));
  };

  const getDaySchedules = (dayOfWeek: number) => {
    return localSchedules.filter((s) => s.day_of_week === dayOfWeek);
  };

  if (isLoading) {
    return <LoadingState message={t('employees.loadingSchedule')} />;
  }

  if (error) {
    return <ErrorState message={t('employees.errorLoadingSchedule')} />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t('employees.weeklySchedule')}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {t('employees.scheduleFor', { name: employeeName })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <RotateCcw className="w-4 h-4 mr-2" />
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateSchedule.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {t('common.save')}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditMode(true)}
            >
              {t('common.edit')}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {schedule && (
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t('employees.flexibleSchedule')}
              </span>
              <Switch
                checked={schedule.is_flexible}
                disabled={!editMode}
                onCheckedChange={(checked) => {
                  // Update flexible schedule setting
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">
                  {t('employees.minHours')}:{' '}
                </span>
                <span className="font-medium">
                  {schedule.min_hours_per_week}h
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t('employees.maxHours')}:{' '}
                </span>
                <span className="font-medium">
                  {schedule.max_hours_per_week}h
                </span>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="grid" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="grid">{t('employees.gridView')}</TabsTrigger>
            <TabsTrigger value="list">{t('employees.listView')}</TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="space-y-4">
            <div className="grid grid-cols-7 gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const daySchedules = getDaySchedules(day.value);
                const isWorkingDay =
                  daySchedules.length > 0 &&
                  daySchedules.some((s) => s.is_available);

                return (
                  <motion.div
                    key={day.value}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: day.value * 0.05 }}
                    className="space-y-2"
                  >
                    <div className="text-center">
                      <p className="text-sm font-medium">{day.short}</p>
                      <Badge
                        variant={isWorkingDay ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {isWorkingDay
                          ? t('employees.working')
                          : t('employees.off')}
                      </Badge>
                    </div>

                    {daySchedules.map((schedule, index) => (
                      <Card key={index} className="p-2">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <Clock className="w-3 h-3" />
                            {editMode && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0"
                                onClick={() => {
                                  const globalIndex = localSchedules.findIndex(
                                    (s) => s === schedule
                                  );
                                  handleRemoveSchedule(globalIndex);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                          <p className="font-medium">
                            {schedule.start_time} - {schedule.end_time}
                          </p>
                          {!schedule.is_available && (
                            <Badge variant="outline" className="text-xs">
                              {t('employees.unavailable')}
                            </Badge>
                          )}
                        </div>
                      </Card>
                    ))}

                    {editMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8"
                        onClick={() => handleAddSchedule(day.value)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            {DAYS_OF_WEEK.map((day) => {
              const daySchedules = getDaySchedules(day.value);

              return (
                <Card key={day.value} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{day.label}</h4>
                    {editMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddSchedule(day.value)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {t('employees.addShift')}
                      </Button>
                    )}
                  </div>

                  {daySchedules.length > 0 ? (
                    <div className="space-y-2">
                      {daySchedules.map((schedule, index) => {
                        const globalIndex = localSchedules.findIndex(
                          (s) => s === schedule
                        );

                        return (
                          <div
                            key={index}
                            className="flex items-center gap-4 p-3 bg-muted rounded-lg"
                          >
                            <div className="flex-1 grid grid-cols-3 gap-4">
                              <Select
                                value={schedule.start_time || ''}
                                onValueChange={(value) =>
                                  handleUpdateSchedule(
                                    globalIndex,
                                    'start_time',
                                    value
                                  )
                                }
                                disabled={!editMode}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TIME_SLOTS.map((time) => (
                                    <SelectItem key={time} value={time || ''}>
                                      {time}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Select
                                value={schedule.end_time || ''}
                                onValueChange={(value) =>
                                  handleUpdateSchedule(
                                    globalIndex,
                                    'end_time',
                                    value
                                  )
                                }
                                disabled={!editMode}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TIME_SLOTS.map((time) => (
                                    <SelectItem key={time} value={time || ''}>
                                      {time}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={schedule.is_available}
                                  onCheckedChange={(checked) =>
                                    handleUpdateSchedule(
                                      globalIndex,
                                      'is_available',
                                      checked
                                    )
                                  }
                                  disabled={!editMode}
                                />
                                <Label className="text-sm">
                                  {schedule.is_available
                                    ? t('employees.available')
                                    : t('employees.unavailable')}
                                </Label>
                              </div>
                            </div>

                            {editMode && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopyToAll(globalIndex)}
                                  title={t('employees.copyToAllDays')}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleRemoveSchedule(globalIndex)
                                  }
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t('employees.noschedule')}
                    </p>
                  )}
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
