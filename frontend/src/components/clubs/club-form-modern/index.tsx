'use client';

import React, { useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Mail, Phone, Globe, MapPin, Calendar,
  Clock, DollarSign, Image, Shield, Sparkles,
  Check, AlertCircle, ChevronRight, ChevronLeft,
  Save, Eye, Loader2, Upload, X, Plus, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clubFormSchema, ClubFormData, getDefaultClubFormData } from '@/lib/validations/club-form';
import { adaptFormDataToAPI } from '@/lib/adapters/club-adapter';
import { useCreateClub, useUpdateClub } from '@/lib/api/hooks/useClubs';
import { clubDesignTokens as tokens } from '@/styles/club-design-tokens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/lib/toast';

interface ModernClubFormProps {
  club?: any; // For edit mode
  onSuccess?: (club: any) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
}

// Form steps configuration
const formSteps = [
  {
    id: 'basic',
    title: 'Información Básica',
    icon: Building2,
    description: 'Nombre y descripción del club'
  },
  {
    id: 'contact',
    title: 'Contacto',
    icon: Phone,
    description: 'Información de contacto'
  },
  {
    id: 'location',
    title: 'Ubicación',
    icon: MapPin,
    description: 'Dirección del club'
  },
  {
    id: 'schedule',
    title: 'Horarios',
    icon: Calendar,
    description: 'Horario de operación'
  },
  {
    id: 'features',
    title: 'Servicios',
    icon: Sparkles,
    description: 'Características y servicios'
  },
  {
    id: 'settings',
    title: 'Configuración',
    icon: Shield,
    description: 'Ajustes y precios'
  }
];

export const ModernClubForm: React.FC<ModernClubFormProps> = ({
  club,
  onSuccess,
  onCancel,
  mode = 'create'
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [logoPreview, setLogoPreview] = useState<string | null>(club?.logo_url || null);
  const [coverPreview, setCoverPreview] = useState<string | null>(club?.cover_image_url || null);
  
  const createMutation = useCreateClub();
  const updateMutation = useUpdateClub();
  
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, touchedFields }
  } = useForm<ClubFormData>({
    resolver: zodResolver(clubFormSchema),
    defaultValues: club ? adaptClubToForm(club) : getDefaultClubFormData(),
    mode: 'onChange'
  });
  
  const watchedValues = watch();
  
  // Handle file uploads
  const handleFileUpload = useCallback((
    event: React.ChangeEvent<HTMLInputElement>,
    field: 'logo' | 'coverImage',
    setPreview: (url: string | null) => void
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setValue(field, file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [setValue]);
  
  // Submit handler
  const onSubmit = async (data: ClubFormData) => {
    try {
      const apiData = adaptFormDataToAPI(data);
      
      if (mode === 'edit' && club) {
        await updateMutation.mutateAsync({ id: club.id, data: apiData });
        toast.success('Club actualizado exitosamente');
      } else {
        const newClub = await createMutation.mutateAsync(apiData as any);
        toast.success('Club creado exitosamente');
        onSuccess?.(newClub);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Error al guardar el club');
    }
  };
  
  // Navigation
  const nextStep = () => {
    if (currentStep < formSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const isLastStep = currentStep === formSteps.length - 1;
  const isFirstStep = currentStep === 0;
  const currentStepConfig = formSteps[currentStep];
  
  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "p-3 rounded-xl",
            "bg-gradient-to-br from-indigo-500 to-purple-600",
            "text-white shadow-lg shadow-indigo-500/25"
          )}>
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {mode === 'edit' ? 'Editar Club' : 'Crear Nuevo Club'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {mode === 'edit' 
                ? 'Actualiza la información de tu club'
                : 'Configura tu club con el software más poderoso del mundo'
              }
            </p>
          </div>
        </div>
        
        {/* Progress Steps */}
        <div className="relative">
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700" />
          <div 
            className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500"
            style={{ width: `${((currentStep + 1) / formSteps.length) * 100}%` }}
          />
          
          <div className="relative flex justify-between">
            {formSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(index)}
                  className={cn(
                    "flex flex-col items-center gap-2 pb-4",
                    "transition-all duration-300",
                    isActive && "scale-110"
                  )}
                  disabled={index > currentStep && !isValid}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    "border-2 transition-all duration-300",
                    isActive && "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-500/50",
                    isCompleted && "border-green-500 bg-green-500 text-white",
                    !isActive && !isCompleted && "border-gray-300 bg-white dark:bg-gray-800 text-gray-500"
                  )}>
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  
                  <div className={cn(
                    "text-xs font-medium hidden sm:block",
                    isActive && "text-indigo-600 dark:text-indigo-400",
                    !isActive && "text-gray-500"
                  )}>
                    {step.title}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Form Content */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="p-6 mb-6 shadow-xl border-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step Title */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <currentStepConfig.icon className="w-6 h-6 text-indigo-600" />
                  {currentStepConfig.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {currentStepConfig.description}
                </p>
              </div>
              
              {/* Step Content */}
              <div className="space-y-6">
                {currentStep === 0 && <BasicInfoStep register={register} errors={errors} watch={watch} />}
                {currentStep === 1 && <ContactStep register={register} errors={errors} />}
                {currentStep === 2 && <LocationStep register={register} errors={errors} />}
                {currentStep === 3 && <ScheduleStep control={control} errors={errors} />}
                {currentStep === 4 && <FeaturesStep control={control} setValue={setValue} watch={watch} />}
                {currentStep === 5 && (
                  <SettingsStep 
                    control={control} 
                    register={register}
                    errors={errors}
                    logoPreview={logoPreview}
                    coverPreview={coverPreview}
                    onLogoChange={(e: React.MouseEvent | React.KeyboardEvent | React.ChangeEvent<HTMLInputElement>) => handleFileUpload(e, 'logo', setLogoPreview)}
                    onCoverChange={(e: React.MouseEvent | React.KeyboardEvent | React.ChangeEvent<HTMLInputElement>) => handleFileUpload(e, 'coverImage', setCoverPreview)}
                  />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </Card>
        
        {/* Form Actions */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={isFirstStep ? onCancel : prevStep}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {isFirstStep ? 'Cancelar' : 'Anterior'}
          </Button>
          
          <div className="flex items-center gap-3">
            {!isLastStep ? (
              <Button
                type="button"
                onClick={nextStep}
                className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                disabled={!isValid}
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/25"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {mode === 'edit' ? 'Actualizar Club' : 'Crear Club'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

// Step Components
const BasicInfoStep: React.FC<any> = ({ register, errors, watch }) => {
  const name = watch('name');
  
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="name" className="text-base font-semibold mb-2">
          Nombre del Club *
        </Label>
        <Input
          {...register('name')}
          placeholder="Ej: Padel Club Barcelona"
          className={cn(
            "h-12 text-lg",
            errors.name && "border-red-500 focus:ring-red-500"
          )}
        />
        {errors.name && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.name.message}
          </p>
        )}
        
        {/* Live Preview */}
        {name && (
          <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <p className="text-sm text-indigo-700 dark:text-indigo-300">
              Vista previa: <span className="font-semibold">{name}</span>
            </p>
          </div>
        )}
      </div>
      
      <div>
        <Label htmlFor="description" className="text-base font-semibold mb-2">
          Descripción
        </Label>
        <Textarea
          {...register('description')}
          placeholder="Describe tu club en pocas palabras..."
          rows={4}
          className={cn(
            "resize-none",
            errors.description && "border-red-500 focus:ring-red-500"
          )}
        />
        <p className="mt-1 text-sm text-gray-500">
          {watch('description')?.length || 0}/500 caracteres
        </p>
      </div>
    </div>
  );
};

const ContactStep: React.FC<any> = ({ register, errors }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <Label htmlFor="email" className="text-base font-semibold mb-2">
          <Mail className="w-4 h-4 inline mr-2" />
          Email *
        </Label>
        <Input
          {...register('email')}
          type="email"
          placeholder="info@padelclub.com"
          className={errors.email && "border-red-500"}
        />
        {errors.email && (
          <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>
      
      <div>
        <Label htmlFor="phone" className="text-base font-semibold mb-2">
          <Phone className="w-4 h-4 inline mr-2" />
          Teléfono *
        </Label>
        <Input
          {...register('phone')}
          placeholder="+34 600 123 456"
          className={errors.phone && "border-red-500"}
        />
        {errors.phone && (
          <p className="mt-2 text-sm text-red-600">{errors.phone.message}</p>
        )}
      </div>
      
      <div>
        <Label htmlFor="website" className="text-base font-semibold mb-2">
          <Globe className="w-4 h-4 inline mr-2" />
          Sitio Web
        </Label>
        <Input
          {...register('website')}
          placeholder="https://www.padelclub.com"
          className={errors.website && "border-red-500"}
        />
      </div>
      
      <div>
        <Label htmlFor="whatsapp" className="text-base font-semibold mb-2">
          <Phone className="w-4 h-4 inline mr-2" />
          WhatsApp
        </Label>
        <Input
          {...register('whatsapp')}
          placeholder="+34 600 123 456"
        />
      </div>
    </div>
  );
};

const LocationStep: React.FC<any> = ({ register, errors }) => {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="address" className="text-base font-semibold mb-2">
          <MapPin className="w-4 h-4 inline mr-2" />
          Dirección *
        </Label>
        <Input
          {...register('address')}
          placeholder="Calle Example, 123"
          className={errors.address && "border-red-500"}
        />
        {errors.address && (
          <p className="mt-2 text-sm text-red-600">{errors.address.message}</p>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="city">Ciudad *</Label>
          <Input
            {...register('city')}
            placeholder="Barcelona"
            className={errors.city && "border-red-500"}
          />
        </div>
        
        <div>
          <Label htmlFor="postalCode">Código Postal</Label>
          <Input
            {...register('postalCode')}
            placeholder="08001"
            className={errors.postalCode && "border-red-500"}
          />
        </div>
        
        <div>
          <Label htmlFor="region">Región/Estado *</Label>
          <Input
            {...register('region')}
            placeholder="Cataluña"
            className={errors.region && "border-red-500"}
          />
        </div>
        
        <div>
          <Label htmlFor="country">País *</Label>
          <Input
            {...register('country')}
            placeholder="España"
            className={errors.country && "border-red-500"}
          />
        </div>
      </div>
    </div>
  );
};

const ScheduleStep: React.FC<any> = ({ control, errors }) => {
  const days = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
  ];
  
  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          Horario de Operación
        </h3>
        <p className="text-sm text-gray-600">Define cuándo está abierto tu club</p>
      </div>
      
      <Controller
        name="schedule"
        control={control}
        render={({ field }) => (
          <div className="space-y-3">
            {days.map((day, index) => {
              const daySchedule = field.value[index];
              
              return (
                <div key={day.key} className={cn(
                  "p-4 rounded-lg border",
                  "bg-gray-50 dark:bg-gray-800",
                  "border-gray-200 dark:border-gray-700"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium w-24">{day.label}</span>
                      
                      <Switch
                        checked={daySchedule.is_open}
                        onCheckedChange={(checked) => {
                          const newSchedule = [...field.value];
                          newSchedule[index] = { ...daySchedule, is_open: checked };
                          field.onChange(newSchedule);
                        }}
                      />
                      
                      <span className={cn(
                        "text-sm",
                        daySchedule.is_open ? "text-green-600" : "text-gray-500"
                      )}>
                        {daySchedule.is_open ? 'Abierto' : 'Cerrado'}
                      </span>
                    </div>
                    
                    {daySchedule.is_open && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={daySchedule.open_time || ''}
                          onChange={(e) => {
                            const newSchedule = [...field.value];
                            newSchedule[index] = { ...daySchedule, open_time: e.target.value };
                            field.onChange(newSchedule);
                          }}
                          className="w-32"
                        />
                        <span className="text-gray-500">-</span>
                        <Input
                          type="time"
                          value={daySchedule.close_time || ''}
                          onChange={(e) => {
                            const newSchedule = [...field.value];
                            newSchedule[index] = { ...daySchedule, close_time: e.target.value };
                            field.onChange(newSchedule);
                          }}
                          className="w-32"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      />
    </div>
  );
};

const FeaturesStep: React.FC<any> = ({ control, setValue, watch }) => {
  const features = watch('features') || [];
  const services = watch('services') || [];
  
  const availableFeatures = [
    { id: 'parking', label: 'Parking', icon: '🚗' },
    { id: 'indoor', label: 'Pistas Cubiertas', icon: '🏠' },
    { id: 'outdoor', label: 'Pistas Exteriores', icon: '☀️' },
    { id: 'restaurant', label: 'Restaurante', icon: '🍽️' },
    { id: 'shop', label: 'Tienda', icon: '🛍️' },
    { id: 'changing_rooms', label: 'Vestuarios', icon: '👕' },
    { id: 'showers', label: 'Duchas', icon: '🚿' },
    { id: 'lockers', label: 'Taquillas', icon: '🔐' },
    { id: 'wifi', label: 'WiFi', icon: '📶' },
    { id: 'pro_shop', label: 'Pro Shop', icon: '🎾' },
  ];
  
  const availableServices = [
    { id: 'equipment_rental', label: 'Alquiler de Equipos', icon: '🎾' },
    { id: 'coaching', label: 'Clases', icon: '👨‍🏫' },
    { id: 'tournaments', label: 'Torneos', icon: '🏆' },
    { id: 'leagues', label: 'Ligas', icon: '📊' },
    { id: 'physiotherapy', label: 'Fisioterapia', icon: '💆‍♂️' },
    { id: 'gym', label: 'Gimnasio', icon: '💪' },
  ];
  
  const toggleFeature = (featureId: string) => {
    const newFeatures = features.includes(featureId)
      ? features.filter((f: string) => f !== featureId)
      : [...features, featureId];
    setValue('features', newFeatures);
  };
  
  const toggleService = (serviceId: string) => {
    const newServices = services.includes(serviceId)
      ? services.filter((s: string) => s !== serviceId)
      : [...services, serviceId];
    setValue('services', newServices);
  };
  
  return (
    <div className="space-y-8">
      {/* Features */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          Instalaciones y Características
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {availableFeatures.map((feature) => (
            <motion.button
              key={feature.id}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleFeature(feature.id)}
              className={cn(
                "p-4 rounded-xl border-2 transition-all",
                "flex flex-col items-center gap-2",
                features.includes(feature.id)
                  ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
              )}
            >
              <span className="text-2xl">{feature.icon}</span>
              <span className={cn(
                "text-sm font-medium",
                features.includes(feature.id)
                  ? "text-indigo-700 dark:text-indigo-300"
                  : "text-gray-700 dark:text-gray-300"
              )}>
                {feature.label}
              </span>
              {features.includes(feature.id) && (
                <Check className="w-4 h-4 text-indigo-600" />
              )}
            </motion.button>
          ))}
        </div>
      </div>
      
      {/* Services */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-purple-600" />
          Servicios Disponibles
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {availableServices.map((service) => (
            <motion.button
              key={service.id}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleService(service.id)}
              className={cn(
                "p-4 rounded-xl border-2 transition-all",
                "flex flex-col items-center gap-2",
                services.includes(service.id)
                  ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
              )}
            >
              <span className="text-2xl">{service.icon}</span>
              <span className={cn(
                "text-sm font-medium",
                services.includes(service.id)
                  ? "text-purple-700 dark:text-purple-300"
                  : "text-gray-700 dark:text-gray-300"
              )}>
                {service.label}
              </span>
              {services.includes(service.id) && (
                <Check className="w-4 h-4 text-purple-600" />
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

const SettingsStep: React.FC<any> = ({ 
  control, 
  register,
  errors,
  logoPreview, 
  coverPreview, 
  onLogoChange, 
  onCoverChange 
}) => {
  return (
    <div className="space-y-8">
      {/* Images */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label className="text-base font-semibold mb-3 block">
            <Image className="w-4 h-4 inline mr-2" />
            Logo del Club
          </Label>
          
          <div className={cn(
            "relative group",
            "w-full h-40 rounded-xl overflow-hidden",
            "border-2 border-dashed border-gray-300 dark:border-gray-600",
            "hover:border-indigo-500 transition-colors"
          )}>
            {logoPreview ? (
              <>
                <img 
                  src={logoPreview} 
                  alt="Logo preview" 
                  className="w-full h-full object-contain p-4"
                />
                <button
                  type="button"
                  onClick={() => {
                    setLogoPreview(null);
                    setValue('logo', undefined);
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Click para subir logo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onLogoChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
        
        <div>
          <Label className="text-base font-semibold mb-3 block">
            <Image className="w-4 h-4 inline mr-2" />
            Imagen de Portada
          </Label>
          
          <div className={cn(
            "relative group",
            "w-full h-40 rounded-xl overflow-hidden",
            "border-2 border-dashed border-gray-300 dark:border-gray-600",
            "hover:border-indigo-500 transition-colors"
          )}>
            {coverPreview ? (
              <>
                <img 
                  src={coverPreview} 
                  alt="Cover preview" 
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCoverPreview(null);
                    setValue('coverImage', undefined);
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Click para subir portada</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onCoverChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>
      
      {/* Booking Settings */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          Configuración de Reservas
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="defaultBookingDuration">
              Duración de Reserva (minutos)
            </Label>
            <Input
              {...register('defaultBookingDuration', { valueAsNumber: true })}
              type="number"
              min="30"
              max="240"
              step="30"
              className={errors.defaultBookingDuration && "border-red-500"}
            />
            <p className="text-sm text-gray-500 mt-1">
              Tiempo por defecto para cada reserva
            </p>
          </div>
          
          <div>
            <Label htmlFor="advanceBookingDays">
              Días de Anticipación
            </Label>
            <Input
              {...register('advanceBookingDays', { valueAsNumber: true })}
              type="number"
              min="1"
              max="90"
              className={errors.advanceBookingDays && "border-red-500"}
            />
            <p className="text-sm text-gray-500 mt-1">
              Con cuántos días se puede reservar
            </p>
          </div>
          
          <div>
            <Label htmlFor="cancellationHours">
              Horas para Cancelación
            </Label>
            <Input
              {...register('cancellationHours', { valueAsNumber: true })}
              type="number"
              min="0"
              max="72"
              className={errors.cancellationHours && "border-red-500"}
            />
            <p className="text-sm text-gray-500 mt-1">
              Tiempo límite para cancelar sin penalización
            </p>
          </div>
        </div>
      </div>
      
      {/* Privacy Settings */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-600" />
          Privacidad y Acceso
        </h3>
        
        <div className="space-y-4">
          <Controller
            name="allowOnlineBooking"
            control={control}
            render={({ field }) => (
              <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div>
                  <Label className="text-base font-medium">Reservas Online</Label>
                  <p className="text-sm text-gray-500">
                    Permitir que los usuarios reserven pistas online
                  </p>
                </div>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />
          
          <Controller
            name="requireMembership"
            control={control}
            render={({ field }) => (
              <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div>
                  <Label className="text-base font-medium">Membresía Requerida</Label>
                  <p className="text-sm text-gray-500">
                    Solo miembros pueden hacer reservas
                  </p>
                </div>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />
          
          <Controller
            name="publicProfile"
            control={control}
            render={({ field }) => (
              <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div>
                  <Label className="text-base font-medium">Perfil Público</Label>
                  <p className="text-sm text-gray-500">
                    Mostrar el club en búsquedas públicas
                  </p>
                </div>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default ModernClubForm;