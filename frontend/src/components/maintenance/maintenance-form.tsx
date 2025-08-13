'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useCreateMaintenance,
  useUpdateMaintenance,
} from '@/lib/api/hooks/useMaintenance';
import { useClubs } from '@/lib/api/hooks/useClubs';
import { toast } from '@/lib/toast';
import type { MaintenanceSchedule } from '@/lib/api/hooks/useMaintenance';

const maintenanceSchema = z.object({
  courtId: z.string().min(1, 'Selecciona una cancha'),
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'La fecha de inicio es requerida'),
  endDate: z.string().min(1, 'La fecha de fin es requerida'),
  type: z.enum(['routine', 'repair', 'improvement', 'emergency']),
  assignedTo: z.string().optional(),
  recurrence: z
    .object({
      enabled: z.boolean(),
      frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
      interval: z.number().min(1).optional(),
      endDate: z.string().optional(),
    })
    .optional(),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

interface MaintenanceFormProps {
  isOpen: boolean;
  onClose: () => void;
  maintenance?: MaintenanceSchedule;
  initialDate?: Date;
  courtId?: string;
}

export function MaintenanceForm({
  isOpen,
  onClose,
  maintenance,
  initialDate,
  courtId,
}: MaintenanceFormProps) {
  const [enableRecurrence, setEnableRecurrence] = useState(false);
  const { data: clubs = [] } = useClubs();
  const createMutation = useCreateMaintenance();
  const updateMutation = useUpdateMaintenance(maintenance?.id || '');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      courtId: courtId || maintenance?.courtId || '',
      title: maintenance?.title || '',
      description: maintenance?.description || '',
      startDate:
        maintenance?.startDate ||
        (initialDate ? format(initialDate, 'yyyy-MM-dd') : ''),
      endDate:
        maintenance?.endDate ||
        (initialDate ? format(initialDate, 'yyyy-MM-dd') : ''),
      type: maintenance?.type || 'routine',
      assignedTo: maintenance?.assignedTo || '',
      recurrence: {
        enabled: !!maintenance?.recurrence,
        frequency: maintenance?.recurrence?.frequency,
        interval: maintenance?.recurrence?.interval,
        endDate: maintenance?.recurrence?.endDate,
      },
    },
  });

  const startDate = watch('startDate');

  const onSubmit = async (data: MaintenanceFormData) => {
    try {
      const formData = {
        ...data,
        recurrence:
          enableRecurrence && data.recurrence?.frequency
            ? {
                frequency: data.recurrence.frequency,
                interval: data.recurrence.interval || 1,
                endDate: data.recurrence.endDate,
              }
            : undefined,
      };

      if (maintenance) {
        await updateMutation.mutateAsync(formData);
        toast.success('Mantenimiento actualizado correctamente');
      } else {
        await createMutation.mutateAsync(formData);
        toast.success('Mantenimiento programado correctamente');
      }

      reset();
      onClose();
    } catch (error) {
      toast.error('Error al guardar el mantenimiento');
    }
  };

  // Get all courts from all clubs
  const allCourts = clubs.flatMap((club: string | Club) =>
    (club.courts || []).map((court: any) => ({
      ...court,
      clubName: club.name,
    }))
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {maintenance ? 'Editar Mantenimiento' : 'Programar Mantenimiento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="courtId">Cancha</Label>
            <Select id="courtId" {...register('courtId')} disabled={!!courtId}>
              <option value="">Selecciona una cancha</option>
              {allCourts.map((court: any) => (
                <option key={court.id} value={court.id || ''}>
                  {court.clubName} - {court.name}
                </option>
              ))}
            </Select>
            {errors.courtId && (
              <p className="text-sm text-red-500 mt-1">
                {errors.courtId.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Ej: Mantenimiento de superficie"
            />
            {errors.title && (
              <p className="text-sm text-red-500 mt-1">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Descripción (opcional)</Label>
            <textarea
              id="description"
              {...register('description')}
              className="w-full min-h-[80px] px-3 py-2 border rounded-md"
              placeholder="Describe los trabajos a realizar..."
            />
          </div>

          <div>
            <Label htmlFor="type">Tipo de mantenimiento</Label>
            <Select id="type" {...register('type')}>
              <option value="routine">Rutina</option>
              <option value="repair">Reparación</option>
              <option value="improvement">Mejora</option>
              <option value="emergency">Emergencia</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Fecha de inicio</Label>
              <div className="relative">
                <Input
                  id="startDate"
                  type="date"
                  {...register('startDate')}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              {errors.startDate && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.startDate.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="endDate">Fecha de fin</Label>
              <div className="relative">
                <Input
                  id="endDate"
                  type="date"
                  {...register('endDate')}
                  min={startDate || format(new Date(), 'yyyy-MM-dd')}
                />
                <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              {errors.endDate && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.endDate.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="assignedTo">Asignado a (opcional)</Label>
            <Input
              id="assignedTo"
              {...register('assignedTo')}
              placeholder="Nombre del responsable o empresa"
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="enableRecurrence"
                checked={enableRecurrence}
                onChange={(e) => setEnableRecurrence(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="enableRecurrence" className="cursor-pointer">
                Mantenimiento recurrente
              </Label>
            </div>

            {enableRecurrence && (
              <div className="space-y-4 pl-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="frequency">Frecuencia</Label>
                    <Select {...register('recurrence.frequency')}>
                      <option value="">Selecciona frecuencia</option>
                      <option value="daily">Diario</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensual</option>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="interval">Intervalo</Label>
                    <Input
                      type="number"
                      min="1"
                      {...register('recurrence.interval', {
                        valueAsNumber: true,
                      })}
                      placeholder="1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="recurrenceEndDate">
                    Finaliza el (opcional)
                  </Label>
                  <Input
                    type="date"
                    {...register('recurrence.endDate')}
                    min={startDate || format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Guardando...'
                : maintenance
                  ? 'Actualizar'
                  : 'Programar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
