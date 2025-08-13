'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Building2, Save, Eye, EyeOff, Copy, RefreshCw, Check, Link } from 'lucide-react';
import { RootService } from '@/lib/api/services/root.service';
import { Organization } from '@/lib/api/types';
import { toast } from '@/lib/toast';

export default function NewClubPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [createdClubData, setCreatedClubData] = useState<{
    club: any;
    owner: any;
    credentials: any;
  } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formData, setFormData] = useState({
    organization_id: '',
    name: '',
    slug: '',
    description: '',
    email: '',
    phone: '',
    website: '',
    address: {
      street: '',
      number: '',
      colony: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'México'
    },
    opening_time: '07:00',
    closing_time: '23:00',
    days_open: [1, 2, 3, 4, 5, 6], // Monday to Saturday
    features: [] as string[],
    primary_color: '#1E88E5',
    owner: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      password: '',
      generate_password: true
    },
    subscription: {
      plan: 'basic',
      billing_frequency: 'monthly'
    },
    courts_count: 1
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps


  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  const loadOrganizations = async () => {
    try {
      const response = await RootService.getOrganizations({ state: 'active' });
      const orgs = Array.isArray(response) ? response : response.results;
      setOrganizations(Array.isArray(orgs) ? orgs : []);
    } catch (error) {
      toast.error('Error al cargar organizaciones');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.organization_id) {
      toast.error('Por favor selecciona una organización');
      return;
    }

    if (!formData.slug) {
      toast.error('Por favor ingresa un slug para el club');
      return;
    }

    if (slugAvailable === false) {
      toast.error('El slug del club contiene caracteres no válidos. Solo se permiten letras, números y guiones.');
      return;
    }

    // Validate owner fields
    if (!formData.owner.first_name || !formData.owner.last_name || !formData.owner.email) {
      toast.error('Por favor completa todos los campos del administrador');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.owner.email)) {
      toast.error('Por favor ingresa un email válido para el administrador');
      return;
    }

    if (!formData.owner.password) {
      toast.error('Por favor genera o ingresa una contraseña para el administrador');
      return;
    }

    setLoading(true);
    
    // Debug: Log the data being sent - full backend format with owner and slug
    const requestData = {
      organization_id: formData.organization_id,
      name: formData.name,
      description: formData.description || '',
      email: formData.email,
      phone: formData.phone,
      website: formData.website || '',
      address: formData.address,
      opening_time: formData.opening_time,
      closing_time: formData.closing_time,
      days_open: formData.days_open,
      features: formData.features.filter(f => f.length > 0),
      primary_color: formData.primary_color,
      subscription: formData.subscription,
      courts_count: formData.courts_count,
      slug: formData.slug,
      owner: formData.owner
    };
    
                    
    try {
      const response = await RootService.createClub(requestData);
      
      // Set created club data for success modal
      setCreatedClubData({
        club: response,
        owner: response.admin_user || null,
        credentials: {
          email: response.admin_user?.email || '',
          password: response.admin_user?.password || '',
          club_url: response.admin_user?.club_url || `https://app.padelyzer.com/${response.slug || ''}`
        }
      });
      
      // Show success modal
      setShowSuccessModal(true);
      
      // Also show a toast notification
      toast.success('Club creado exitosamente', {
        duration: 5000,
        description: `Club: ${response.name} | Admin: ${response.admin_user?.email || 'N/A'}`
      });
    } catch (error: any) {
                              
      // Enhanced error handling with specific field errors
      let errorMessage = 'Error al crear club';
      
      if (error?.response?.data) {
        const errorData = error.response.data;
        
        // Handle specific field validation errors
        if (errorData.owner) {
          const ownerErrors = errorData.owner;
          if (ownerErrors.email) {
            errorMessage = `Error en email del administrador: ${Array.isArray(ownerErrors.email) ? ownerErrors.email[0] : ownerErrors.email}`;
          } else if (ownerErrors.first_name) {
            errorMessage = `Error en nombre del administrador: ${Array.isArray(ownerErrors.first_name) ? ownerErrors.first_name[0] : ownerErrors.first_name}`;
          } else if (ownerErrors.password) {
            errorMessage = `Error en contraseña: ${Array.isArray(ownerErrors.password) ? ownerErrors.password[0] : ownerErrors.password}`;
          }
        } else if (errorData.slug) {
          errorMessage = `Error en slug del club: ${Array.isArray(errorData.slug) ? errorData.slug[0] : errorData.slug}`;
        } else if (errorData.name) {
          errorMessage = `Error en nombre del club: ${Array.isArray(errorData.name) ? errorData.name[0] : errorData.name}`;
        } else if (errorData.email) {
          errorMessage = `Error en email del club: ${Array.isArray(errorData.email) ? errorData.email[0] : errorData.email}`;
        } else if (errorData.organization_id) {
          errorMessage = `Error en organización: ${Array.isArray(errorData.organization_id) ? errorData.organization_id[0] : errorData.organization_id}`;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else {
          // Generic field error handling
          const fieldErrors = [];
          for (const [field, value] of Object.entries(errorData)) {
            if (Array.isArray(value)) {
              fieldErrors.push(`${field}: ${value[0]}`);
            } else if (typeof value === 'string') {
              fieldErrors.push(`${field}: ${value}`);
            }
          }
          if (fieldErrors.length > 0) {
            errorMessage = `Errores de validación: ${fieldErrors.join(', ')}`;
          }
        }
      } else if (error?.response?.status === 500) {
        errorMessage = 'Error interno del servidor. Por favor contacta al administrador.';
      } else if (error?.response?.status === 403) {
        errorMessage = 'No tienes permisos para crear clubs.';
      } else if (error?.response?.status === 401) {
        errorMessage = 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        duration: 10000, // Show error longer
        description: `Código de error: ${error?.response?.status || 'Desconocido'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  const handleWebsiteChange = (value: string) => {
    // Auto-complete protocol if not provided
    let formattedWebsite = value.trim();
    if (formattedWebsite && !formattedWebsite.match(/^https?:\/\//)) {
      formattedWebsite = `https://${formattedWebsite}`;
    }
    
    setFormData(prev => ({
      ...prev,
      website: formattedWebsite
    }));
  };

  const toggleFeature = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const handleOwnerChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      owner: { ...prev.owner, [field]: value }
    }));
  };

  const generateSlugFromName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading and trailing hyphens
  };

  const handleNameChange = (name: string) => {
    const slug = generateSlugFromName(name);
    setFormData(prev => ({
      ...prev,
      name,
      slug
    }));
  };

  const generateRandomPassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleGeneratePassword = () => {
    if (formData.owner.generate_password) {
      const newPassword = generateRandomPassword();
      handleOwnerChange('password', newPassword);
    }
  };

  // Generate password when toggle is enabled
  // eslint-disable-next-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (formData.owner.generate_password && !formData.owner.password) {
      handleGeneratePassword();
    }
  }, [formData.owner.generate_password]);

  // Validate slug availability (temporarily disabled - endpoint not available)
  // eslint-disable-next-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Auto-validate slug format instead of checking availability
    if (formData.slug && formData.slug.length >= 3) {
      // Basic slug validation (only alphanumeric and hyphens)
      const isValidSlug = /^[a-z0-9-]+$/.test(formData.slug);
      setSlugAvailable(isValidSlug);
    } else {
      setSlugAvailable(null);
    }
  }, [formData.slug]);

  const availableFeatures = [
    'parking',
    'restaurant',
    'shop',
    'changing_rooms',
    'showers',
    'lockers',
    'wifi',
    'air_conditioning',
    'heating',
    'terrace',
    'bar',
    'kids_area'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/${locale}/root/clubmngr`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Nuevo Club
          </h1>
          <p className="text-gray-600 mt-1">
            Crear un nuevo club en el sistema
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization Selection */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Organización</h2>
          <div>
            <Label htmlFor="organization">Organización *</Label>
            <Select
              value={formData.organization_id || ''}
              onValueChange={(value) => setFormData(prev => ({ ...prev, organization_id: value }))}
            >
              <SelectTrigger id="organization">
                <SelectValue placeholder="Selecciona una organización" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id || ''}>
                    {org.trade_name} ({org.rfc})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Subscription Plan */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Plan de Suscripción</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subscription_plan">Plan de Suscripción *</Label>
              <Select
                value={formData.subscription.plan || ''}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  subscription: { ...prev.subscription, plan: value }
                }))}
              >
                <SelectTrigger id="subscription_plan">
                  <SelectValue placeholder="Selecciona un plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Básico (Gratis)</SelectItem>
                  <SelectItem value="competitions">Competencias</SelectItem>
                  <SelectItem value="finance">Finanzas</SelectItem>
                  <SelectItem value="bi">Business Intelligence</SelectItem>
                  <SelectItem value="complete">Completo</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="billing_frequency">Frecuencia de Facturación *</Label>
              <Select
                value={formData.subscription.billing_frequency || ''}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  subscription: { ...prev.subscription, billing_frequency: value }
                }))}
              >
                <SelectTrigger id="billing_frequency">
                  <SelectValue placeholder="Selecciona frecuencia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Club Configuration */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Configuración del Club</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="courts_count">Número de Canchas *</Label>
              <Input
                id="courts_count"
                type="number"
                min="1"
                max="50"
                value={formData.courts_count || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, courts_count: parseInt(e.target.value) || 1 }))}
                required
              />
              <p className="text-xs text-gray-600 mt-1">
                Número inicial de canchas para el club
              </p>
            </div>
          </div>
        </Card>

        {/* Basic Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Información Básica</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nombre del Club *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="website">Sitio Web</Label>
              <div className="relative">
                <Input
                  id="website"
                  value={formData.website.replace(/^https?:\/\//, '') || ''} // Show without protocol
                  onChange={(e) => handleWebsiteChange(e.target.value)}
                  placeholder="ejemplo: miclub.com"
                  className="pl-16"
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                  https://
                </span>
              </div>
              {formData.website && (
                <p className="text-xs text-gray-600 mt-1">
                  Vista previa: <span className="text-blue-600">{formData.website}</span>
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
        </Card>

        {/* Club Link */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Link className="h-5 w-5" />
            Link del Club
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="slug">URL del Club *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">https://app.padelyzer.com/</span>
                <Input
                  id="slug"
                  value={formData.slug || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  className={`flex-1 ${
                    slugAvailable === false ? 'border-red-500' : 
                    slugAvailable === true ? 'border-green-500' : ''
                  }`}
                  placeholder="mi-club-padel"
                  required
                />
                {checkingSlug && (
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                )}
                {!checkingSlug && slugAvailable === true && (
                  <Check className="h-5 w-5 text-green-500" />
                )}
                {!checkingSlug && slugAvailable === false && (
                  <span className="text-xs text-red-500 whitespace-nowrap">No disponible</span>
                )}
              </div>
              {formData.slug && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Link público:</strong> https://app.padelyzer.com/{formData.slug}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Club Owner */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Administrador del Club</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="owner_first_name">Nombre *</Label>
              <Input
                id="owner_first_name"
                value={formData.owner.first_name || ''}
                onChange={(e) => handleOwnerChange('first_name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="owner_last_name">Apellido *</Label>
              <Input
                id="owner_last_name"
                value={formData.owner.last_name || ''}
                onChange={(e) => handleOwnerChange('last_name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="owner_email">Email *</Label>
              <Input
                id="owner_email"
                type="email"
                value={formData.owner.email || ''}
                onChange={(e) => handleOwnerChange('email', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="owner_phone">Teléfono</Label>
              <Input
                id="owner_phone"
                value={formData.owner.phone || ''}
                onChange={(e) => handleOwnerChange('phone', e.target.value)}
              />
            </div>
            
            {/* Password Section */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <Label>Contraseña de Acceso</Label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.owner.generate_password}
                    onChange={(e) => handleOwnerChange('generate_password', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Generar automáticamente</span>
                </label>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.owner.password || ''}
                    onChange={(e) => handleOwnerChange('password', e.target.value)}
                    disabled={formData.owner.generate_password}
                    placeholder={formData.owner.generate_password ? 'Se generará automáticamente' : 'Ingresa una contraseña'}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {formData.owner.generate_password && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGeneratePassword}
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Nueva
                  </Button>
                )}
                
                {formData.owner.password && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(formData.owner.password);
                      toast.success('Contraseña copiada al portapapeles');
                    }}
                    className="flex items-center gap-1"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar
                  </Button>
                )}
              </div>
              
              {formData.owner.password && !formData.owner.generate_password && (
                <div className="mt-2">
                  <div className="text-xs space-y-1">
                    <div className={`flex items-center gap-1 ${formData.owner.password.length >= 8 ? 'text-green-600' : 'text-red-600'}`}>
                      <div className={`w-2 h-2 rounded-full ${formData.owner.password.length >= 8 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      Mínimo 8 caracteres
                    </div>
                    <div className={`flex items-center gap-1 ${/[A-Z]/.test(formData.owner.password) ? 'text-green-600' : 'text-red-600'}`}>
                      <div className={`w-2 h-2 rounded-full ${/[A-Z]/.test(formData.owner.password) ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      Al menos una mayúscula
                    </div>
                    <div className={`flex items-center gap-1 ${/[0-9]/.test(formData.owner.password) ? 'text-green-600' : 'text-red-600'}`}>
                      <div className={`w-2 h-2 rounded-full ${/[0-9]/.test(formData.owner.password) ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      Al menos un número
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Address */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Dirección</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="street">Calle *</Label>
              <Input
                id="street"
                value={formData.address.street || ''}
                onChange={(e) => handleAddressChange('street', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="number">Número</Label>
              <Input
                id="number"
                value={formData.address.number || ''}
                onChange={(e) => handleAddressChange('number', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="colony">Colonia</Label>
              <Input
                id="colony"
                value={formData.address.colony || ''}
                onChange={(e) => handleAddressChange('colony', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="city">Ciudad *</Label>
              <Input
                id="city"
                value={formData.address.city || ''}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="state">Estado *</Label>
              <Input
                id="state"
                value={formData.address.state || ''}
                onChange={(e) => handleAddressChange('state', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="postal_code">Código Postal</Label>
              <Input
                id="postal_code"
                value={formData.address.postal_code || ''}
                onChange={(e) => handleAddressChange('postal_code', e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Schedule */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Horario</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="opening_time">Hora de Apertura</Label>
              <Input
                id="opening_time"
                type="time"
                value={formData.opening_time || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, opening_time: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="closing_time">Hora de Cierre</Label>
              <Input
                id="closing_time"
                type="time"
                value={formData.closing_time || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, closing_time: e.target.value }))}
              />
            </div>
          </div>
        </Card>

        {/* Features */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Características</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {availableFeatures.map((feature) => (
              <label key={feature} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.features.includes(feature)}
                  onChange={() => toggleFeature(feature)}
                  className="rounded"
                />
                <span className="text-sm capitalize">{feature.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/${locale}/root/clubmngr`)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Creando...' : 'Crear Club'}
          </Button>
        </div>
      </form>

      {/* Success Modal */}
      {showSuccessModal && createdClubData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                ¡Club Creado Exitosamente!
              </h2>
              <p className="text-gray-600">
                El club y su administrador han sido configurados correctamente.
              </p>
            </div>

            <div className="space-y-4">
              {/* Club Info */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Información del Club</h3>
                <p className="text-sm text-blue-800">
                  <strong>Nombre:</strong> {createdClubData.club.name}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Link:</strong> {createdClubData.credentials.club_url}
                </p>
              </div>

              {/* Admin Credentials */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Credenciales del Administrador</h3>
                <p className="text-sm text-green-800">
                  <strong>Nombre:</strong> {createdClubData.owner.first_name} {createdClubData.owner.last_name}
                </p>
                <p className="text-sm text-green-800">
                  <strong>Email:</strong> {createdClubData.credentials.email}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-green-800">
                    <strong>Contraseña:</strong> {createdClubData.credentials.password}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Email: ${createdClubData.credentials.email}\nContraseña: ${createdClubData.credentials.password}\nClub: ${createdClubData.credentials.club_url}`
                      );
                      toast.success('Credenciales copiadas al portapapeles');
                    }}
                    className="text-xs"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copiar Todo
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(createdClubData.credentials.club_url);
                    toast.success('Link del club copiado');
                  }}
                  className="flex-1"
                >
                  <Link className="w-4 h-4 mr-2" />
                  Copiar Link
                </Button>
                <Button
                  onClick={() => {
                    setShowSuccessModal(false);
                    router.push(`/${locale}/root/clubmngr`);
                  }}
                  className="flex-1"
                >
                  Continuar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}