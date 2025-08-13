'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  Clock,
  Calendar,
  Plus,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Settings,
  Repeat,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LoadingState } from '@/components/ui/states/loading-state';
import { ErrorState } from '@/components/ui/states/error-state';

import { CourtsService } from '@/lib/api/services/courts.service';
import { CourtAvailability } from '@/types/court';
import { toast } from '@/lib/toast';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

const availabilitySchema = z.object({
  date: z.string().min(1, 'Selecciona una fecha'),
  start_time: z.string().min(1, 'Selecciona hora de inicio'),
  end_time: z.string().min(1, 'Selecciona hora de fin'),
  is_available: z.boolean(),
  reason: z.string().optional(),
});

const recurringAvailabilitySchema = z.object({
  days_of_week: z.array(z.number()).min(1, 'Selecciona al menos un día'),
  start_time: z.string().min(1, 'Selecciona hora de inicio'),
  end_time: z.string().min(1, 'Selecciona hora de fin'),
  is_available: z.boolean(),
  start_date: z.string().min(1, 'Selecciona fecha de inicio'),
  end_date: z.string().optional(),
  reason: z.string().optional(),
});

type AvailabilityForm = z.infer<typeof availabilitySchema>;
type RecurringAvailabilityForm = z.infer<typeof recurringAvailabilitySchema>;

interface CourtAvailabilityConfigProps {
  courtId: number;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lun', name: 'Lunes' },
  { value: 2, label: 'Mar', name: 'Martes' },
  { value: 3, label: 'Mié', name: 'Miércoles' },
  { value: 4, label: 'Jue', name: 'Jueves' },
  { value: 5, label: 'Vie', name: 'Viernes' },
  { value: 6, label: 'Sáb', name: 'Sábado' },
  { value: 0, label: 'Dom', name: 'Domingo' },
];

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

export const CourtAvailabilityConfig = ({
  courtId,
}: CourtAvailabilityConfigProps) => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const queryClient = useQueryClient();

  const startDate =
    viewMode === 'week'
      ? startOfWeek(new Date(selectedDate), { weekStartsOn: 1 })
      : new Date(selectedDate);

  const endDate =
    viewMode === 'week'
      ? endOfWeek(new Date(selectedDate), { weekStartsOn: 1 })
      : new Date(selectedDate);

  const {
    data: availability,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      'court-availability',
      courtId,
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd'),
    ],
    queryFn: () =>
      CourtsService.getAvailability(courtId, {
        date_from: format(startDate, 'yyyy-MM-dd'),
        date_to: format(endDate, 'yyyy-MM-dd'),
      }),
  });

  const updateAvailabilityMutation = useMutation({
    mutationFn: (data: { date: string; time_slots: any[] }) =>
      CourtsService.updateAvailability(courtId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['court-availability', courtId],
      });
      toast.success('Disponibilidad actualizada');
      setShowSingleModal(false);
    },
    onError: () => {
      toast.error('Error al actualizar disponibilidad');
    },
  });

  const setRecurringAvailabilityMutation = useMutation({
    mutationFn: (data: any) =>
      CourtsService.setRecurringAvailability(courtId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['court-availability', courtId],
      });
      toast.success('Disponibilidad recurrente configurada');
      setShowRecurringModal(false);
    },
    onError: () => {
      toast.error('Error al configurar disponibilidad recurrente');
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AvailabilityForm>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      date: selectedDate,
      is_available: true,
    },
  });

  const {
    register: registerRecurring,
    handleSubmit: handleSubmitRecurring,
    formState: { errors: recurringErrors },
    reset: resetRecurring,
    watch,
    setValue,
  } = useForm<RecurringAvailabilityForm>({
    resolver: zodResolver(recurringAvailabilitySchema),
    defaultValues: {
      days_of_week: [],
      is_available: true,
      start_date: new Date().toISOString().split('T')[0],
    },
  });

  const watchedDays = watch('days_of_week') || [];

  if (isLoading) return <LoadingState message="Cargando disponibilidad..." fullScreen={false} />;
  if (error) return <ErrorState message="Error al cargar la disponibilidad" />;

  const onSubmitSingle = (data: AvailabilityForm) => {
    const timeSlots = [
      {
        start_time: data.start_time,
        end_time: data.end_time,
        is_available: data.is_available,
        reason: data.reason,
      },
    ];

    updateAvailabilityMutation.mutate({
      date: data.date,
      time_slots: timeSlots,
    });
  };

  const onSubmitRecurring = (data: RecurringAvailabilityForm) => {
    setRecurringAvailabilityMutation.mutate(data);
  };

  const handleDayToggle = (day: number) => {
    const newDays = watchedDays.includes(day)
      ? watchedDays.filter((d) => d !== day)
      : [...watchedDays, day];
    setValue('days_of_week', newDays);
  };

  const getSlotStatus = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayAvailability = availability?.find((a: any) => a.date === dateStr);

    if (!dayAvailability) return 'unknown';

    const slot = dayAvailability.time_slots.find(
      (slot: any) => slot.start_time === time
    );

    if (!slot) return 'unknown';
    if (!slot.is_available && slot.reservation_id) return 'booked';
    if (!slot.is_available && slot.maintenance_id) return 'maintenance';
    if (!slot.is_available) return 'blocked';

    return 'available';
  };

  const getSlotColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 hover:bg-green-200 border-green-300 text-green-800';
      case 'booked':
        return 'bg-blue-100 border-blue-300 text-blue-800 cursor-not-allowed';
      case 'maintenance':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800 cursor-not-allowed';
      case 'blocked':
        return 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-600';
    }
  };

  const renderWeekView = () => {
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

    return (
      <div className="grid grid-cols-8 gap-1">
        {/* Header */}
        <div className="p-2 text-center font-medium bg-gray-50">Hora</div>
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className="p-2 text-center font-medium bg-gray-50"
          >
            <div>{format(day, 'EEE', { locale: es })}</div>
            <div className="text-xs text-gray-600">{format(day, 'd')}</div>
          </div>
        ))}

        {/* Time slots */}
        {TIME_SLOTS.filter((_, i) => i % 2 === 0).map((time) => (
          <React.Fragment key={time}>
            <div className="p-2 text-sm text-gray-600 bg-gray-50 text-center">
              {time}
            </div>
            {weekDays.map((day) => {
              const status = getSlotStatus(day, time);
              return (
                <button
                  key={`${day.toISOString()}-${time}`}
                  className={`p-2 text-xs border transition-colors ${getSlotColor(status)}`}
                  disabled={status === 'booked' || status === 'maintenance'}
                  title={`${format(day, 'dd/MM')} ${time} - ${status}`}
                >
                  {status === 'booked'
                    ? '●'
                    : status === 'maintenance'
                      ? '⚠'
                      : ''}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6" />
            Configuración de Disponibilidad
          </h2>
          <p className="text-gray-600 mt-1">
            Gestiona los horarios disponibles para reservas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={viewMode || ''}
            onValueChange={(value: any) => setViewMode(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Día</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={showSingleModal} onOpenChange={setShowSingleModal}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Bloqueo Individual
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configurar Disponibilidad</DialogTitle>
              </DialogHeader>
              <SingleAvailabilityForm
                onSubmit={onSubmitSingle}
                register={register}
                handleSubmit={handleSubmit}
                errors={errors}
                isLoading={updateAvailabilityMutation.isPending}
                onCancel={() => {
                  setShowSingleModal(false);
                  reset();
                }}
              />
            </DialogContent>
          </Dialog>

          <Dialog
            open={showRecurringModal}
            onOpenChange={setShowRecurringModal}
          >
            <DialogTrigger asChild>
              <Button>
                <Repeat className="w-4 h-4 mr-2" />
                Configuración Recurrente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Disponibilidad Recurrente</DialogTitle>
              </DialogHeader>
              <RecurringAvailabilityForm
                onSubmit={onSubmitRecurring}
                register={registerRecurring}
                handleSubmit={handleSubmitRecurring}
                errors={recurringErrors}
                isLoading={setRecurringAvailabilityMutation.isPending}
                watchedDays={watchedDays}
                onDayToggle={handleDayToggle}
                onCancel={() => {
                  setShowRecurringModal(false);
                  resetRecurring();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Date Navigation */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() =>
              setSelectedDate(
                format(
                  addDays(
                    new Date(selectedDate),
                    viewMode === 'week' ? -7 : -1
                  ),
                  'yyyy-MM-dd'
                )
              )
            }
          >
            ← Anterior
          </Button>

          <div className="text-center">
            <Input
              type="date"
              value={selectedDate || ''}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40 text-center"
            />
            <p className="text-sm text-gray-600 mt-1">
              {viewMode === 'week'
                ? `${format(startDate, 'd MMM', { locale: es })} - ${format(endDate, 'd MMM', { locale: es })}`
                : format(new Date(selectedDate), "d 'de' MMMM", { locale: es })}
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() =>
              setSelectedDate(
                format(
                  addDays(new Date(selectedDate), viewMode === 'week' ? 7 : 1),
                  'yyyy-MM-dd'
                )
              )
            }
          >
            Siguiente →
          </Button>
        </div>
      </Card>

      {/* Legend */}
      <Card className="p-4">
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
            <span>Disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
            <span>Reservado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span>Mantenimiento</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span>Bloqueado</span>
          </div>
        </div>
      </Card>

      {/* Availability Grid */}
      <Card className="p-4">
        <div className="overflow-auto">{renderWeekView()}</div>
      </Card>
    </div>
  );
};

// Single Availability Form Component
const SingleAvailabilityForm = ({
  onSubmit,
  register,
  handleSubmit,
  errors,
  isLoading,
  onCancel,
}: any) => (
  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
    <div>
      <label className="block text-sm font-medium mb-1">Fecha</label>
      <Input type="date" {...register('date')} />
      {errors.date && (
        <p className="text-red-500 text-sm">{errors.date.message}</p>
      )}
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">Hora inicio</label>
        <Select
          onValueChange={(value) =>
            register('start_time').onChange({ target: { value } })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {TIME_SLOTS.map((time) => (
              <SelectItem key={time} value={time || ''}>
                {time}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Hora fin</label>
        <Select
          onValueChange={(value) =>
            register('end_time').onChange({ target: { value } })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {TIME_SLOTS.map((time) => (
              <SelectItem key={time} value={time || ''}>
                {time}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>

    <div className="flex items-center space-x-2">
      <Checkbox {...register('is_available')} id="available" />
      <label htmlFor="available" className="text-sm">
        Disponible para reservas
      </label>
    </div>

    <div>
      <label className="block text-sm font-medium mb-1">Razón (opcional)</label>
      <Input {...register('reason')} placeholder="Motivo del bloqueo..." />
    </div>

    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Guardando...' : 'Guardar'}
      </Button>
    </div>
  </form>
);

// Recurring Availability Form Component
const RecurringAvailabilityForm = ({
  onSubmit,
  register,
  handleSubmit,
  errors,
  isLoading,
  watchedDays,
  onDayToggle,
  onCancel,
}: any) => (
  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
    <div>
      <label className="block text-sm font-medium mb-2">
        Días de la semana
      </label>
      <div className="grid grid-cols-2 gap-2">
        {DAYS_OF_WEEK.map((day) => (
          <div key={day.value} className="flex items-center space-x-2">
            <Checkbox
              checked={watchedDays.includes(day.value)}
              onCheckedChange={() => onDayToggle(day.value)}
            />
            <label className="text-sm">{day.name}</label>
          </div>
        ))}
      </div>
      {errors.days_of_week && (
        <p className="text-red-500 text-sm">{errors.days_of_week.message}</p>
      )}
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">Hora inicio</label>
        <Select
          onValueChange={(value) =>
            register('start_time').onChange({ target: { value } })
          }
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
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Hora fin</label>
        <Select
          onValueChange={(value) =>
            register('end_time').onChange({ target: { value } })
          }
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
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">Fecha inicio</label>
        <Input type="date" {...register('start_date')} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Fecha fin (opcional)
        </label>
        <Input type="date" {...register('end_date')} />
      </div>
    </div>

    <div className="flex items-center space-x-2">
      <Checkbox {...register('is_available')} />
      <label className="text-sm">Disponible para reservas</label>
    </div>

    <div>
      <label className="block text-sm font-medium mb-1">Razón (opcional)</label>
      <Input {...register('reason')} placeholder="Motivo..." />
    </div>

    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Configurando...' : 'Configurar'}
      </Button>
    </div>
  </form>
);
