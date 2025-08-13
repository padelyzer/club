'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings,
  Building2,
  MapPin,
  Users,
  Target,
  DollarSign,
  Clock,
  Palette,
  Shield,
  Bell,
  Wifi,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertTriangle,
  Info,
  Star,
  Zap,
  Globe,
  Calendar,
  Phone,
  Mail,
  Crown
} from 'lucide-react';
import { Card } from '@/components/ui/professional/Card';
import { Button } from '@/components/ui/professional/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUpdateClubConfig } from '@/lib/api/hooks/useClubs';
import { useToast } from '@/hooks/use-toast';

interface AdvancedConfigurationWizardProps {
  clubId: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  currentConfig?: any;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  required: boolean;
  category: 'basic' | 'operational' | 'advanced' | 'mobile' | 'branding';
}

interface ConfigurationData {
  // Basic Information
  basic: {
    name: string;
    description: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    timezone: string;
    currency: string;
  };
  
  // Location & Courts
  location: {
    latitude: string;
    longitude: string;
    totalCourts: number;
    courtTypes: string[];
    amenities: string[];
    parking: boolean;
    accessibility: boolean;
  };
  
  // Operational Settings
  operational: {
    operatingHours: {
      [key: string]: { open: string; close: string; closed: boolean };
    };
    advanceBookingDays: number;
    cancellationDeadlineHours: number;
    minBookingDurationMinutes: number;
    maxBookingDurationMinutes: number;
    autoConfirmBookings: boolean;
  };
  
  // Pricing & Revenue
  pricing: {
    basePrice: number;
    dynamicPricingEnabled: boolean;
    peakHoursMultiplier: number;
    weekendMultiplier: number;
    memberDiscountPercentage: number;
    paymentMethods: string[];
  };
  
  // Staff & Security
  staff: {
    maxStaffMembers: number;
    roleBasedAccess: boolean;
    twoFactorAuth: boolean;
    sessionTimeout: number;
    auditLogging: boolean;
  };
  
  // Mobile & Digital Features
  mobile: {
    mobileAppEnabled: boolean;
    pushNotifications: boolean;
    mobileCheckin: boolean;
    offlineMode: boolean;
    qrCodeAccess: boolean;
    weatherIntegration: boolean;
    calendarSync: boolean;
  };
  
  // Branding & Customization
  branding: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl: string;
    customCss: string;
    socialMedia: {
      facebook: string;
      instagram: string;
      twitter: string;
      whatsapp: string;
    };
  };
  
  // Analytics & Reporting
  analytics: {
    advancedAnalytics: boolean;
    customerInsights: boolean;
    revenueOptimization: boolean;
    predictiveAnalytics: boolean;
    customReports: boolean;
    dataRetentionDays: number;
  };
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'basic',
    title: 'Información Básica',
    description: 'Datos fundamentales del club',
    icon: Building2,
    required: true,
    category: 'basic'
  },
  {
    id: 'location',
    title: 'Ubicación y Canchas',
    description: 'Configuración física del club',
    icon: MapPin,
    required: true,
    category: 'basic'
  },
  {
    id: 'operational',
    title: 'Configuración Operacional',
    description: 'Horarios y reglas de negocio',
    icon: Clock,
    required: true,
    category: 'operational'
  },
  {
    id: 'pricing',
    title: 'Precios y Facturación',
    description: 'Estrategia de precios y pagos',
    icon: DollarSign,
    required: true,
    category: 'operational'
  },
  {
    id: 'staff',
    title: 'Personal y Seguridad',
    description: 'Gestión de personal y acceso',
    icon: Shield,
    required: false,
    category: 'advanced'
  },
  {
    id: 'mobile',
    title: 'Funciones Digitales',
    description: 'App móvil e integaciones',
    icon: Phone,
    required: false,
    category: 'mobile'
  },
  {
    id: 'branding',
    title: 'Marca y Personalización',
    description: 'Colores, logo y redes sociales',
    icon: Palette,
    required: false,
    category: 'branding'
  },
  {
    id: 'analytics',
    title: 'Analytics Avanzado',
    description: 'Reportes y análisis de datos',
    icon: Zap,
    required: false,
    category: 'advanced'
  }
];

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' }
];

const COURT_TYPES = [
  'Pádel Indoor',
  'Pádel Outdoor',
  'Pádel Panorámico',
  'Pádel Single',
  'Pádel Profesional'
];

const AMENITIES = [
  'Vestuarios',
  'Duchas',
  'Cafetería',
  'Tienda Pro Shop',
  'Estacionamiento',
  'WiFi Gratis',
  'Aire Acondicionado',
  'Iluminación LED',
  'Sistema de Sonido',
  'Cámaras de Seguridad'
];

const PAYMENT_METHODS = [
  'Efectivo',
  'Tarjeta de Crédito',
  'Tarjeta de Débito',
  'Transferencia Bancaria',
  'PayPal',
  'Mercado Pago',
  'Stripe',
  'OXXO'
];

const AdvancedConfigurationWizard: React.FC<AdvancedConfigurationWizardProps> = ({
  clubId,
  isOpen,
  onClose,
  onComplete,
  currentConfig
}) => {
  const { toast } = useToast();
  const updateConfigMutation = useUpdateClubConfig();

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [config, setConfig] = useState<ConfigurationData>({
    basic: {
      name: '',
      description: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      timezone: 'America/Mexico_City',
      currency: 'MXN'
    },
    location: {
      latitude: '',
      longitude: '',
      totalCourts: 4,
      courtTypes: ['Pádel Outdoor'],
      amenities: ['WiFi Gratis', 'Estacionamiento'],
      parking: true,
      accessibility: false
    },
    operational: {
      operatingHours: DAYS_OF_WEEK.reduce((acc, day) => ({
        ...acc,
        [day.key]: { open: '06:00', close: '22:00', closed: false }
      }), {}),
      advanceBookingDays: 30,
      cancellationDeadlineHours: 24,
      minBookingDurationMinutes: 60,
      maxBookingDurationMinutes: 180,
      autoConfirmBookings: true
    },
    pricing: {
      basePrice: 300,
      dynamicPricingEnabled: false,
      peakHoursMultiplier: 1.3,
      weekendMultiplier: 1.2,
      memberDiscountPercentage: 10,
      paymentMethods: ['Efectivo', 'Tarjeta de Crédito']
    },
    staff: {
      maxStaffMembers: 10,
      roleBasedAccess: true,
      twoFactorAuth: false,
      sessionTimeout: 8,
      auditLogging: true
    },
    mobile: {
      mobileAppEnabled: true,
      pushNotifications: true,
      mobileCheckin: true,
      offlineMode: false,
      qrCodeAccess: false,
      weatherIntegration: false,
      calendarSync: false
    },
    branding: {
      primaryColor: '#007AFF',
      secondaryColor: '#43A047',
      accentColor: '#FF5722',
      logoUrl: '',
      customCss: '',
      socialMedia: {
        facebook: '',
        instagram: '',
        twitter: '',
        whatsapp: ''
      }
    },
    analytics: {
      advancedAnalytics: true,
      customerInsights: false,
      revenueOptimization: true,
      predictiveAnalytics: false,
      customReports: false,
      dataRetentionDays: 365
    }
  });

  // Load current configuration if provided
  useEffect(() => {
    if (currentConfig) {
      setConfig(prev => ({
        ...prev,
        ...currentConfig
      }));
    }
  }, [currentConfig]);

  const currentStepData = WIZARD_STEPS[currentStep];
  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  const updateConfig = (section: keyof ConfigurationData, updates: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates }
    }));
  };

  const updateNestedConfig = (section: keyof ConfigurationData, subsection: string, updates: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: { ...prev[section][subsection as keyof typeof prev[typeof section]], ...updates }
      }
    }));
  };

  const validateStep = (stepId: string): boolean => {
    switch (stepId) {
      case 'basic':
        return !!(config.basic.name && config.basic.email && config.basic.phone);
      case 'location':
        return config.location.totalCourts > 0;
      case 'operational':
        return config.operational.advanceBookingDays > 0;
      case 'pricing':
        return config.pricing.basePrice > 0;
      default:
        return true; // Optional steps are always valid
    }
  };

  const handleNext = () => {
    const stepId = currentStepData.id;
    
    if (currentStepData.required && !validateStep(stepId)) {
      toast({
        title: "Información Incompleta",
        description: "Por favor completa todos los campos requeridos antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    if (!completedSteps.includes(stepId)) {
      setCompletedSteps(prev => [...prev, stepId]);
    }

    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    
    try {
      // Transform config to match backend expectations
      const backendConfig = {
        businessRules: {
          advanceBookingDays: config.operational.advanceBookingDays,
          cancellationDeadlineHours: config.operational.cancellationDeadlineHours,
          minBookingDurationMinutes: config.operational.minBookingDurationMinutes,
          maxBookingDurationMinutes: config.operational.maxBookingDurationMinutes
        },
        mobileFeatures: {
          checkinEnabled: config.mobile.mobileCheckin,
          pushNotificationsEnabled: config.mobile.pushNotifications,
          offlineModeEnabled: config.mobile.offlineMode
        },
        integrations: {
          weatherEnabled: config.mobile.weatherIntegration,
          calendarSyncEnabled: config.mobile.calendarSync
        },
        branding: {
          primaryColor: config.branding.primaryColor,
          secondaryColor: config.branding.secondaryColor,
          accentColor: config.branding.accentColor,
          customCss: config.branding.customCss
        },
        social: config.branding.socialMedia
      };

      await updateConfigMutation.mutateAsync({
        clubId,
        config: backendConfig
      });

      toast({
        title: "Configuración Completada",
        description: "Tu club ha sido configurado exitosamente con todas las funciones avanzadas.",
        variant: "default",
      });

      onComplete();
    } catch (error) {
      toast({
        title: "Error al Guardar",
        description: "No se pudo guardar la configuración. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStepData.id) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="clubName">Nombre del Club *</Label>
                <Input
                  id="clubName"
                  value={config.basic.name}
                  onChange={(e) => updateConfig('basic', { name: e.target.value })}
                  placeholder="Ej: Club Pádel Centro"
                  className={!config.basic.name ? 'border-red-300' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clubEmail">Email Principal *</Label>
                <Input
                  id="clubEmail"
                  type="email"
                  value={config.basic.email}
                  onChange={(e) => updateConfig('basic', { email: e.target.value })}
                  placeholder="info@clubpadel.com"
                  className={!config.basic.email ? 'border-red-300' : ''}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clubDescription">Descripción del Club</Label>
              <Textarea
                id="clubDescription"
                value={config.basic.description}
                onChange={(e) => updateConfig('basic', { description: e.target.value })}
                placeholder="Descripción breve de tu club de pádel..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clubAddress">Dirección Completa</Label>
              <Textarea
                id="clubAddress"
                value={config.basic.address}
                onChange={(e) => updateConfig('basic', { address: e.target.value })}
                placeholder="Calle, número, colonia, ciudad, código postal"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="clubPhone">Teléfono *</Label>
                <Input
                  id="clubPhone"
                  type="tel"
                  value={config.basic.phone}
                  onChange={(e) => updateConfig('basic', { phone: e.target.value })}
                  placeholder="+52 55 1234 5678"
                  className={!config.basic.phone ? 'border-red-300' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clubWebsite">Sitio Web</Label>
                <Input
                  id="clubWebsite"
                  type="url"
                  value={config.basic.website}
                  onChange={(e) => updateConfig('basic', { website: e.target.value })}
                  placeholder="https://www.clubpadel.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Zona Horaria</Label>
                <Select 
                  value={config.basic.timezone} 
                  onValueChange={(value) => updateConfig('basic', { timezone: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Mexico_City">Ciudad de México (GMT-6)</SelectItem>
                    <SelectItem value="America/Monterrey">Monterrey (GMT-6)</SelectItem>
                    <SelectItem value="America/Cancun">Cancún (GMT-5)</SelectItem>
                    <SelectItem value="America/Tijuana">Tijuana (GMT-8)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="totalCourts">Número de Canchas *</Label>
                <Input
                  id="totalCourts"
                  type="number"
                  min="1"
                  max="20"
                  value={config.location.totalCourts}
                  onChange={(e) => updateConfig('location', { totalCourts: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitud GPS</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  value={config.location.latitude}
                  onChange={(e) => updateConfig('location', { latitude: e.target.value })}
                  placeholder="19.432608"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitud GPS</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  value={config.location.longitude}
                  onChange={(e) => updateConfig('location', { longitude: e.target.value })}
                  placeholder="-99.133209"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Tipos de Canchas</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {COURT_TYPES.map((type) => (
                  <label key={type} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.location.courtTypes.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateConfig('location', { 
                            courtTypes: [...config.location.courtTypes, type] 
                          });
                        } else {
                          updateConfig('location', { 
                            courtTypes: config.location.courtTypes.filter(t => t !== type) 
                          });
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Amenidades Disponibles</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {AMENITIES.map((amenity) => (
                  <label key={amenity} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.location.amenities.includes(amenity)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateConfig('location', { 
                            amenities: [...config.location.amenities, amenity] 
                          });
                        } else {
                          updateConfig('location', { 
                            amenities: config.location.amenities.filter(a => a !== amenity) 
                          });
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Estacionamiento Disponible</h4>
                  <p className="text-sm text-gray-600">¿Hay estacionamiento para los clientes?</p>
                </div>
                <Switch
                  checked={config.location.parking}
                  onCheckedChange={(checked) => updateConfig('location', { parking: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Accesibilidad</h4>
                  <p className="text-sm text-gray-600">Acceso para personas con discapacidad</p>
                </div>
                <Switch
                  checked={config.location.accessibility}
                  onCheckedChange={(checked) => updateConfig('location', { accessibility: checked })}
                />
              </div>
            </div>
          </div>
        );

      case 'operational':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Horarios de Operación</h4>
              <div className="space-y-3">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.key} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-20 flex-shrink-0">
                      <span className="font-medium text-gray-900 text-sm">{day.label}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!config.operational.operatingHours[day.key].closed}
                        onCheckedChange={(checked) => {
                          updateNestedConfig('operational', 'operatingHours', {
                            [day.key]: {
                              ...config.operational.operatingHours[day.key],
                              closed: !checked
                            }
                          });
                        }}
                      />
                      <span className="text-xs text-gray-600">Abierto</span>
                    </div>

                    {!config.operational.operatingHours[day.key].closed && (
                      <>
                        <Input
                          type="time"
                          value={config.operational.operatingHours[day.key].open}
                          onChange={(e) => {
                            updateNestedConfig('operational', 'operatingHours', {
                              [day.key]: {
                                ...config.operational.operatingHours[day.key],
                                open: e.target.value
                              }
                            });
                          }}
                          className="w-24"
                        />
                        <span className="text-gray-500">-</span>
                        <Input
                          type="time"
                          value={config.operational.operatingHours[day.key].close}
                          onChange={(e) => {
                            updateNestedConfig('operational', 'operatingHours', {
                              [day.key]: {
                                ...config.operational.operatingHours[day.key],
                                close: e.target.value
                              }
                            });
                          }}
                          className="w-24"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Días Anticipados para Reservar</Label>
                <div className="space-y-2">
                  <Slider
                    value={[config.operational.advanceBookingDays]}
                    onValueChange={([value]) => updateConfig('operational', { advanceBookingDays: value })}
                    min={1}
                    max={90}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>1 día</span>
                    <span className="font-semibold">{config.operational.advanceBookingDays} días</span>
                    <span>90 días</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Plazo de Cancelación (Horas)</Label>
                <div className="space-y-2">
                  <Slider
                    value={[config.operational.cancellationDeadlineHours]}
                    onValueChange={([value]) => updateConfig('operational', { cancellationDeadlineHours: value })}
                    min={1}
                    max={72}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>1 hora</span>
                    <span className="font-semibold">{config.operational.cancellationDeadlineHours} horas</span>
                    <span>72 horas</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Duración Mínima (Minutos)</Label>
                <Select 
                  value={config.operational.minBookingDurationMinutes.toString()}
                  onValueChange={(value) => updateConfig('operational', { minBookingDurationMinutes: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">60 minutos</SelectItem>
                    <SelectItem value="90">90 minutos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duración Máxima (Minutos)</Label>
                <Select 
                  value={config.operational.maxBookingDurationMinutes.toString()}
                  onValueChange={(value) => updateConfig('operational', { maxBookingDurationMinutes: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="120">120 minutos</SelectItem>
                    <SelectItem value="150">150 minutos</SelectItem>
                    <SelectItem value="180">180 minutos</SelectItem>
                    <SelectItem value="240">240 minutos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Auto-Confirmar Reservas</h4>
                <p className="text-sm text-gray-600">Las reservas se confirman automáticamente sin revisión manual</p>
              </div>
              <Switch
                checked={config.operational.autoConfirmBookings}
                onCheckedChange={(checked) => updateConfig('operational', { autoConfirmBookings: checked })}
              />
            </div>
          </div>
        );

      case 'pricing':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Precio Base por Hora (MXN)</Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <Input
                    type="number"
                    min="50"
                    max="2000"
                    value={config.pricing.basePrice}
                    onChange={(e) => updateConfig('pricing', { basePrice: parseInt(e.target.value) || 300 })}
                    className="text-lg font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descuento para Miembros (%)</Label>
                <div className="space-y-2">
                  <Slider
                    value={[config.pricing.memberDiscountPercentage]}
                    onValueChange={([value]) => updateConfig('pricing', { memberDiscountPercentage: value })}
                    min={0}
                    max={50}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>0%</span>
                    <span className="font-semibold">{config.pricing.memberDiscountPercentage}%</span>
                    <span>50%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <h4 className="font-medium text-blue-900 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Pricing Dinámico
                </h4>
                <p className="text-sm text-blue-700">Ajusta precios automáticamente según demanda y horarios</p>
              </div>
              <Switch
                checked={config.pricing.dynamicPricingEnabled}
                onCheckedChange={(checked) => updateConfig('pricing', { dynamicPricingEnabled: checked })}
              />
            </div>

            {config.pricing.dynamicPricingEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <Label>Multiplicador Horario Premium</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[config.pricing.peakHoursMultiplier]}
                      onValueChange={([value]) => updateConfig('pricing', { peakHoursMultiplier: value })}
                      min={1.0}
                      max={2.0}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>1.0x</span>
                      <span className="font-semibold">
                        {config.pricing.peakHoursMultiplier.toFixed(1)}x 
                        (${Math.round(config.pricing.basePrice * config.pricing.peakHoursMultiplier)})
                      </span>
                      <span>2.0x</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Multiplicador Fin de Semana</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[config.pricing.weekendMultiplier]}
                      onValueChange={([value]) => updateConfig('pricing', { weekendMultiplier: value })}
                      min={1.0}
                      max={2.0}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>1.0x</span>
                      <span className="font-semibold">
                        {config.pricing.weekendMultiplier.toFixed(1)}x 
                        (${Math.round(config.pricing.basePrice * config.pricing.weekendMultiplier)})
                      </span>
                      <span>2.0x</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Label>Métodos de Pago Aceptados</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PAYMENT_METHODS.map((method) => (
                  <label key={method} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.pricing.paymentMethods.includes(method)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateConfig('pricing', { 
                            paymentMethods: [...config.pricing.paymentMethods, method] 
                          });
                        } else {
                          updateConfig('pricing', { 
                            paymentMethods: config.pricing.paymentMethods.filter(m => m !== method) 
                          });
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{method}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      // Additional steps would continue here...
      default:
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <currentStepData.icon className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {currentStepData.title}
            </h3>
            <p className="text-gray-600 mb-6">
              {currentStepData.description}
            </p>
            <p className="text-sm text-gray-500">
              Esta sección está en desarrollo y estará disponible pronto.
            </p>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-6 h-6 text-blue-600" />
                Configuración Avanzada del Club
              </h2>
              <p className="text-sm text-gray-600">
                Paso {currentStep + 1} de {WIZARD_STEPS.length}: {currentStepData.title}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-600">
                {Math.round(progress)}% completado
              </div>
              <Button
                variant="secondary"
                onClick={onClose}
                size="sm"
              >
                Cerrar
              </Button>
            </div>
          </div>
          
          <div className="mt-4">
            <Progress value={progress} className="w-full" />
          </div>
        </div>

        {/* Content */}
        <div className="flex">
          {/* Steps Sidebar */}
          <div className="w-80 bg-gray-50 border-r border-gray-200 p-4">
            <div className="space-y-2">
              {WIZARD_STEPS.map((step, index) => (
                <motion.button
                  key={step.id}
                  onClick={() => setCurrentStep(index)}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                    index === currentStep 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : completedSteps.includes(step.id)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${
                      index === currentStep 
                        ? 'bg-white/20' 
                        : completedSteps.includes(step.id)
                        ? 'bg-green-200'
                        : 'bg-gray-200'
                    }`}>
                      {completedSteps.includes(step.id) ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <step.icon className={`w-4 h-4 ${
                          index === currentStep ? 'text-white' : 'text-gray-600'
                        }`} />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-medium text-sm truncate ${
                          index === currentStep ? 'text-white' : 
                          completedSteps.includes(step.id) ? 'text-green-800' : 'text-gray-900'
                        }`}>
                          {step.title}
                        </h3>
                        {step.required && (
                          <span className={`text-xs ${
                            index === currentStep ? 'text-white/80' : 'text-red-600'
                          }`}>
                            *
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-1 truncate ${
                        index === currentStep ? 'text-white/80' : 
                        completedSteps.includes(step.id) ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {step.description}
                      </p>
                    </div>

                    {index < currentStep && !completedSteps.includes(step.id) && step.required && (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900 text-sm">Tip del Paso</h4>
                  <p className="text-xs text-blue-700 mt-1">
                    {currentStepData.id === 'basic' && 'Asegúrate de usar información actualizada y verificada.'}
                    {currentStepData.id === 'location' && 'Las coordenadas GPS ayudan a los clientes a encontrarte fácilmente.'}
                    {currentStepData.id === 'operational' && 'Los horarios flexibles pueden aumentar tus reservas.'}
                    {currentStepData.id === 'pricing' && 'El pricing dinámico puede incrementar tus ingresos hasta 30%.'}
                    {!['basic', 'location', 'operational', 'pricing'].includes(currentStepData.id) && 
                     'Esta configuración es opcional pero puede mejorar significativamente la experiencia.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <currentStepData.icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {currentStepData.title}
                    {currentStepData.required && <span className="text-red-600 ml-1">*</span>}
                  </h3>
                  <p className="text-sm text-gray-600">{currentStepData.description}</p>
                </div>
                
                <div className="ml-auto">
                  <Badge 
                    variant={currentStepData.required ? "default" : "secondary"}
                    className={currentStepData.required ? "bg-red-100 text-red-800" : ""}
                  >
                    {currentStepData.required ? 'Requerido' : 'Opcional'}
                  </Badge>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {completedSteps.length} de {WIZARD_STEPS.filter(s => s.required).length} pasos requeridos completados
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Anterior
            </Button>
            
            {currentStep < WIZARD_STEPS.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={currentStepData.required && !validateStep(currentStepData.id)}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Siguiente
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={isLoading}
                leftIcon={isLoading ? <Settings className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? 'Guardando...' : 'Completar Configuración'}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdvancedConfigurationWizard;