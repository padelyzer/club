'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Clock,
  Calendar,
  Star,
  Save,
  X,
  Settings,
  TrendingUp,
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
import { CourtPricing } from '@/types/court';
import { toast } from '@/lib/toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const pricingSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  price_per_hour: z.number().min(0, 'El precio debe ser mayor a 0'),
  currency: z.string().default('MXN'),
  valid_from: z.string().min(1, 'Selecciona fecha de inicio'),
  valid_to: z.string().optional(),
  is_default: z.boolean().default(false),
  time_slots: z
    .array(
      z.object({
        start_time: z.string(),
        end_time: z.string(),
        days_of_week: z.array(z.number()).optional(),
      })
    )
    .optional(),
});

type PricingForm = z.infer<typeof pricingSchema>;

interface CourtPricingConfigProps {
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

const PRICING_TEMPLATES = [
  {
    name: 'Estándar',
    description: 'Precio único todo el día',
    slots: [
      {
        start_time: '06:00',
        end_time: '23:00',
        days_of_week: [1, 2, 3, 4, 5, 6, 0],
      },
    ],
  },
  {
    name: 'Hora Pico',
    description: 'Precio especial para horas de mayor demanda',
    slots: [
      { start_time: '18:00', end_time: '22:00', days_of_week: [1, 2, 3, 4, 5] },
      { start_time: '08:00', end_time: '22:00', days_of_week: [6, 0] },
    ],
  },
  {
    name: 'Fin de Semana',
    description: 'Precio especial para sábados y domingos',
    slots: [{ start_time: '06:00', end_time: '23:00', days_of_week: [6, 0] }],
  },
  {
    name: 'Madrugada',
    description: 'Precio especial para horarios nocturnos',
    slots: [
      {
        start_time: '22:00',
        end_time: '06:00',
        days_of_week: [1, 2, 3, 4, 5, 6, 0],
      },
    ],
  },
];

export const CourtPricingConfig = ({ courtId }: CourtPricingConfigProps) => {
  const [showModal, setShowModal] = useState(false);
  const [editingPricing, setEditingPricing] = useState<CourtPricing | null>(
    null
  );
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const queryClient = useQueryClient();

  const {
    data: pricings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['court-pricing', courtId],
    queryFn: () => CourtsService.getPricing(courtId),
  });

  const createPricingMutation = useMutation({
    mutationFn: (data: any) => CourtsService.createPricing(courtId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['court-pricing', courtId] });
      toast.success('Configuración de precios creada');
      setShowModal(false);
      resetForm();
    },
    onError: () => {
      toast.error('Error al crear la configuración');
    },
  });

  const updatePricingMutation = useMutation({
    mutationFn: ({ pricingId, data }: { pricingId: number; data: any }) =>
      CourtsService.updatePricing(courtId, pricingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['court-pricing', courtId] });
      toast.success('Configuración de precios actualizada');
      setShowModal(false);
      resetForm();
    },
    onError: () => {
      toast.error('Error al actualizar la configuración');
    },
  });

  const deletePricingMutation = useMutation({
    mutationFn: (pricingId: number) =>
      CourtsService.deletePricing(courtId, pricingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['court-pricing', courtId] });
      toast.success('Configuración eliminada');
    },
    onError: () => {
      toast.error('Error al eliminar la configuración');
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<PricingForm>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      currency: 'MXN',
      is_default: false,
      valid_from: new Date().toISOString().split('T')[0],
    },
  });

  const watchIsDefault = watch('is_default');

  const resetForm = () => {
    reset();
    setEditingPricing(null);
    setTimeSlots([]);
    setSelectedTemplate('');
  };

  const openEditModal = (pricing: CourtPricing) => {
    setEditingPricing(pricing);
    setValue('name', pricing.name);
    setValue('price_per_hour', pricing.price_per_hour);
    setValue('currency', pricing.currency);
    setValue('valid_from', pricing.valid_from);
    setValue('valid_to', pricing.valid_to || '');
    setValue('is_default', pricing.is_default);
    setTimeSlots(pricing.time_slots || []);
    setShowModal(true);
  };

  const onSubmit = (data: PricingForm) => {
    const formData = {
      ...data,
      time_slots: timeSlots,
    };

    if (editingPricing) {
      updatePricingMutation.mutate({
        pricingId: editingPricing.id,
        data: formData,
      });
    } else {
      createPricingMutation.mutate(formData);
    }
  };

  const handleDelete = (pricingId: number) => {
    if (
      window.confirm(
        '¿Estás seguro de que quieres eliminar esta configuración?'
      )
    ) {
      deletePricingMutation.mutate(pricingId);
    }
  };

  const addTimeSlot = () => {
    setTimeSlots([
      ...timeSlots,
      {
        start_time: '09:00',
        end_time: '18:00',
        days_of_week: [1, 2, 3, 4, 5],
      },
    ]);
  };

  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index: number, field: string, value: any) => {
    const updated = [...timeSlots];
    updated[index] = { ...updated[index], [field]: value };
    setTimeSlots(updated);
  };

  const applyTemplate = (template: any) => {
    setTimeSlots(template.slots);
    setSelectedTemplate(template.name);
  };

  const toggleDay = (slotIndex: number, day: number) => {
    const slot = timeSlots[slotIndex];
    const currentDays = slot.days_of_week || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d: any) => d !== day)
      : [...currentDays, day];

    updateTimeSlot(slotIndex, 'days_of_week', newDays);
  };

  if (isLoading)
    return <LoadingState message="Cargando configuración de precios..." fullScreen={false} />;
  if (error) return <ErrorState message="Error al cargar los precios" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Configuración de Precios
          </h2>
          <p className="text-gray-600 mt-1">
            Gestiona los precios por hora según horarios y días
          </p>
        </div>

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Configuración
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {editingPricing ? 'Editar' : 'Nueva'} Configuración de Precios
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nombre de la configuración *
                  </label>
                  <Input {...register('name')} placeholder="Ej: Hora Pico" />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Precio por hora *
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-md">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      {...register('price_per_hour', { valueAsNumber: true })}
                      className="rounded-l-none"
                      placeholder="0.00"
                    />
                  </div>
                  {errors.price_per_hour && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.price_per_hour.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Válido desde *
                  </label>
                  <Input type="date" {...register('valid_from')} />
                  {errors.valid_from && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.valid_from.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Válido hasta (opcional)
                  </label>
                  <Input type="date" {...register('valid_to')} />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox {...register('is_default')} id="is_default" />
                <label htmlFor="is_default" className="text-sm font-medium">
                  Configuración por defecto
                </label>
                {watchIsDefault && (
                  <Badge className="bg-blue-100 text-blue-800">
                    <Star className="w-3 h-3 mr-1" />
                    Predeterminado
                  </Badge>
                )}
              </div>

              {/* Templates */}
              <Card className="p-4">
                <h3 className="font-medium mb-3">Plantillas de horarios</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {PRICING_TEMPLATES.map((template) => (
                    <Button
                      key={template.name}
                      type="button"
                      variant={
                        selectedTemplate === template.name
                          ? 'default'
                          : 'outline'
                      }
                      size="sm"
                      onClick={() => applyTemplate(template)}
                      className="justify-start h-auto p-3"
                    >
                      <div className="text-left">
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-gray-600">
                          {template.description}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </Card>

              {/* Time Slots */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Horarios de aplicación</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTimeSlot}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Horario
                  </Button>
                </div>

                <div className="space-y-4">
                  {timeSlots.map((slot, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Horario {index + 1}</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeTimeSlot(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Hora inicio
                          </label>
                          <Select
                            value={slot.start_time || ''}
                            onValueChange={(value) =>
                              updateTimeSlot(index, 'start_time', value)
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
                          <label className="block text-sm font-medium mb-1">
                            Hora fin
                          </label>
                          <Select
                            value={slot.end_time || ''}
                            onValueChange={(value) =>
                              updateTimeSlot(index, 'end_time', value)
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
                                slot.days_of_week?.includes(day.value)
                                  ? 'default'
                                  : 'outline'
                              }
                              size="sm"
                              onClick={() => toggleDay(index, day.value)}
                            >
                              {day.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {timeSlots.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p>No hay horarios configurados</p>
                      <p className="text-sm">
                        Agrega un horario o usa una plantilla
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createPricingMutation.isPending ||
                    updatePricingMutation.isPending
                  }
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingPricing ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pricing Configurations */}
      {pricings && pricings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pricings.map((pricing: any, index: any) => (
            <motion.div
              key={pricing.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold">{pricing.name}</h3>
                      {pricing.is_default && (
                        <Badge className="bg-blue-100 text-blue-800">
                          <Star className="w-3 h-3 mr-1" />
                          Predeterminado
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-2xl font-bold text-green-600">
                      <DollarSign className="w-5 h-5" />
                      {pricing.price_per_hour}
                      <span className="text-sm text-gray-500 font-normal">
                        / hora
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(pricing)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {!pricing.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(pricing.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Desde{' '}
                      {format(new Date(pricing.valid_from), 'd MMM yyyy', {
                        locale: es,
                      })}
                      {pricing.valid_to &&
                        ` hasta ${format(new Date(pricing.valid_to), 'd MMM yyyy', { locale: es })}`}
                    </span>
                  </div>

                  {pricing.time_slots && pricing.time_slots.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">
                        Horarios de aplicación:
                      </p>
                      <div className="space-y-2">
                        {pricing.time_slots.map((slot: any, idx: any) => (
                          <div
                            key={idx}
                            className="text-xs bg-gray-50 p-2 rounded"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="w-3 h-3" />
                              <span>
                                {slot.start_time} - {slot.end_time}
                              </span>
                            </div>
                            {slot.days_of_week &&
                              slot.days_of_week.length > 0 && (
                                <div className="flex gap-1">
                                  {slot.days_of_week.map((day: any) => {
                                    const dayInfo = DAYS_OF_WEEK.find(
                                      (d) => d.value === day
                                    );
                                    return (
                                      <Badge
                                        key={day}
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {dayInfo?.label}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-200">
                    <Badge
                      variant="outline"
                      className={
                        pricing.is_active
                          ? 'text-green-600 border-green-200'
                          : 'text-gray-600 border-gray-200'
                      }
                    >
                      {pricing.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            Sin configuraciones de precios
          </h3>
          <p className="text-gray-500 mb-4">
            Crea tu primera configuración de precios para la cancha
          </p>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Primera Configuración
          </Button>
        </Card>
      )}
    </div>
  );
};
