import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  Calendar,
  Repeat,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { Modal } from '@/components/layout/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUIStore } from '@/store/ui';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ReservationsService } from '@/lib/api/services/reservations.service';
import { ClientSearch } from './client-search';
import { CourtSelector } from './court-selector';
import { toast } from '@/lib/toast';
import {
  format,
  addWeeks,
  addMonths,
  eachDayOfInterval,
  isSameDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const recurringReservationSchema = z.object({
  client_id: z.string().min(1, 'Selecciona un cliente'),
  court_id: z.string().min(1, 'Selecciona una pista'),
  start_date: z.string().min(1, 'Selecciona fecha de inicio'),
  end_date: z.string().min(1, 'Selecciona fecha de fin'),
  start_time: z.string().min(1, 'Selecciona hora de inicio'),
  duration: z.number().min(30, 'Duración mínima 30 minutos'),
  recurrence_type: z.enum(['weekly', 'biweekly', 'monthly']),
  days_of_week: z.array(z.number()).min(1, 'Selecciona al menos un día'),
  notes: z.string().optional(),
});

type RecurringReservationForm = z.infer<typeof recurringReservationSchema>;

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

interface ConflictInfo {
  date: Date;
  reason: string;
  canResolve: boolean;
  existingReservation?: any;
}

export const RecurringReservationModal = () => {
  const { activeModal, closeModal } = useUIStore();
  const [previewDates, setPreviewDates] = useState<Date[]>([]);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [resolveConflicts, setResolveConflicts] = useState(false);
  const queryClient = useQueryClient();

  const createRecurringReservations = useMutation({
    mutationFn: (reservations: any[]) =>
      ReservationsService.bulkCreate(reservations),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Reservas recurrentes creadas exitosamente');
      closeModal();
      reset();
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || 'Error al crear las reservas'
      );
    },
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<RecurringReservationForm>({
    resolver: zodResolver(recurringReservationSchema),
    defaultValues: {
      duration: 90,
      recurrence_type: 'weekly',
      days_of_week: [],
      start_date: new Date().toISOString().split('T')[0],
      end_date: addMonths(new Date(), 3).toISOString().split('T')[0],
    },
  });

  const watchedFields = watch();

  const calculateRecurringDates = () => {
    const { start_date, end_date, recurrence_type, days_of_week } =
      watchedFields;
    if (!start_date || !end_date || days_of_week.length === 0) return [];

    const dates: Date[] = [];
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (days_of_week.includes(dayOfWeek)) {
        dates.push(new Date(currentDate));
      }

      if (recurrence_type === 'weekly') {
        currentDate = addWeeks(currentDate, 1);
      } else if (recurrence_type === 'biweekly') {
        currentDate = addWeeks(currentDate, 2);
      } else if (recurrence_type === 'monthly') {
        currentDate = addMonths(currentDate, 1);
      }
    }

    return dates;
  };

  const checkForConflicts = async (
    dates: Date[],
    courtId: string,
    startTime: string,
    duration: number
  ) => {
    if (!dates.length || !courtId || !startTime) return [];

    setIsCheckingConflicts(true);
    const conflictsList: ConflictInfo[] = [];

    try {
      const endTime = calculateEndTime(startTime, duration);

      for (const date of dates) {
        const dateStr = format(date, 'yyyy-MM-dd');

        try {
          const availability = await ReservationsService.checkAvailability({
            club_id: watchedFields.court_id?.split('_')[0] || '', // Extract club from court id
            court_id: courtId,
            date: dateStr,
            start_time: startTime,
            end_time: endTime,
          });

          // Check if slot is not available
          if (!availability.is_available) {
            conflictsList.push({
              date,
              reason: availability.reason || 'Horario ocupado',
              canResolve:
                availability.reason !== 'past' &&
                availability.reason !== 'blocked',
              existingReservation: availability.existing_reservation,
            });
          }
        } catch (error) {
          // Assume conflict if we cannot check
          conflictsList.push({
            date,
            reason: 'Error verificando disponibilidad',
            canResolve: false,
          });
        }
      }
    } catch (error) {
          } finally {
      setIsCheckingConflicts(false);
    }

    return conflictsList;
  };

  const handleDayToggle = (day: number) => {
    const currentDays = watchedFields.days_of_week || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];

    setValue('days_of_week', newDays);
    updatePreviewAndCheckConflicts();
  };

  const updatePreviewAndCheckConflicts = async () => {
    const dates = calculateRecurringDates();
    setPreviewDates(dates);

    const { court_id, start_time, duration } = watchedFields;
    if (dates.length > 0 && court_id && start_time && duration) {
      const conflictsList = await checkForConflicts(
        dates,
        court_id,
        start_time,
        duration
      );
      setConflicts(conflictsList);
    } else {
      setConflicts([]);
    }
  };

  // Effect to check conflicts when key fields change
  useEffect(() => {
    const {
      court_id,
      start_time,
      duration,
      start_date,
      end_date,
      days_of_week,
    } = watchedFields;
    if (
      court_id &&
      start_time &&
      duration &&
      start_date &&
      end_date &&
      days_of_week?.length
    ) {
      const timeoutId = setTimeout(() => {
        updatePreviewAndCheckConflicts();
      }, 500); // Debounce to avoid excessive API calls

      return () => clearTimeout(timeoutId);
    }
  }, [
    watchedFields.court_id,
    watchedFields.start_time,
    watchedFields.duration,
    watchedFields.start_date,
    watchedFields.end_date,
    watchedFields.days_of_week,
  ]);

  const onSubmit = async (data: RecurringReservationForm) => {
    const dates = calculateRecurringDates();
    if (dates.length === 0) {
      toast.error('No hay fechas válidas para las reservas recurrentes');
      return;
    }

    // Check for conflicts if not already resolved
    if (conflicts.length > 0 && !resolveConflicts) {
      toast.error(
        `Hay ${conflicts.length} conflictos que deben resolverse primero`
      );
      return;
    }

    // Filter out conflicted dates if resolving conflicts
    const validDates = resolveConflicts
      ? dates.filter(
          (date) =>
            !conflicts.some(
              (conflict) =>
                format(conflict.date, 'yyyy-MM-dd') ===
                format(date, 'yyyy-MM-dd')
            )
        )
      : dates;

    if (validDates.length === 0) {
      toast.error('No quedan fechas válidas después de resolver conflictos');
      return;
    }

    const reservations = validDates.map((date) => ({
      client_id: data.client_id,
      court_id: data.court_id,
      date: format(date, 'yyyy-MM-dd'),
      start_time: data.start_time,
      end_time: calculateEndTime(data.start_time, data.duration),
      notes: data.notes,
    }));

    await createRecurringReservations.mutateAsync(reservations);
  };

  const calculateEndTime = (
    startTime: string,
    durationMinutes: number
  ): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  if (activeModal !== 'recurring-reservation') return null;

  return (
    <Modal
      size="xl" as any
      onClose={() => {
        reset();
        setPreviewDates([]);
        closeModal();
      }}
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Repeat className="w-6 h-6" />
            Reservas Recurrentes
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Crea múltiples reservas con un patrón repetitivo
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Form */}
            <div className="space-y-4">
              <ClientSearch
                control={control}
                error={errors.client_id?.message}
              />

              <CourtSelector
                control={control}
                date={watchedFields.start_date}
                error={errors.court_id?.message}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Fecha inicio
                  </label>
                  <Input
                    type="date"
                    {...register('start_date')}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Fecha fin
                  </label>
                  <Input
                    type="date"
                    {...register('end_date')}
                    min={watchedFields.start_date}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Hora inicio
                  </label>
                  <Input type="time" {...register('start_time')} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Duración
                  </label>
                  <select
                    {...register('duration', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                  >
                    <option value={60 || ''}>1 hora</option>
                    <option value={90 || ''}>1.5 horas</option>
                    <option value={120 || ''}>2 horas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Frecuencia
                </label>
                <select
                  {...register('recurrence_type')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                  onChange={() => setPreviewDates(calculateRecurringDates())}
                >
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Quincenal</option>
                  <option value="monthly">Mensual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Días de la semana
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={
                        watchedFields.days_of_week?.includes(day.value)
                          ? 'default'
                          : 'outline'
                      }
                      size="sm"
                      onClick={() => handleDayToggle(day.value)}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
                {errors.days_of_week && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.days_of_week.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  {...register('notes')}
                  placeholder="Información adicional..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                  rows={3}
                />
              </div>
            </div>

            {/* Right Column - Preview */}
            <div>
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Vista previa ({previewDates.length} reservas)
                  {isCheckingConflicts && (
                    <Clock className="w-4 h-4 animate-spin text-blue-500" />
                  )}
                </h3>

                {conflicts.length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium text-red-800 dark:text-red-200">
                        {conflicts.length} conflictos encontrados
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="resolve-conflicts"
                        checked={resolveConflicts}
                        onChange={(e) => setResolveConflicts(e.target.checked)}
                        className="rounded"
                      />
                      <label
                        htmlFor="resolve-conflicts"
                        className="text-xs text-red-700 dark:text-red-300"
                      >
                        Omitir fechas con conflictos y continuar con las válidas
                      </label>
                    </div>
                  </div>
                )}

                {previewDates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Selecciona los días y fechas para ver la vista previa
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {previewDates.map((date, index) => {
                      const conflict = conflicts.find(
                        (c) =>
                          format(c.date, 'yyyy-MM-dd') ===
                          format(date, 'yyyy-MM-dd')
                      );
                      const isConflicted = !!conflict;
                      const willBeSkipped = isConflicted && resolveConflicts;

                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className={cn(
                            'p-2 rounded border',
                            isConflicted
                              ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
                              : 'border-gray-200 dark:border-gray-700',
                            willBeSkipped && 'opacity-50'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">
                                {format(date, "EEEE, d 'de' MMMM", {
                                  locale: es,
                                })}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {watchedFields.start_time} -{' '}
                                {calculateEndTime(
                                  watchedFields.start_time,
                                  watchedFields.duration
                                )}
                              </p>
                              {isConflicted && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                  {conflict.reason}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {isConflicted ? (
                                willBeSkipped ? (
                                  <XCircle className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )
                              ) : (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {previewDates.length > 20 && (
                  <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Se crearán muchas reservas. Verifica que las fechas sean
                      correctas.
                    </p>
                  </div>
                )}
              </Card>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                reset();
                setPreviewDates([]);
                closeModal();
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                createRecurringReservations.isPending ||
                previewDates.length === 0 ||
                (conflicts.length > 0 && !resolveConflicts) ||
                isCheckingConflicts
              }
            >
              {createRecurringReservations.isPending
                ? conflicts.length > 0 && resolveConflicts
                  ? `Creando ${previewDates.length - conflicts.length} reservas válidas...`
                  : `Creando ${previewDates.length} reservas...`
                : conflicts.length > 0 && resolveConflicts
                  ? `Crear ${previewDates.length - conflicts.length} reservas válidas`
                  : `Crear ${previewDates.length} reservas`}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
