'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Building2,
  Save,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  Calendar,
  Users,
  Activity,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { RootService } from '@/lib/api/services/root.service';
import { Organization } from '@/lib/api/types';
import { Club } from '@/types/club';
import { toast } from '@/lib/toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExtendedClub extends Club {
  organization_name?: string;
  organization_state?: string;
  subscription_plan?: string;
  monthly_revenue?: number;
  total_reservations?: number;
  health_metrics?: {
    occupancy_rate: number;
    active_members: number;
    courts_operational: number;
    last_activity: string | null;
  };
}

export default function ClubDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clubId = params.id as string;
  const locale = params.locale as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [club, setClub] = useState<ExtendedClub | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({
    name: '',
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
    days_open: [1, 2, 3, 4, 5, 6],
    features: [] as string[],
    primary_color: '#1E88E5',
    is_active: true
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps


  useEffect(() => {
    loadClubData();
    loadOrganizations();
  }, [clubId]);

  const loadClubData = async () => {
    try {
      const clubData = await RootService.getClub(clubId);
      setClub(clubData);
      setFormData({
        name: clubData.name || '',
        description: clubData.description || '',
        email: clubData.email || '',
        phone: clubData.phone || '',
        website: clubData.website || '',
        address: clubData.address || {
          street: '',
          number: '',
          colony: '',
          city: '',
          state: '',
          postal_code: '',
          country: 'México'
        },
        opening_time: clubData.opening_time || '07:00',
        closing_time: clubData.closing_time || '23:00',
        days_open: clubData.days_open || [1, 2, 3, 4, 5, 6],
        features: clubData.features || [],
        primary_color: clubData.primary_color || '#1E88E5',
        is_active: clubData.is_active !== false
      });
    } catch (error) {
      toast.error('Error al cargar datos del club');
      router.push(`/${locale}/root/clubmngr`);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      const response = await RootService.getOrganizations({ state: 'active' });
      const orgs = Array.isArray(response) ? response : response.results;
      setOrganizations(Array.isArray(orgs) ? orgs : []);
    } catch (error) {
          }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await RootService.updateClub(clubId, {
        ...formData,
        features: formData.features.filter(f => f.length > 0)
      });
      toast.success('Club actualizado exitosamente');
      loadClubData(); // Reload to get updated data
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Error al actualizar club');
    } finally {
      setSaving(false);
    }
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
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

  const getOrgStateBadge = (state?: string) => {
    if (!state) return null;
    const styles = {
      active: 'bg-green-100 text-green-800',
      trial: 'bg-blue-100 text-blue-800',
      suspended: 'bg-orange-100 text-orange-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={styles[state as keyof typeof styles] || ''}>
        {state}
      </Badge>
    );
  };

  if (loading || !club) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Cargando información del club...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
              {club.name}
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-gray-600">
                {club.organization_name}
              </span>
              {getOrgStateBadge(club.organization_state)}
              <Badge className={club.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {club.is_active ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/${locale}/root/clubmngr/${clubId}/transfer`)}
          >
            Transferir Club
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab || ''} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general">Información General</TabsTrigger>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="activity">Actividad</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Información Básica</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nombre del Club *</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                  <Input
                    id="website"
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://..."
                  />
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
                <div>
                  <Label htmlFor="is_active">Estado</Label>
                  <Select
                    value={formData.is_active ? 'active' : 'inactive' || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, is_active: value === 'active' }))}
                  >
                    <SelectTrigger id="is_active">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
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
              <Button type="submit" disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Canchas Totales</p>
                  <p className="text-2xl font-bold">{club.total_courts || 0}</p>
                </div>
                <Building2 className="w-8 h-8 text-blue-500" />
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Miembros Activos</p>
                  <p className="text-2xl font-bold">{club.total_members || 0}</p>
                </div>
                <Users className="w-8 h-8 text-green-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ingresos Mensuales</p>
                  <p className="text-2xl font-bold">
                    ${(club.monthly_revenue || 0).toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Reservas Totales</p>
                  <p className="text-2xl font-bold">{club.total_reservations || 0}</p>
                </div>
                <Calendar className="w-8 h-8 text-orange-500" />
              </div>
            </Card>
          </div>

          {/* Health Metrics */}
          {club.health_metrics && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Indicadores de Salud</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Tasa de Ocupación</span>
                    <span className="text-sm font-semibold">
                      {club.health_metrics.occupancy_rate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${club.health_metrics.occupancy_rate}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Canchas Operativas</p>
                  <p className="text-lg font-semibold">
                    {club.health_metrics.courts_operational} / {club.total_courts || 0}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Última Actividad</p>
                  <p className="text-lg font-semibold">
                    {club.health_metrics.last_activity
                      ? format(new Date(club.health_metrics.last_activity), 'dd MMM yyyy', { locale: es })
                      : 'Sin actividad'}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Información del Sistema</h3>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">ID del Club</span>
                <span className="font-mono text-sm">{club.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Organización</span>
                <span>{club.organization_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Plan de Suscripción</span>
                <Badge>{club.subscription_plan || 'basic'}</Badge>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Creado</span>
                <span>
                  {club.created_at
                    ? format(new Date(club.created_at), 'dd/MM/yyyy HH:mm', { locale: es })
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Última Actualización</span>
                <span>
                  {club.updated_at
                    ? format(new Date(club.updated_at), 'dd/MM/yyyy HH:mm', { locale: es })
                    : 'N/A'}
                </span>
              </div>
            </div>
          </Card>

          {!club.is_active && (
            <Card className="p-6 border-orange-200 bg-orange-50">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-orange-900">Club Inactivo</h3>
                  <p className="text-sm text-orange-700 mt-1">
                    Este club está marcado como inactivo. Los usuarios no pueden hacer reservas
                    ni acceder a los servicios del club mientras esté en este estado.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}