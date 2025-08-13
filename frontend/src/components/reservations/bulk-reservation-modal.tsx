'use client';

import React, { useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Calendar,
  Clock,
  User,
  MapPin,
  CheckCircle,
  AlertCircle,
  Download,
  Upload,
} from 'lucide-react';
import { format, addDays, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { Modal } from '@/components/layout/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUIStore } from '@/store/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ReservationsService } from '@/lib/api/services/reservations.service';
import { CourtsService } from '@/lib/api/services/courts.service';
import { ClientsService } from '@/lib/api/services/clients.service';
import { CreateReservationRequest } from '@/lib/api/types';
import { ClientSearch } from './client-search';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const bulkReservationSchema = z.object({
  reservations: z
    .array(
      z.object({
        client_id: z.string().min(1, 'Cliente requerido'),
        court_id: z.string().min(1, 'Pista requerida'),
        date: z.string().min(1, 'Fecha requerida'),
        start_time: z.string().min(1, 'Hora inicio requerida'),
        end_time: z.string().min(1, 'Hora fin requerida'),
        notes: z.string().optional(),
      })
    )
    .min(1, 'Al menos una reserva es requerida'),
  template_settings: z
    .object({
      same_client: z.boolean().default(false),
      same_court: z.boolean().default(false),
      same_time: z.boolean().default(false),
      recurring_pattern: z.enum(['none', 'daily', 'weekly']).default('none'),
      end_date: z.string().optional(),
    })
    .optional(),
});

type BulkReservationForm = z.infer<typeof bulkReservationSchema>;

interface ReservationStatus {
  index: number;
  status: 'pending' | 'success' | 'error';
  message?: string;
  reservation_id?: string;
}

export const BulkReservationModal = () => {
  const { activeModal, closeModal } = useUIStore();
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ReservationStatus[]>([]);
  const [step, setStep] = useState<'setup' | 'review' | 'results'>('setup');
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BulkReservationForm>({
    resolver: zodResolver(bulkReservationSchema),
    defaultValues: {
      reservations: [
        {
          client_id: '',
          court_id: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          start_time: '09:00',
          end_time: '10:30',
          notes: '',
        },
      ],
      template_settings: {
        same_client: false,
        same_court: false,
        same_time: false,
        recurring_pattern: 'none',
      },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'reservations',
  });

  const watchedReservations = watch('reservations');
  const templateSettings = watch('template_settings');

  // Fetch courts and clients for selectors
  const { data: courtsData } = useQuery({
    queryKey: ['courts', 'list'],
    queryFn: () => CourtsService.list({ is_active: true }),
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 'list'],
    queryFn: () => ClientsService.list({ is_active: true }),
  });

  // Extract results from paginated response
  const courts = courtsData?.results || [];
  const clients = clientsData?.results || [];

  const bulkCreateMutation = useMutation({
    mutationFn: async (reservations: CreateReservationRequest[]) => {
      setProcessing(true);
      setResults(
        reservations.map((_, index) => ({ index, status: 'pending' }))
      );

      // Process reservations in batches to avoid overwhelming the server
      const BATCH_SIZE = 5;
      const allResults: ReservationStatus[] = [];

      for (let i = 0; i < reservations.length; i += BATCH_SIZE) {
        const batch = reservations.slice(i, i + BATCH_SIZE);

        try {
          const batchResults = await ReservationsService.bulkCreate(batch);

          // Update results for successful reservations
          batch.forEach((_, batchIndex) => {
            const globalIndex = i + batchIndex;
            allResults[globalIndex] = {
              index: globalIndex,
              status: 'success',
              message: 'Reserva creada exitosamente',
              reservation_id: batchResults[batchIndex]?.id,
            };
          });
        } catch (error: any) {
          // Handle batch errors
          batch.forEach((_, batchIndex) => {
            const globalIndex = i + batchIndex;
            allResults[globalIndex] = {
              index: globalIndex,
              status: 'error',
              message:
                error?.response?.data?.message || 'Error al crear la reserva',
            };
          });
        }

        // Update UI with current progress
        setResults([...allResults]);

        // Small delay between batches
        if (i + BATCH_SIZE < reservations.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      return allResults;
    },
    onSuccess: (results) => {
      const successCount = results.filter((r) => r.status === 'success').length;
      const errorCount = results.filter((r) => r.status === 'error').length;

      if (errorCount === 0) {
        toast.success(`${successCount} reservas creadas exitosamente`);
      } else if (successCount === 0) {
        toast.error(`Error al crear todas las reservas`);
      } else {
        toast.warning(
          `${successCount} reservas creadas, ${errorCount} fallaron`
        );
      }

      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setStep('results');
    },
    onError: () => {
      toast.error('Error al procesar las reservas');
    },
    onSettled: () => {
      setProcessing(false);
    },
  });

  const addReservation = useCallback(() => {
    const lastReservation = watchedReservations[watchedReservations.length - 1];
    const newReservation = {
      client_id: templateSettings?.same_client
        ? lastReservation?.client_id || ''
        : '',
      court_id: templateSettings?.same_court
        ? lastReservation?.court_id || ''
        : '',
      date: format(
        addDays(new Date(lastReservation?.date || new Date()), 1),
        'yyyy-MM-dd'
      ),
      start_time: templateSettings?.same_time
        ? lastReservation?.start_time || '09:00'
        : '09:00',
      end_time: templateSettings?.same_time
        ? lastReservation?.end_time || '10:30'
        : '10:30',
      notes: '',
    };
    append(newReservation);
  }, [append, watchedReservations, templateSettings]);

  const generateRecurringReservations = useCallback(() => {
    if (
      !templateSettings?.recurring_pattern ||
      templateSettings.recurring_pattern === 'none'
    )
      return;

    const baseReservation = watchedReservations[0];
    if (!baseReservation || !templateSettings.end_date) return;

    const newReservations = [];
    const startDate = new Date(baseReservation.date);
    const endDate = new Date(templateSettings.end_date);
    const increment = templateSettings.recurring_pattern === 'daily' ? 1 : 7;

    let currentDate = addDays(startDate, increment);

    while (
      isBefore(currentDate, endDate) ||
      currentDate.getTime() === endDate.getTime()
    ) {
      newReservations.push({
        ...baseReservation,
        date: format(currentDate, 'yyyy-MM-dd'),
      });
      currentDate = addDays(currentDate, increment);
    }

    // Replace all reservations except the first one
    setValue('reservations', [baseReservation, ...newReservations]);
  }, [watchedReservations, templateSettings, setValue]);

  const onSubmit = (data: BulkReservationForm) => {
    if (step === 'setup') {
      setStep('review');
    } else if (step === 'review') {
      bulkCreateMutation.mutate(data.reservations);
    }
  };

  const handleClose = () => {
    if (!processing) {
      closeModal();
      reset();
      setStep('setup');
      setResults([]);
    }
  };

  const exportResults = () => {
    const successfulReservations = results
      .filter((r) => r.status === 'success')
      .map((r) => watchedReservations[r.index]);

    const csvContent = [
      [
        'Cliente',
        'Pista',
        'Fecha',
        'Hora Inicio',
        'Hora Fin',
        'Estado',
        'ID Reserva',
      ].join(','),
      ...results.map((result) => {
        const reservation = watchedReservations[result.index];
        const client = clients.find((c) => c.id === reservation.client_id);
        const court = courts.find((c: any) => c.id === reservation.court_id);

        return [
          `"${client?.first_name} ${client?.last_name}"`,
          `"${court?.name}"`,
          reservation.date,
          reservation.start_time,
          reservation.end_time,
          result.status === 'success' ? 'Exitosa' : 'Error',
          result.reservation_id || result.message || '',
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `reservas_masivas_${format(new Date(), 'yyyy-MM-dd')}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isOpen = activeModal === 'bulk-reservation';
  const successCount = results.filter((r) => r.status === 'success').length;
  const errorCount = results.filter((r) => r.status === 'error').length;
  const progressPercentage =
    results.length > 0
      ? ((successCount + errorCount) / results.length) * 100
      : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Creación Masiva de Reservas"
      size="6xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <AnimatePresence mode="wait">
          {step === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Template Settings */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold">Configuración de Plantilla</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="same_client"
                      checked={templateSettings?.same_client}
                      onChange={(e) =>
                        setValue(
                          'template_settings.same_client',
                          e.target.checked
                        )
                      }
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="same_client" className="text-sm">
                      Mismo cliente
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="same_court"
                      checked={templateSettings?.same_court}
                      onChange={(e) =>
                        setValue(
                          'template_settings.same_court',
                          e.target.checked
                        )
                      }
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="same_court" className="text-sm">
                      Misma pista
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="same_time"
                      checked={templateSettings?.same_time}
                      onChange={(e) =>
                        setValue(
                          'template_settings.same_time',
                          e.target.checked
                        )
                      }
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="same_time" className="text-sm">
                      Mismo horario
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Patrón recurrente</Label>
                    <Select
                      value={templateSettings?.recurring_pattern || ''}
                      onValueChange={(value: 'none' | 'daily' | 'weekly') =>
                        setValue('template_settings.recurring_pattern', value)
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin patrón</SelectItem>
                        <SelectItem value="daily">Diario</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {templateSettings?.recurring_pattern !== 'none' && (
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex-1">
                      <Label className="text-sm">Fecha fin del patrón</Label>
                      <Input
                        type="date"
                        value={templateSettings?.end_date || ''}
                        onChange={(e) =>
                          setValue('template_settings.end_date', e.target.value)
                        }
                        className="mt-1"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={generateRecurringReservations}
                      variant="outline"
                      size="sm"
                      className="mt-6"
                    >
                      Generar Patrón
                    </Button>
                  </div>
                )}
              </Card>

              {/* Reservations List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Reservas ({fields.length})</h3>
                  <Button
                    type="button"
                    onClick={addReservation}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Reserva
                  </Button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {fields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Client Selection */}
                          <div className="space-y-2">
                            <Label className="text-sm">Cliente</Label>
                            <Select
                              value={
                                watchedReservations[index]?.client_id || ''
                              }
                              onValueChange={(value) =>
                                setValue(
                                  `reservations.${index}.client_id`,
                                  value
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar cliente" />
                              </SelectTrigger>
                              <SelectContent>
                                {clients.map((client) => (
                                  <SelectItem key={client.id} value={client.id || ''}>
                                    {client.first_name} {client.last_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Court Selection */}
                          <div className="space-y-2">
                            <Label className="text-sm">Pista</Label>
                            <Select
                              value={watchedReservations[index]?.court_id || ''}
                              onValueChange={(value) =>
                                setValue(
                                  `reservations.${index}.court_id`,
                                  value
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar pista" />
                              </SelectTrigger>
                              <SelectContent>
                                {courts.map((court: any) => (
                                  <SelectItem key={court.id} value={court.id || ''}>
                                    {court.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Date */}
                          <div className="space-y-2">
                            <Label className="text-sm">Fecha</Label>
                            <Input
                              type="date"
                              value={watchedReservations[index]?.date || ''}
                              onChange={(e) =>
                                setValue(
                                  `reservations.${index}.date`,
                                  e.target.value
                                )
                              }
                            />
                          </div>

                          {/* Time Selection */}
                          <div className="space-y-2">
                            <Label className="text-sm">Hora inicio</Label>
                            <Input
                              type="time"
                              value={
                                watchedReservations[index]?.start_time || ''
                              }
                              onChange={(e) =>
                                setValue(
                                  `reservations.${index}.start_time`,
                                  e.target.value
                                )
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Hora fin</Label>
                            <Input
                              type="time"
                              value={watchedReservations[index]?.end_time || ''}
                              onChange={(e) =>
                                setValue(
                                  `reservations.${index}.end_time`,
                                  e.target.value
                                )
                              }
                            />
                          </div>

                          {/* Notes */}
                          <div className="space-y-2">
                            <Label className="text-sm">Notas</Label>
                            <Input
                              value={watchedReservations[index]?.notes || ''}
                              onChange={(e) =>
                                setValue(
                                  `reservations.${index}.notes`,
                                  e.target.value
                                )
                              }
                              placeholder="Notas opcionales"
                            />
                          </div>
                        </div>

                        {fields.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => remove(index)}
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Revisar Reservas</h3>
                <p className="text-gray-600">
                  Se crearán {watchedReservations.length} reservas. Revisa los
                  detalles antes de continuar.
                </p>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {watchedReservations.map((reservation, index) => {
                  const client = clients.find(
                    (c) => c.id === reservation.client_id
                  );
                  const court = courts.find(
                    (c: any) => c.id === reservation.court_id
                  );

                  return (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">
                            {client
                              ? `${client.first_name} ${client.last_name}`
                              : 'Cliente no encontrado'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span>{court?.name || 'Pista no encontrada'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span>
                            {format(new Date(reservation.date), 'dd/MM/yyyy', {
                              locale: es,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span>
                            {reservation.start_time} - {reservation.end_time}
                          </span>
                        </div>
                      </div>
                      {reservation.notes && (
                        <p className="mt-2 text-xs text-gray-600 italic">
                          Nota: {reservation.notes}
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">
                  Resultados de Creación
                </h3>
                <div className="flex justify-center items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">
                      {successCount} exitosas
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-red-600">{errorCount} errores</span>
                  </div>
                </div>
              </div>

              {processing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Procesando reservas...</span>
                    <span>{Math.round(progressPercentage)}%</span>
                  </div>
                  <Progress value={progressPercentage || ''} className="w-full" />
                </div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((result, index) => {
                  const reservation = watchedReservations[result.index];
                  const client = clients.find(
                    (c) => c.id === reservation.client_id
                  );
                  const court = courts.find(
                    (c: any) => c.id === reservation.court_id
                  );

                  return (
                    <Card
                      key={index}
                      className={cn(
                        'p-3 border-l-4',
                        result.status === 'success' &&
                          'border-l-green-500 bg-green-50 dark:bg-green-900/10',
                        result.status === 'error' &&
                          'border-l-red-500 bg-red-50 dark:bg-red-900/10',
                        result.status === 'pending' &&
                          'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {result.status === 'success' && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                          {result.status === 'error' && (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          )}
                          {result.status === 'pending' && (
                            <Clock className="w-4 h-4 text-yellow-600" />
                          )}

                          <div className="text-sm">
                            <div className="font-medium">
                              {client
                                ? `${client.first_name} ${client.last_name}`
                                : 'Cliente desconocido'}{' '}
                              - {court?.name}
                            </div>
                            <div className="text-gray-600">
                              {format(
                                new Date(reservation.date),
                                'dd/MM/yyyy',
                                { locale: es }
                              )}{' '}
                              • {reservation.start_time} -{' '}
                              {reservation.end_time}
                            </div>
                          </div>
                        </div>

                        <div className="text-right text-sm">
                          <Badge
                            variant={
                              result.status === 'success'
                                ? 'default'
                                : result.status === 'error'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {result.status === 'success' && 'Creada'}
                            {result.status === 'error' && 'Error'}
                            {result.status === 'pending' && 'Procesando...'}
                          </Badge>
                          {result.message && (
                            <p className="text-xs text-gray-600 mt-1">
                              {result.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {results.length > 0 && !processing && (
                <div className="flex justify-center">
                  <Button
                    type="button"
                    onClick={exportResults}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Exportar Resultados
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            {step !== 'setup' && (
              <Button
                type="button"
                onClick={() => setStep(step === 'results' ? 'review' : 'setup')}
                variant="ghost"
                disabled={processing}
              >
                Anterior
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleClose}
              variant="ghost"
              disabled={processing}
            >
              {step === 'results' ? 'Cerrar' : 'Cancelar'}
            </Button>

            {step !== 'results' && (
              <Button
                type="submit"
                disabled={
                  processing || (step === 'setup' && fields.length === 0)
                }
                className="flex items-center gap-2"
              >
                {step === 'setup' && 'Revisar Reservas'}
                {step === 'review' &&
                  (processing ? 'Creando...' : 'Crear Reservas')}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};
