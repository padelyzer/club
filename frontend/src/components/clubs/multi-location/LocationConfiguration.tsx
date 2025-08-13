'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Users, 
  Palette,
  Save,
  RotateCcw,
  Camera,
  Globe,
  Shield,
  Bell,
  Wifi
} from 'lucide-react';
import { Card } from '@/components/ui/professional/Card';
import { Button } from '@/components/ui/professional/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface Location {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  isMainLocation: boolean;
  status: 'active' | 'inactive' | 'maintenance';
  phone?: string;
  email?: string;
  manager?: string;
  operatingHours: {
    open: string;
    close: string;
  };
}

interface LocationConfigurationProps {
  location: Location;
  onSave: (data: any) => void;
}

interface ConfigForm {
  // Basic Info
  name: string;
  address: string;
  phone: string;
  email: string;
  manager: string;
  description: string;
  
  // Location
  latitude: string;
  longitude: string;
  timezone: string;
  
  // Operating Hours
  operatingHours: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };
  
  // Business Rules
  advanceBookingDays: number;
  cancellationDeadlineHours: number;
  minBookingDurationMinutes: number;
  maxBookingDurationMinutes: number;
  
  // Features
  features: {
    onlineBooking: boolean;
    mobileCheckin: boolean;
    pushNotifications: boolean;
    offlineMode: boolean;
    weatherIntegration: boolean;
    calendarSync: boolean;
  };
  
  // Branding
  branding: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl: string;
    customCss: string;
  };
  
  // Social
  social: {
    facebook: string;
    instagram: string;
    twitter: string;
    whatsapp: string;
  };
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const TIMEZONES = [
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { value: 'America/Monterrey', label: 'Monterrey (GMT-6)' },
  { value: 'America/Cancun', label: 'Cancún (GMT-5)' },
  { value: 'America/Tijuana', label: 'Tijuana (GMT-8)' },
];

const LocationConfiguration: React.FC<LocationConfigurationProps> = ({ location, onSave }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('basic');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState<ConfigForm>({
    name: location.name || '',
    address: location.address || '',
    phone: location.phone || '',
    email: location.email || '',
    manager: location.manager || '',
    description: '',
    latitude: location.latitude?.toString() || '',
    longitude: location.longitude?.toString() || '',
    timezone: 'America/Mexico_City',
    operatingHours: DAYS_OF_WEEK.reduce((acc, day) => ({
      ...acc,
      [day.key]: {
        open: location.operatingHours?.open || '06:00',
        close: location.operatingHours?.close || '22:00',
        closed: false
      }
    }), {} as ConfigForm['operatingHours']),
    advanceBookingDays: 30,
    cancellationDeadlineHours: 24,
    minBookingDurationMinutes: 60,
    maxBookingDurationMinutes: 180,
    features: {
      onlineBooking: true,
      mobileCheckin: true,
      pushNotifications: true,
      offlineMode: true,
      weatherIntegration: false,
      calendarSync: false,
    },
    branding: {
      primaryColor: '#007AFF',
      secondaryColor: '#43A047',
      accentColor: '#FF5722',
      logoUrl: '',
      customCss: '',
    },
    social: {
      facebook: '',
      instagram: '',
      twitter: '',
      whatsapp: '',
    }
  });

  const updateForm = (updates: Partial<ConfigForm>) => {
    setForm(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const updateNestedForm = (section: keyof ConfigForm, updates: any) => {
    setForm(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      await onSave(form);
      setHasChanges(false);
      
      toast({
        title: "Configuración Guardada",
        description: "La configuración de la ubicación ha sido actualizada exitosamente.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error al Guardar",
        description: "No se pudo guardar la configuración. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    // Reset form to original values
    setHasChanges(false);
    toast({
      title: "Cambios Descartados",
      description: "Los cambios no guardados han sido descartados.",
      variant: "default",
    });
  };

  const renderBasicConfig = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre de la Ubicación</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => updateForm({ name: e.target.value })}
            placeholder="Ej: Club Central Norte"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="manager">Manager/Encargado</Label>
          <Input
            id="manager"
            value={form.manager}
            onChange={(e) => updateForm({ manager: e.target.value })}
            placeholder="Nombre del encargado"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Dirección Completa</Label>
        <Textarea
          id="address"
          value={form.address}
          onChange={(e) => updateForm({ address: e.target.value })}
          placeholder="Dirección completa con código postal"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => updateForm({ description: e.target.value })}
          placeholder="Descripción de la ubicación, amenidades, etc."
          rows={4}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => updateForm({ phone: e.target.value })}
            placeholder="+52 55 1234 5678"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => updateForm({ email: e.target.value })}
            placeholder="ubicacion@club.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="latitude">Latitud</Label>
          <Input
            id="latitude"
            type="number"
            step="0.000001"
            value={form.latitude}
            onChange={(e) => updateForm({ latitude: e.target.value })}
            placeholder="19.432608"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="longitude">Longitud</Label>
          <Input
            id="longitude"
            type="number"
            step="0.000001"
            value={form.longitude}
            onChange={(e) => updateForm({ longitude: e.target.value })}
            placeholder="-99.133209"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Zona Horaria</Label>
          <Select 
            value={form.timezone} 
            onValueChange={(value) => updateForm({ timezone: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderOperatingHours = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        {DAYS_OF_WEEK.map((day) => (
          <div key={day.key} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-24 flex-shrink-0">
              <span className="font-medium text-gray-900">{day.label}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                checked={!form.operatingHours[day.key as keyof ConfigForm['operatingHours']].closed}
                onCheckedChange={(checked) => {
                  updateNestedForm('operatingHours', {
                    [day.key]: {
                      ...form.operatingHours[day.key as keyof ConfigForm['operatingHours']],
                      closed: !checked
                    }
                  });
                }}
              />
              <span className="text-sm text-gray-600">Abierto</span>
            </div>

            {!form.operatingHours[day.key as keyof ConfigForm['operatingHours']].closed && (
              <>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`${day.key}-open`} className="text-sm">De:</Label>
                  <Input
                    id={`${day.key}-open`}
                    type="time"
                    value={form.operatingHours[day.key as keyof ConfigForm['operatingHours']].open}
                    onChange={(e) => {
                      updateNestedForm('operatingHours', {
                        [day.key]: {
                          ...form.operatingHours[day.key as keyof ConfigForm['operatingHours']],
                          open: e.target.value
                        }
                      });
                    }}
                    className="w-32"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Label htmlFor={`${day.key}-close`} className="text-sm">A:</Label>
                  <Input
                    id={`${day.key}-close`}
                    type="time"
                    value={form.operatingHours[day.key as keyof ConfigForm['operatingHours']].close}
                    onChange={(e) => {
                      updateNestedForm('operatingHours', {
                        [day.key]: {
                          ...form.operatingHours[day.key as keyof ConfigForm['operatingHours']],
                          close: e.target.value
                        }
                      });
                    }}
                    className="w-32"
                  />
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderBusinessRules = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="advanceBooking">Días Anticipados para Reservar</Label>
          <Input
            id="advanceBooking"
            type="number"
            min="1"
            max="365"
            value={form.advanceBookingDays}
            onChange={(e) => updateForm({ advanceBookingDays: parseInt(e.target.value) || 30 })}
          />
          <p className="text-xs text-gray-600">Máximo de días con anticipación que se puede reservar</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="cancellationDeadline">Plazo de Cancelación (Horas)</Label>
          <Input
            id="cancellationDeadline"
            type="number"
            min="1"
            max="72"
            value={form.cancellationDeadlineHours}
            onChange={(e) => updateForm({ cancellationDeadlineHours: parseInt(e.target.value) || 24 })}
          />
          <p className="text-xs text-gray-600">Horas antes de la reserva para poder cancelar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="minDuration">Duración Mínima (Minutos)</Label>
          <Input
            id="minDuration"
            type="number"
            min="30"
            step="30"
            value={form.minBookingDurationMinutes}
            onChange={(e) => updateForm({ minBookingDurationMinutes: parseInt(e.target.value) || 60 })}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="maxDuration">Duración Máxima (Minutos)</Label>
          <Input
            id="maxDuration"
            type="number"
            min="60"
            step="30"
            value={form.maxBookingDurationMinutes}
            onChange={(e) => updateForm({ maxBookingDurationMinutes: parseInt(e.target.value) || 180 })}
          />
        </div>
      </div>
    </div>
  );

  const renderFeatures = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        {[
          {
            key: 'onlineBooking',
            label: 'Reservas en Línea',
            description: 'Permitir reservas a través del sitio web y app móvil',
            icon: Globe
          },
          {
            key: 'mobileCheckin',
            label: 'Check-in Móvil',
            description: 'Los miembros pueden hacer check-in desde la app',
            icon: Phone
          },
          {
            key: 'pushNotifications',
            label: 'Notificaciones Push',
            description: 'Enviar notificaciones automáticas a los usuarios',
            icon: Bell
          },
          {
            key: 'offlineMode',
            label: 'Modo Offline',
            description: 'La app funciona sin conexión a internet',
            icon: Wifi
          },
          {
            key: 'weatherIntegration',
            label: 'Integración del Clima',
            description: 'Mostrar clima y ajustar disponibilidad de canchas exteriores',
            icon: Globe
          },
          {
            key: 'calendarSync',
            label: 'Sincronización de Calendario',
            description: 'Sincronizar reservas con Google Calendar y Outlook',
            icon: Calendar
          },
        ].map((feature) => (
          <div key={feature.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <feature.icon className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{feature.label}</h4>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            </div>
            
            <Switch
              checked={form.features[feature.key as keyof ConfigForm['features']]}
              onCheckedChange={(checked) => {
                updateNestedForm('features', {
                  [feature.key]: checked
                });
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">
          Configuración - {location.name}
        </h3>
        
        <div className="flex items-center gap-3">
          {hasChanges && (
            <Button
              variant="secondary"
              onClick={handleReset}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Descartar
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Básico</TabsTrigger>
          <TabsTrigger value="hours">Horarios</TabsTrigger>
          <TabsTrigger value="rules">Reglas</TabsTrigger>
          <TabsTrigger value="features">Funciones</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="basic">
            <Card variant="glass" padding="lg">
              {renderBasicConfig()}
            </Card>
          </TabsContent>

          <TabsContent value="hours">
            <Card variant="glass" padding="lg">
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Horarios de Operación
                </h4>
                <p className="text-sm text-gray-600">
                  Define los horarios de operación para cada día de la semana
                </p>
              </div>
              {renderOperatingHours()}
            </Card>
          </TabsContent>

          <TabsContent value="rules">
            <Card variant="glass" padding="lg">
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  Reglas de Negocio
                </h4>
                <p className="text-sm text-gray-600">
                  Configura las reglas para reservaciones y cancelaciones
                </p>
              </div>
              {renderBusinessRules()}
            </Card>
          </TabsContent>

          <TabsContent value="features">
            <Card variant="glass" padding="lg">
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-purple-600" />
                  Funciones Disponibles
                </h4>
                <p className="text-sm text-gray-600">
                  Habilita o deshabilita funciones específicas para esta ubicación
                </p>
              </div>
              {renderFeatures()}
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Changes indicator */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 bg-amber-100 border border-amber-200 rounded-lg p-3 shadow-lg"
        >
          <p className="text-sm text-amber-800 font-medium">
            Tienes cambios sin guardar
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default LocationConfiguration;