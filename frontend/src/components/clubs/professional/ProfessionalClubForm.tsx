'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  X,
  Building2,
  MapPin,
  Phone,
  Mail,
  Clock,
  Wifi,
  Car,
  Coffee,
  Trophy,
  Users,
  Calendar,
  CheckCircle,
  AlertCircle,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { Card } from '@/components/ui/professional/Card';
import { Button } from '@/components/ui/professional/Button';
import { Input } from '@/components/ui/professional/Input';
import { Club } from '@/types/club';
import { useCreateClub, useUpdateClub } from '@/lib/api/hooks/useClubs';
import { cn } from '@/lib/utils';

// Schema de validación
const clubFormSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  address: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  logo_url: z.string().optional(),
  cover_image_url: z.string().optional(),
  features: z.array(z.string()).optional(),
  services: z.array(z.string()).optional(),
});

type ClubFormData = z.infer<typeof clubFormSchema>;

interface ProfessionalClubFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  club?: Club;
  mode?: 'create' | 'edit';
}

// Features disponibles con iconos
const AVAILABLE_FEATURES = [
  { id: 'wifi', label: 'WiFi Gratis', icon: Wifi },
  { id: 'parking', label: 'Estacionamiento', icon: Car },
  { id: 'cafeteria', label: 'Cafetería', icon: Coffee },
  { id: 'tournaments', label: 'Torneos', icon: Trophy },
  { id: 'pro_shop', label: 'Tienda Pro', icon: Building2 },
  { id: 'lessons', label: 'Clases', icon: Users },
];

export const ProfessionalClubForm: React.FC<ProfessionalClubFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  club,
  mode = club ? 'edit' : 'create'
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(club?.features || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createClubMutation = useCreateClub();
  const updateClubMutation = useUpdateClub();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
    setValue
  } = useForm<ClubFormData>({
    resolver: zodResolver(clubFormSchema),
    defaultValues: {
      name: club?.name || '',
      description: club?.description || '',
      address: club?.address || '',
      phone: club?.phone || '',
      email: club?.email || '',
      website: club?.website || '',
      logo_url: club?.logo_url || '',
      cover_image_url: club?.cover_image_url || '',
      features: club?.features || [],
      services: club?.services || [],
    },
    mode: 'onChange'
  });

  // Reset form when club changes
  useEffect(() => {
    if (club) {
      reset({
        name: club.name || '',
        description: club.description || '',
        address: club.address || '',
        phone: club.phone || '',
        email: club.email || '',
        website: club.website || '',
        logo_url: club.logo_url || '',
        cover_image_url: club.cover_image_url || '',
        features: club.features || [],
        services: club.services || [],
      });
      setSelectedFeatures(club.features || []);
    }
  }, [club, reset]);

  const steps = [
    {
      title: 'Información Básica',
      description: 'Datos principales del club',
      icon: Building2
    },
    {
      title: 'Contacto y Ubicación',
      description: 'Información de contacto',
      icon: MapPin
    },
    {
      title: 'Características',
      description: 'Features y servicios',
      icon: Trophy
    },
    {
      title: 'Revisión',
      description: 'Confirmar información',
      icon: CheckCircle
    }
  ];

  const onSubmit = async (data: ClubFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const clubData = {
        ...data,
        features: selectedFeatures,
      };

      if (mode === 'edit' && club?.id) {
        await updateClubMutation.mutateAsync({ id: club.id, data: clubData });
      } else {
        await createClubMutation.mutateAsync(clubData);
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      setSubmitError(error?.response?.data?.detail || 'Error al guardar el club');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFeature = (featureId: string) => {
    const newFeatures = selectedFeatures.includes(featureId)
      ? selectedFeatures.filter(f => f !== featureId)
      : [...selectedFeatures, featureId];
    
    setSelectedFeatures(newFeatures);
    setValue('features', newFeatures);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0:
        return watch('name') && watch('name').length >= 2;
      case 1:
        return watch('address') && watch('address').length >= 5;
      case 2:
        return true;
      default:
        return isValid;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        <Card variant="glass" padding="none" className="backdrop-blur-xl bg-white/95">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-[#007AFF] to-[#4299E1]">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {mode === 'edit' ? 'Editar Club' : 'Nuevo Club'}
                </h2>
                <p className="text-sm text-gray-600">
                  {steps[currentStep].description}
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all",
                    index <= currentStep 
                      ? "bg-[#007AFF] border-[#007AFF] text-white" 
                      : "border-gray-300 text-gray-400"
                  )}>
                    <step.icon className="w-4 h-4" />
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className={cn(
                      "w-16 h-0.5 mx-2 transition-all",
                      index < currentStep ? "bg-[#007AFF]" : "bg-gray-300"
                    )} />
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-2">
              <h3 className="font-medium text-gray-900">{steps[currentStep].title}</h3>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6">
            <div className="min-h-[400px]">
              <AnimatePresence mode="wait">
                {/* Step 1: Información Básica */}
                {currentStep === 0 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <Input
                          label="Nombre del Club"
                          placeholder="Ej. Club de Pádel Madrid"
                          error={errors.name?.message}
                          {...register('name')}
                        />
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Descripción
                          </label>
                          <textarea
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#007AFF] focus:border-transparent transition-all"
                            rows={4}
                            placeholder="Descripción del club..."
                            {...register('description')}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Input
                          label="Logo URL"
                          placeholder="https://ejemplo.com/logo.jpg"
                          leftIcon={<ImageIcon className="w-4 h-4" />}
                          {...register('logo_url')}
                        />
                        
                        <Input
                          label="Imagen de Portada URL"
                          placeholder="https://ejemplo.com/portada.jpg"
                          leftIcon={<ImageIcon className="w-4 h-4" />}
                          {...register('cover_image_url')}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Contacto */}
                {currentStep === 1 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <Input
                          label="Dirección"
                          placeholder="Calle Principal 123, Madrid"
                          leftIcon={<MapPin className="w-4 h-4" />}
                          error={errors.address?.message}
                          {...register('address')}
                        />
                        
                        <Input
                          label="Teléfono"
                          placeholder="+34 123 456 789"
                          leftIcon={<Phone className="w-4 h-4" />}
                          error={errors.phone?.message}
                          {...register('phone')}
                        />
                      </div>

                      <div className="space-y-4">
                        <Input
                          label="Email"
                          type="email"
                          placeholder="info@club.com"
                          leftIcon={<Mail className="w-4 h-4" />}
                          error={errors.email?.message}
                          {...register('email')}
                        />
                        
                        <Input
                          label="Sitio Web"
                          placeholder="https://www.club.com"
                          error={errors.website?.message}
                          {...register('website')}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Características */}
                {currentStep === 2 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Características del Club
                      </h3>
                      <p className="text-sm text-gray-600 mb-6">
                        Selecciona las características que ofrece tu club
                      </p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {AVAILABLE_FEATURES.map((feature) => (
                          <motion.div
                            key={feature.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Card
                              variant={selectedFeatures.includes(feature.id) ? "elevated" : "default"}
                              padding="default"
                              className={cn(
                                "cursor-pointer transition-all",
                                selectedFeatures.includes(feature.id)
                                  ? "ring-2 ring-[#007AFF] border-[#007AFF] bg-blue-50/50"
                                  : "hover:border-gray-300"
                              )}
                              onClick={() => toggleFeature(feature.id)}
                            >
                              <div className="flex flex-col items-center text-center gap-3">
                                <div className={cn(
                                  "p-3 rounded-lg transition-all",
                                  selectedFeatures.includes(feature.id)
                                    ? "bg-[#007AFF] text-white"
                                    : "bg-gray-100 text-gray-600"
                                )}>
                                  <feature.icon className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                  {feature.label}
                                </span>
                              </div>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Revisión */}
                {currentStep === 3 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Revisión de Información
                      </h3>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card variant="default" padding="default">
                          <h4 className="font-medium text-gray-900 mb-3">Información Básica</h4>
                          <div className="space-y-2 text-sm">
                            <div><strong>Nombre:</strong> {watch('name')}</div>
                            <div><strong>Descripción:</strong> {watch('description') || 'Sin descripción'}</div>
                          </div>
                        </Card>

                        <Card variant="default" padding="default">
                          <h4 className="font-medium text-gray-900 mb-3">Contacto</h4>
                          <div className="space-y-2 text-sm">
                            <div><strong>Dirección:</strong> {watch('address')}</div>
                            <div><strong>Teléfono:</strong> {watch('phone') || 'No especificado'}</div>
                            <div><strong>Email:</strong> {watch('email') || 'No especificado'}</div>
                          </div>
                        </Card>
                      </div>

                      <Card variant="default" padding="default">
                        <h4 className="font-medium text-gray-900 mb-3">Características</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedFeatures.map((featureId) => {
                            const feature = AVAILABLE_FEATURES.find(f => f.id === featureId);
                            return (
                              <span
                                key={featureId}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm"
                              >
                                {feature && <feature.icon className="w-3 h-3" />}
                                {feature?.label}
                              </span>
                            );
                          })}
                          {selectedFeatures.length === 0 && (
                            <span className="text-sm text-gray-500">Sin características seleccionadas</span>
                          )}
                        </div>
                      </Card>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Error Message */}
            {submitError && (
              <Card variant="default" padding="default" className="mb-6 border-red-200 bg-red-50">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              </Card>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200/50">
              <div className="text-sm text-gray-500">
                Paso {currentStep + 1} de {steps.length}
              </div>
              
              <div className="flex items-center gap-3">
                {currentStep > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                  >
                    Anterior
                  </Button>
                )}
                
                {currentStep < steps.length - 1 ? (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={nextStep}
                    disabled={!canProceedToNext()}
                  >
                    Siguiente
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting || !isValid}
                    leftIcon={isSubmitting ? undefined : <CheckCircle className="w-4 h-4" />}
                  >
                    {isSubmitting ? 'Guardando...' : (mode === 'edit' ? 'Actualizar Club' : 'Crear Club')}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

export default ProfessionalClubForm;