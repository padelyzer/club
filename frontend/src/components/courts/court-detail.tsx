'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  MapPin,
  Users,
  Zap,
  Thermometer,
  Wind,
  Calendar,
  Clock,
  DollarSign,
  Activity,
  Settings,
  Edit,
  Wrench,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { LoadingState } from '@/components/ui/states/loading-state';
import { ErrorState } from '@/components/ui/states/error-state';

import { CourtsService } from '@/lib/api/services/courts.service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CourtDetailProps {
  courtId: number;
  onClose: () => void;
}

export const CourtDetail = ({ courtId, onClose }: CourtDetailProps) => {
  const [activeTab, setActiveTab] = useState('overview');

  const {
    data: court,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['court-detail', courtId],
    queryFn: () => CourtsService.getCourt(courtId),
    enabled: !!courtId,
  });

  const { data: occupancyStats } = useQuery({
    queryKey: ['court-occupancy', courtId],
    queryFn: () =>
      CourtsService.getOccupancyStats(courtId, {
        date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        date_to: new Date().toISOString().split('T')[0],
        group_by: 'day',
      }),
    enabled: !!courtId,
  });

  if (isLoading)
    return <LoadingState message="Cargando detalles de la cancha..." fullScreen={false} />;
  if (error) return <ErrorState message="Error al cargar los detalles" />;
  if (!court) return <ErrorState message="Cancha no encontrada" />;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent':
        return 'text-green-600';
      case 'good':
        return 'text-blue-600';
      case 'fair':
        return 'text-yellow-600';
      case 'poor':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getConditionText = (condition: string) => {
    switch (condition) {
      case 'excellent':
        return 'Excelente';
      case 'good':
        return 'Bueno';
      case 'fair':
        return 'Regular';
      case 'poor':
        return 'Malo';
      default:
        return condition;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold">{court.name}</h2>
            <Badge className={getStatusColor(court.status)}>
              {court.status === 'active'
                ? 'Activa'
                : court.status === 'inactive'
                  ? 'Inactiva'
                  : 'Mantenimiento'}
            </Badge>
            <Badge variant="outline">{court.type.toUpperCase()}</Badge>
          </div>
          <p className="text-gray-600">{court.club_name}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Configurar
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ocupación (30d)</p>
              <p className="text-xl font-bold">
                {occupancyStats
                  ? `${occupancyStats.occupancy_rate.toFixed(1)}%`
                  : '-'}
              </p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ingresos (30d)</p>
              <p className="text-xl font-bold">
                $
                {occupancyStats ? occupancyStats.revenue.toLocaleString() : '-'}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Reservas (30d)</p>
              <p className="text-xl font-bold">
                {occupancyStats ? occupancyStats.bookings_count : '-'}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-purple-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Precio/Hora</p>
              <p className="text-xl font-bold">
                ${court.current_pricing?.price_per_hour || '-'}
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab || ''} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">General</TabsTrigger>
          <TabsTrigger value="schedule">Horarios</TabsTrigger>
          <TabsTrigger value="maintenance">Mantenimiento</TabsTrigger>
          <TabsTrigger value="analytics">Análisis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Información Básica
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Número:</span>
                  <span className="font-medium">{String(court.number)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="font-medium capitalize">{court.type}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Superficie:</span>
                  <span className="font-medium">{court.surface_type}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Ubicación:</span>
                  <span className="font-medium">
                    {court.indoor ? 'Interior' : 'Exterior'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Máx. Jugadores:</span>
                  <span className="font-medium">{court.max_players}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Dimensiones:</span>
                  <span className="font-medium">
                    {court.dimensions.length} × {court.dimensions.width} m
                    {court.dimensions.height &&
                      ` × ${court.dimensions.height} m`}
                  </span>
                </div>
              </div>

              {court.description && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-medium mb-2">Descripción</h4>
                  <p className="text-sm text-gray-600">{court.description}</p>
                </div>
              )}
            </Card>

            {/* Features and Amenities */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Características
              </h3>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Servicios</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center gap-2">
                      <Zap
                        className={`w-4 h-4 ${court.has_lighting ? 'text-green-500' : 'text-gray-400'}`}
                      />
                      <span
                        className={
                          court.has_lighting
                            ? 'text-green-600'
                            : 'text-gray-500'
                        }
                      >
                        Iluminación
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Thermometer
                        className={`w-4 h-4 ${court.has_heating ? 'text-orange-500' : 'text-gray-400'}`}
                      />
                      <span
                        className={
                          court.has_heating
                            ? 'text-orange-600'
                            : 'text-gray-500'
                        }
                      >
                        Calefacción
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Wind
                        className={`w-4 h-4 ${court.has_air_conditioning ? 'text-blue-500' : 'text-gray-400'}`}
                      />
                      <span
                        className={
                          court.has_air_conditioning
                            ? 'text-blue-600'
                            : 'text-gray-500'
                        }
                      >
                        Aire Acondicionado
                      </span>
                    </div>
                  </div>
                </div>

                {court.facilities && court.facilities.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Instalaciones</h4>
                    <div className="flex flex-wrap gap-2">
                      {court.facilities.map((facility: any, index: any) => (
                        <Badge key={index} variant="outline">
                          {facility}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Equipment */}
            {court.equipment && court.equipment.length > 0 && (
              <Card className="p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Equipamiento
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {court.equipment.map((item: any, index: any) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          Cantidad: {item.quantity}
                        </p>
                      </div>
                      <Badge className={getConditionColor(item.condition)}>
                        {getConditionText(item.condition)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Horarios de Operación
            </h3>

            {court.operating_hours && (
              <div className="space-y-3">
                {Object.entries(court.operating_hours).map(([day, hours]) => (
                  <div
                    key={day}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                  >
                    <span className="font-medium capitalize">{day}</span>
                    <span
                      className={
                        hours.closed ? 'text-red-500' : 'text-gray-600'
                      }
                    >
                      {hours.closed
                        ? 'Cerrado'
                        : `${hours.start} - ${hours.end}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Peak Hours */}
          {occupancyStats && occupancyStats.peak_hours && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Horas Pico
              </h3>

              <div className="space-y-3">
                {occupancyStats.peak_hours.map((hour: any, index: any) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">
                      {hour.hour}:00 - {hour.hour + 1}:00
                    </span>
                    <div className="flex items-center gap-2">
                      <Progress value={hour.occupancy_rate || ''} className="w-24" />
                      <span className="text-sm text-gray-600">
                        {hour.occupancy_rate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Historial de Mantenimiento
              </h3>
              <Button size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                Programar Mantenimiento
              </Button>
            </div>

            <div className="space-y-3">
              {court.last_maintenance_date && (
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Último Mantenimiento</p>
                    <p className="text-sm text-gray-600">
                      {format(
                        new Date(court.last_maintenance_date),
                        "d 'de' MMMM 'de' yyyy",
                        { locale: es }
                      )}
                    </p>
                  </div>
                  <Badge variant="outline">Completado</Badge>
                </div>
              )}

              {court.next_maintenance_date && (
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium">Próximo Mantenimiento</p>
                    <p className="text-sm text-gray-600">
                      {format(
                        new Date(court.next_maintenance_date),
                        "d 'de' MMMM 'de' yyyy",
                        { locale: es }
                      )}
                    </p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">
                    Programado
                  </Badge>
                </div>
              )}

              {court.maintenance_notes && (
                <div className="p-3 border border-gray-200 rounded-lg">
                  <h4 className="font-medium mb-2">Notas de Mantenimiento</h4>
                  <p className="text-sm text-gray-600">
                    {court.maintenance_notes}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Análisis de Rendimiento
            </h3>

            {occupancyStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Resumen Últimos 30 Días</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Horas Totales:</span>
                      <span className="font-medium">
                        {occupancyStats.total_hours}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Horas Ocupadas:</span>
                      <span className="font-medium">
                        {occupancyStats.occupied_hours}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tasa de Ocupación:</span>
                      <span className="font-medium text-blue-600">
                        {occupancyStats.occupancy_rate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ingresos:</span>
                      <span className="font-medium text-green-600">
                        ${occupancyStats.revenue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Tendencias</h4>
                  <div className="space-y-3">
                    {occupancyStats.by_period.slice(-7).map((period: any, index: any) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm">{period.period}</span>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={period.occupancy_rate || ''}
                            className="w-20"
                          />
                          <span className="text-sm text-gray-600">
                            {period.occupancy_rate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
