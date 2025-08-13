'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import {
  Save,
  X,
  Settings,
  Home,
  DollarSign,
  Zap,
  Flame,
  Shield,
  Info,
  AlertCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useCreateCourt, useUpdateCourt } from '@/lib/api/hooks/useCourts';
import { Court } from '@/types/court';
import { courtFormSchema, type CourtFormData, sanitizeInput } from '@/lib/validators/court';
import { toast } from '@/lib/toast';

interface AppleCourtFormProps {
  court?: Court;
  clubId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const SURFACE_OPTIONS = [
  { value: 'glass', label: 'Cristal', icon: '🏐', description: 'Superficie de cristal templado' },
  { value: 'wall', label: 'Pared', icon: '🧱', description: 'Paredes de hormigón' },
  { value: 'mesh', label: 'Malla', icon: '🔲', description: 'Malla metálica' },
  { value: 'mixed', label: 'Mixta', icon: '🔄', description: 'Combinación de superficies' },
];

export function AppleCourtForm({
  court,
  clubId,
  onSuccess,
  onCancel,
}: AppleCourtFormProps) {
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
  const watchedFeatures = {
    lighting: watch('has_lighting'),
    heating: watch('has_heating'),
    roof: watch('has_roof'),
  };

  const onSubmit = async (data: CourtFormData) => {
    const sanitizedData = {
      ...data,
      name: sanitizeInput(data.name),
      maintenance_notes: data.maintenance_notes ? sanitizeInput(data.maintenance_notes) : '',
    };

    try {
      if (court) {
        await updateCourtMutation.mutateAsync({ ...sanitizedData, id: court.id });
        toast.success('Cancha actualizada correctamente');
      } else {
        await createCourtMutation.mutateAsync(sanitizedData);
        toast.success('Cancha creada correctamente');
      }
      onSuccess();
    } catch (error) {
      toast.error('Error al guardar la cancha');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 border border-gray-100"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Home className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Información Básica</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-2">
              Nombre de la Cancha
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Ej: Cancha Central"
              className="rounded-xl border-gray-200 focus:border-blue-500 transition-colors"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="number" className="text-sm font-medium text-gray-700 mb-2">
              Número de Cancha
            </Label>
            <Input
              id="number"
              type="number"
              {...register('number', { valueAsNumber: true })}
              placeholder="1"
              className="rounded-xl border-gray-200 focus:border-blue-500 transition-colors"
            />
            {errors.number && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.number.message}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <Label htmlFor="surface_type" className="text-sm font-medium text-gray-700 mb-2">
            Tipo de Superficie
          </Label>
          <Select
            value={watch('surface_type')}
            onValueChange={(value) => setValue('surface_type', value as any)}
          >
            <SelectTrigger className="rounded-xl border-gray-200">
              <SelectValue placeholder="Selecciona el tipo de superficie" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {SURFACE_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{option.icon}</span>
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-xs text-gray-500">{option.description}</p>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Features Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-6 border border-gray-100"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Zap className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Características</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Zap className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Iluminación</p>
                <p className="text-xs text-gray-500">Permite jugar en horario nocturno</p>
              </div>
            </div>
            <Switch
              checked={watchedFeatures.lighting}
              onCheckedChange={(checked) => setValue('has_lighting', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <Flame className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Calefacción</p>
                <p className="text-xs text-gray-500">Confort en temporada de invierno</p>
              </div>
            </div>
            <Switch
              checked={watchedFeatures.heating}
              onCheckedChange={(checked) => setValue('has_heating', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Home className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Techo</p>
                <p className="text-xs text-gray-500">Protección contra lluvia y sol</p>
              </div>
            </div>
            <Switch
              checked={watchedFeatures.roof}
              onCheckedChange={(checked) => setValue('has_roof', checked)}
            />
          </div>
        </div>
      </motion.div>

      {/* Pricing Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl p-6 border border-gray-100"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Precio</h3>
        </div>

        <div>
          <Label htmlFor="price_per_hour" className="text-sm font-medium text-gray-700 mb-2">
            Precio por Hora
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              $
            </span>
            <Input
              id="price_per_hour"
              type="number"
              step="0.01"
              {...register('price_per_hour')}
              placeholder="40.00"
              className="pl-8 rounded-xl border-gray-200 focus:border-blue-500 transition-colors"
            />
          </div>
          {errors.price_per_hour && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.price_per_hour.message}
            </p>
          )}
        </div>
      </motion.div>

      {/* Status Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl p-6 border border-gray-100"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <Settings className="w-5 h-5 text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Estado</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <Shield className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Cancha Activa</p>
                <p className="text-xs text-gray-500">Disponible para reservas</p>
              </div>
            </div>
            <Switch
              checked={watch('is_active')}
              onCheckedChange={(checked) => setValue('is_active', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <Settings className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">En Mantenimiento</p>
                <p className="text-xs text-gray-500">Temporalmente no disponible</p>
              </div>
            </div>
            <Switch
              checked={watchedMaintenance}
              onCheckedChange={(checked) => setValue('is_maintenance', checked)}
            />
          </div>

          {watchedMaintenance && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Label htmlFor="maintenance_notes" className="text-sm font-medium text-gray-700 mb-2">
                Notas de Mantenimiento
              </Label>
              <Textarea
                id="maintenance_notes"
                {...register('maintenance_notes')}
                placeholder="Describe el trabajo de mantenimiento..."
                className="rounded-xl border-gray-200 focus:border-blue-500 transition-colors min-h-[100px]"
              />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="rounded-xl px-6"
          disabled={isSubmitting}
        >
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6"
          disabled={isSubmitting}
        >
          <Save className="w-4 h-4 mr-2" />
          {court ? 'Actualizar' : 'Crear'} Cancha
        </Button>
      </div>
    </form>
  );
}