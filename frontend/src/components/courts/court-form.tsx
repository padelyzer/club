'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Save,
  X,
  Settings,
  Image as ImageIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

import { useCreateCourt, useUpdateCourt } from '@/lib/api/hooks/useCourts';
import { Court } from '@/types/court';
import { courtFormSchema, type CourtFormData, sanitizeInput } from '@/lib/validators/court';
import { toast } from '@/lib/toast';
import { CourtImageUpload } from '@/components/clubs/club-image-upload';

interface CourtFormProps {
  court?: Court;
  clubId?: string; // UUID
  onSuccess: () => void;
  onCancel: () => void;
}

const SURFACE_OPTIONS = [
  { value: 'glass', label: 'Cristal' },
  { value: 'wall', label: 'Pared' },
  { value: 'mesh', label: 'Malla' },
  { value: 'mixed', label: 'Mixta' },
];

const FACILITY_OPTIONS = [
  'Vestuarios',
  'Duchas',
  'Tienda',
  'Cafetería',
  'Estacionamiento',
  'Wifi',
  'Música',
  'Lockers',
  'Toallas',
  'Raquetas de préstamo',
];

export const CourtForm = ({
  court,
  clubId,
  onSuccess,
  onCancel,
}: CourtFormProps) => {
  const createCourtMutation = useCreateCourt();
  const updateCourtMutation = useUpdateCourt();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CourtFormData>({
    resolver: zodResolver(courtFormSchema),
    defaultValues: {
      club: clubId || court?.club || '',
      name: court?.name || '',
      number: court?.number || 1,
      surface_type: court?.surface_type || 'glass',
      has_lighting: court?.has_lighting ?? true,
      has_heating: court?.has_heating ?? false,
      has_roof: court?.has_roof ?? false,
      is_maintenance: court?.is_maintenance ?? false,
      maintenance_notes: court?.maintenance_notes || '',
      price_per_hour: court?.price_per_hour || '40.00',
      is_active: court?.is_active ?? true,
    },
  });

  const watchedMaintenance = watch('is_maintenance');

  // Handle success/error through the hooks
  if (createCourtMutation.isSuccess || updateCourtMutation.isSuccess) {
    onSuccess();
  }

  const onSubmit = (data: CourtFormData) => {
    // Sanitize text inputs
    const sanitizedData = {
      ...data,
      name: sanitizeInput(data.name),
      maintenance_notes: data.maintenance_notes ? sanitizeInput(data.maintenance_notes) : '',
    };

    if (court) {
      updateCourtMutation.mutate({ id: court.id, data: sanitizedData });
    } else {
      createCourtMutation.mutate(sanitizedData);
    }
  };

  // Simplified form without complex equipment/facilities management

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-6">

        {/* Basic Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Información de la Cancha</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Nombre de la Cancha *
              </label>
              <Input {...register('name')} placeholder="Ej: Cancha Central" />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Número *</label>
              <Input
                type="number"
                {...register('number', { valueAsNumber: true })}
                min="1"
              />
              {errors.number && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.number.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Tipo de Superficie *
              </label>
              <Select
                onValueChange={(value) =>
                  setValue('surface_type', value as any)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar superficie" />
                </SelectTrigger>
                <SelectContent>
                  {SURFACE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value || ''}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Precio por Hora
              </label>
              <Input
                {...register('price_per_hour')}
                placeholder="40.00"
                type="number"
                step="0.01"
              />
            </div>
          </div>
        </Card>

        {/* Features */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Características
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox id="lighting" {...register('has_lighting')} />
              <label htmlFor="lighting" className="text-sm font-medium">
                Iluminación
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="heating" {...register('has_heating')} />
              <label htmlFor="heating" className="text-sm font-medium">
                Calefacción
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="roof" {...register('has_roof')} />
              <label htmlFor="roof" className="text-sm font-medium">
                Techo
              </label>
            </div>
          </div>
        </Card>

        {/* Maintenance */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Mantenimiento</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="maintenance" 
                checked={watchedMaintenance}
                onCheckedChange={(checked) => setValue('is_maintenance', !!checked)}
              />
              <label htmlFor="maintenance" className="text-sm font-medium">
                Cancha en mantenimiento
              </label>
            </div>

            {watchedMaintenance && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Notas de mantenimiento
                </label>
                <textarea
                  {...register('maintenance_notes')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Describe el tipo de mantenimiento requerido..."
                />
              </div>
            )}
          </div>
        </Card>

        {/* Court Images */}
        {court?.id && clubId && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Imágenes de la cancha
            </h3>
            <CourtImageUpload
              clubId={parseInt(clubId)}
              courtId={court.id}
              currentImages={court.images || []}
              onImagesUploaded={(imageUrls) => {
                // Update the court images
                // For now, we'll just show a success message
                toast.success('Imágenes actualizadas correctamente');
              }}
              maxImages={5}
            />
          </Card>
        )}

        {!court?.id && (
          <Card className="p-6">
            <div className="text-center py-8 text-gray-500">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h4 className="text-lg font-medium mb-2">Imágenes de la cancha</h4>
              <p className="text-sm">
                Guarda la cancha primero para poder subir imágenes
              </p>
            </div>
          </Card>
        )}

      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            createCourtMutation.isPending ||
            updateCourtMutation.isPending
          }
        >
          <Save className="w-4 h-4 mr-2" />
          {court ? 'Actualizar' : 'Crear'} Cancha
        </Button>
      </div>
    </form>
  );
};
