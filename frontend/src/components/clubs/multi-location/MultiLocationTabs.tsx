'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  MapPin, 
  Users, 
  Target, 
  TrendingUp,
  Settings,
  Plus,
  ExternalLink,
  Crown,
  Star,
  Activity
} from 'lucide-react';
import { Card } from '@/components/ui/professional/Card';
import { Button } from '@/components/ui/professional/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClubLocations, useClubAnalytics } from '@/lib/api/hooks/useClubs';
import { MapView } from './MapView';
import { LocationMetrics } from './LocationMetrics';
import { LocationConfiguration } from './LocationConfiguration';

interface MultiLocationTabsProps {
  clubId: string;
  onLocationSelect?: (locationId: string) => void;
  onLocationCreate?: () => void;
  onLocationEdit?: (locationId: string) => void;
}

interface ClubLocation {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  isMainLocation: boolean;
  status: 'active' | 'inactive' | 'maintenance';
  totalCourts: number;
  activeCourts: number;
  totalMembers: number;
  monthlyRevenue: number;
  occupancyRate: number;
  averageRating: number;
  phone?: string;
  email?: string;
  manager?: string;
  operatingHours: {
    open: string;
    close: string;
  };
}

const MultiLocationTabs: React.FC<MultiLocationTabsProps> = ({
  clubId,
  onLocationSelect,
  onLocationCreate,
  onLocationEdit
}) => {
  const [activeLocationId, setActiveLocationId] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<string>('overview');
  
  const { data: locationsData, isLoading: locationsLoading } = useClubLocations(clubId);
  const { data: analyticsData } = useClubAnalytics(clubId);

  // Transform the backend data into the expected format
  const locations: ClubLocation[] = useMemo(() => {
    if (!locationsData || !Array.isArray(locationsData)) return [];
    
    return locationsData.map((loc: any) => ({
      id: loc.id || loc.location_id || Math.random().toString(),
      name: loc.name || loc.location_name || 'Ubicación Sin Nombre',
      address: loc.full_address || loc.address || 'Dirección no disponible',
      latitude: loc.latitude,
      longitude: loc.longitude,
      isMainLocation: loc.is_main_location || false,
      status: loc.status || 'active',
      totalCourts: loc.total_courts || 0,
      activeCourts: loc.active_courts || loc.total_courts || 0,
      totalMembers: loc.total_members || 0,
      monthlyRevenue: loc.monthly_revenue || 0,
      occupancyRate: loc.occupancy_rate || 0,
      averageRating: loc.average_rating || 0,
      phone: loc.phone,
      email: loc.email,
      manager: loc.manager,
      operatingHours: {
        open: loc.operating_hours?.open || '06:00',
        close: loc.operating_hours?.close || '22:00'
      }
    }));
  }, [locationsData]);

  // Set default active location to main location
  useEffect(() => {
    if (locations.length > 0 && !activeLocationId) {
      const mainLocation = locations.find(loc => loc.isMainLocation) || locations[0];
      setActiveLocationId(mainLocation.id);
    }
  }, [locations, activeLocationId]);

  const activeLocation = locations.find(loc => loc.id === activeLocationId);

  // Calculate totals across all locations
  const totals = useMemo(() => {
    return locations.reduce((acc, location) => ({
      totalCourts: acc.totalCourts + location.totalCourts,
      totalMembers: acc.totalMembers + location.totalMembers,
      totalRevenue: acc.totalRevenue + location.monthlyRevenue,
      averageOccupancy: locations.length > 0 
        ? locations.reduce((sum, loc) => sum + loc.occupancyRate, 0) / locations.length 
        : 0
    }), {
      totalCourts: 0,
      totalMembers: 0,
      totalRevenue: 0,
      averageOccupancy: 0
    });
  }, [locations]);

  const handleLocationSelect = (locationId: string) => {
    setActiveLocationId(locationId);
    onLocationSelect?.(locationId);
  };

  if (locationsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded-lg mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-100 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (locations.length <= 1) {
    return (
      <Card variant="glass" padding="lg" className="text-center">
        <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {locations.length === 0 ? 'Sin Ubicaciones' : 'Ubicación Única'}
        </h3>
        <p className="text-gray-600 mb-6">
          {locations.length === 0 
            ? 'Este club no tiene ubicaciones configuradas.'
            : 'Este club tiene una sola ubicación. Las funciones multi-ubicación se activarán cuando agregues más sedes.'
          }
        </p>
        {onLocationCreate && (
          <Button
            onClick={onLocationCreate}
            leftIcon={<Plus className="w-4 h-4" />}
            variant="primary"
          >
            Agregar Nueva Ubicación
          </Button>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with totals */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              Multi-Ubicación Dashboard
            </h2>
            <p className="text-gray-600">
              Gestiona {locations.length} ubicaciones desde un panel unificado
            </p>
          </div>
          
          {onLocationCreate && (
            <Button
              onClick={onLocationCreate}
              leftIcon={<Plus className="w-4 h-4" />}
              variant="primary"
            >
              Nueva Ubicación
            </Button>
          )}
        </div>

        {/* Totals Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              title: 'Total Ubicaciones',
              value: locations.length.toString(),
              icon: Building2,
              color: 'blue'
            },
            {
              title: 'Total Canchas',
              value: totals.totalCourts.toString(),
              icon: Target,
              color: 'green'
            },
            {
              title: 'Total Miembros',
              value: totals.totalMembers.toLocaleString(),
              icon: Users,
              color: 'purple'
            },
            {
              title: 'Ocupación Media',
              value: `${Math.round(totals.averageOccupancy)}%`,
              icon: TrendingUp,
              color: 'amber'
            }
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card variant="glass" padding="default" className="text-center">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-2 ${
                  stat.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                  stat.color === 'green' ? 'bg-green-100 text-green-600' :
                  stat.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                  'bg-amber-100 text-amber-600'
                }`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-600">{stat.title}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Location Selector Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-xl">
        {locations.map((location) => (
          <button
            key={location.id}
            onClick={() => handleLocationSelect(location.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
              ${activeLocationId === location.id 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
          >
            {location.isMainLocation && (
              <Crown className="w-4 h-4 text-amber-500" />
            )}
            <MapPin className="w-4 h-4" />
            <span className="truncate max-w-32">{location.name}</span>
            <div className={`w-2 h-2 rounded-full ${
              location.status === 'active' ? 'bg-green-400' :
              location.status === 'maintenance' ? 'bg-amber-400' :
              'bg-gray-400'
            }`} />
          </button>
        ))}
      </div>

      {/* Main Content Tabs */}
      {activeLocation && (
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Vista General</TabsTrigger>
            <TabsTrigger value="map">Mapa</TabsTrigger>
            <TabsTrigger value="analytics">Métricas</TabsTrigger>
            <TabsTrigger value="config">Configuración</TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <TabsContent value="overview" className="space-y-6">
                {/* Location Overview */}
                <Card variant="glass" padding="lg">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                          {activeLocation.name}
                          {activeLocation.isMainLocation && (
                            <Crown className="w-5 h-5 text-amber-500" title="Ubicación Principal" />
                          )}
                        </h3>
                        <p className="text-gray-600">{activeLocation.address}</p>
                        <p className="text-sm text-gray-500">
                          {activeLocation.operatingHours.open} - {activeLocation.operatingHours.close}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        activeLocation.status === 'active' ? 'bg-green-100 text-green-700' :
                        activeLocation.status === 'maintenance' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {activeLocation.status === 'active' ? 'Activa' :
                         activeLocation.status === 'maintenance' ? 'Mantenimiento' :
                         'Inactiva'}
                      </div>
                      {onLocationEdit && (
                        <Button
                          onClick={() => onLocationEdit(activeLocation.id)}
                          variant="secondary"
                          size="sm"
                          leftIcon={<Settings className="w-4 h-4" />}
                        >
                          Editar
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Location Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      {
                        label: 'Canchas Activas',
                        value: `${activeLocation.activeCourts}/${activeLocation.totalCourts}`,
                        icon: Target,
                        trend: activeLocation.activeCourts === activeLocation.totalCourts ? 'good' : 'warning'
                      },
                      {
                        label: 'Miembros',
                        value: activeLocation.totalMembers.toLocaleString(),
                        icon: Users,
                        trend: 'neutral'
                      },
                      {
                        label: 'Ocupación',
                        value: `${activeLocation.occupancyRate}%`,
                        icon: Activity,
                        trend: activeLocation.occupancyRate > 70 ? 'good' : 
                               activeLocation.occupancyRate > 40 ? 'neutral' : 'poor'
                      },
                      {
                        label: 'Rating',
                        value: activeLocation.averageRating > 0 ? 
                               `${activeLocation.averageRating.toFixed(1)}⭐` : 'N/A',
                        icon: Star,
                        trend: activeLocation.averageRating > 4 ? 'good' : 
                               activeLocation.averageRating > 3 ? 'neutral' : 'poor'
                      }
                    ].map((stat, index) => (
                      <div key={stat.label} className="text-center">
                        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-2 ${
                          stat.trend === 'good' ? 'bg-green-100 text-green-600' :
                          stat.trend === 'warning' ? 'bg-amber-100 text-amber-600' :
                          stat.trend === 'poor' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          <stat.icon className="w-5 h-5" />
                        </div>
                        <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-gray-600">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Contact Info */}
                  {(activeLocation.manager || activeLocation.phone || activeLocation.email) && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3">Información de Contacto</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {activeLocation.manager && (
                          <div>
                            <p className="text-gray-600">Manager</p>
                            <p className="font-medium">{activeLocation.manager}</p>
                          </div>
                        )}
                        {activeLocation.phone && (
                          <div>
                            <p className="text-gray-600">Teléfono</p>
                            <p className="font-medium">{activeLocation.phone}</p>
                          </div>
                        )}
                        {activeLocation.email && (
                          <div>
                            <p className="text-gray-600">Email</p>
                            <p className="font-medium">{activeLocation.email}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="map">
                <MapView 
                  locations={locations}
                  activeLocationId={activeLocationId}
                  onLocationSelect={handleLocationSelect}
                />
              </TabsContent>

              <TabsContent value="analytics">
                <LocationMetrics 
                  location={activeLocation}
                  analyticsData={analyticsData}
                />
              </TabsContent>

              <TabsContent value="config">
                <LocationConfiguration 
                  location={activeLocation}
                  onSave={(data) => {
                    console.log('Saving location config:', data);
                  }}
                />
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      )}
    </div>
  );
};

export default MultiLocationTabs;