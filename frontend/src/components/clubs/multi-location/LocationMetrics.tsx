'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown,
  Activity,
  Users,
  Target,
  DollarSign,
  Calendar,
  Clock,
  BarChart3,
  PieChart,
  Filter,
  Download
} from 'lucide-react';
import { Card } from '@/components/ui/professional/Card';
import { Button } from '@/components/ui/professional/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Location {
  id: string;
  name: string;
  totalCourts: number;
  activeCourts: number;
  totalMembers: number;
  monthlyRevenue: number;
  occupancyRate: number;
  averageRating: number;
}

interface LocationMetricsProps {
  location: Location;
  analyticsData?: any;
}

interface MetricCard {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: any;
  color: 'blue' | 'green' | 'purple' | 'amber' | 'red';
  trend: 'up' | 'down' | 'stable';
}

const LocationMetrics: React.FC<LocationMetricsProps> = ({ location, analyticsData }) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [metricType, setMetricType] = useState<'overview' | 'courts' | 'revenue' | 'members'>('overview');

  // Generate mock analytics data based on location
  const mockAnalytics = useMemo(() => ({
    overview: {
      totalBookings: Math.floor(location.totalCourts * location.occupancyRate * 0.3),
      totalRevenue: location.monthlyRevenue,
      avgBookingDuration: 90,
      peakHours: ['18:00', '19:00', '20:00'],
      utilizationRate: location.occupancyRate,
      customerSatisfaction: location.averageRating
    },
    courts: {
      courtUtilization: location.totalCourts > 0 ? 
        Array.from({ length: location.totalCourts }, (_, i) => ({
          courtId: `court-${i + 1}`,
          name: `Cancha ${i + 1}`,
          utilization: Math.max(10, location.occupancyRate + (Math.random() - 0.5) * 20),
          revenue: location.monthlyRevenue / location.totalCourts + (Math.random() - 0.5) * 1000,
          bookings: Math.floor(location.occupancyRate * 0.5 + Math.random() * 20)
        })) : [],
      maintenanceScheduled: Math.floor(Math.random() * 3),
      avgBookingLength: 85 + Math.random() * 30
    },
    revenue: {
      dailyRevenue: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: location.monthlyRevenue / 30 + (Math.random() - 0.5) * location.monthlyRevenue * 0.3
      })),
      revenueByHour: Array.from({ length: 16 }, (_, i) => ({
        hour: `${6 + i}:00`,
        amount: Math.random() * 500
      })),
      avgRevenuePerBooking: location.monthlyRevenue / Math.max(1, Math.floor(location.totalCourts * location.occupancyRate * 0.3))
    },
    members: {
      memberGrowth: Array.from({ length: 12 }, (_, i) => ({
        month: new Date(Date.now() - (11 - i) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES', { month: 'short' }),
        count: Math.max(0, location.totalMembers - 50 + i * 8 + Math.floor(Math.random() * 20))
      })),
      memberActivity: {
        active: Math.floor(location.totalMembers * 0.7),
        inactive: Math.floor(location.totalMembers * 0.2),
        new: Math.floor(location.totalMembers * 0.1)
      },
      avgVisitsPerMember: 8 + Math.random() * 4
    }
  }), [location]);

  // Calculate key metrics with trends
  const keyMetrics: MetricCard[] = useMemo(() => {
    const analytics = analyticsData || mockAnalytics;
    
    return [
      {
        title: 'Total Reservas',
        value: analytics.overview.totalBookings.toString(),
        change: 12.5,
        changeLabel: 'vs mes anterior',
        icon: Calendar,
        color: 'blue',
        trend: 'up'
      },
      {
        title: 'Ingresos Mensuales',
        value: `$${location.monthlyRevenue.toLocaleString()}`,
        change: 8.2,
        changeLabel: 'vs mes anterior',
        icon: DollarSign,
        color: 'green',
        trend: 'up'
      },
      {
        title: 'Tasa Ocupación',
        value: `${location.occupancyRate}%`,
        change: -2.1,
        changeLabel: 'vs mes anterior',
        icon: Activity,
        color: location.occupancyRate > 70 ? 'green' : location.occupancyRate > 40 ? 'amber' : 'red',
        trend: location.occupancyRate > 70 ? 'up' : 'down'
      },
      {
        title: 'Miembros Activos',
        value: analytics.members.memberActivity.active.toString(),
        change: 5.7,
        changeLabel: 'vs mes anterior',
        icon: Users,
        color: 'purple',
        trend: 'up'
      },
      {
        title: 'Satisfacción',
        value: location.averageRating > 0 ? `${location.averageRating.toFixed(1)}/5` : 'N/A',
        change: 0.3,
        changeLabel: 'vs mes anterior',
        icon: TrendingUp,
        color: location.averageRating > 4 ? 'green' : location.averageRating > 3 ? 'amber' : 'red',
        trend: 'up'
      },
      {
        title: 'Duración Promedio',
        value: `${analytics.overview.avgBookingDuration}m`,
        change: -5,
        changeLabel: 'vs mes anterior',
        icon: Clock,
        color: 'blue',
        trend: 'stable'
      }
    ];
  }, [location, analyticsData, mockAnalytics]);

  const renderOverviewMetrics = () => (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {keyMetrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card variant="glass" padding="lg" className="group hover:shadow-lg transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${
                  metric.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                  metric.color === 'green' ? 'bg-green-100 text-green-600' :
                  metric.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                  metric.color === 'amber' ? 'bg-amber-100 text-amber-600' :
                  'bg-red-100 text-red-600'
                } group-hover:scale-110 transition-transform`}>
                  <metric.icon className="w-5 h-5" />
                </div>
                
                <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                  metric.trend === 'up' ? 'bg-green-100 text-green-700' :
                  metric.trend === 'down' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {metric.trend === 'up' ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : metric.trend === 'down' ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : (
                    <Activity className="w-3 h-3" />
                  )}
                  {metric.change > 0 ? '+' : ''}{metric.change}%
                </div>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-gray-900">{metric.value}</h3>
                <p className="text-sm font-medium text-gray-700">{metric.title}</p>
                <p className="text-xs text-gray-500">{metric.changeLabel}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Peak Hours */}
      <Card variant="glass" padding="lg">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Horarios de Mayor Actividad
        </h4>
        <div className="flex flex-wrap gap-2">
          {mockAnalytics.overview.peakHours.map((hour) => (
            <div
              key={hour}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
            >
              {hour}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderCourtsMetrics = () => (
    <div className="space-y-6">
      <Card variant="glass" padding="lg">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-green-600" />
          Utilización por Cancha
        </h4>
        
        {mockAnalytics.courts.courtUtilization.length > 0 ? (
          <div className="space-y-3">
            {mockAnalytics.courts.courtUtilization.map((court: any, index: number) => (
              <div key={court.courtId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                  <span className="font-medium text-gray-900">{court.name}</span>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">{Math.round(court.utilization)}%</p>
                    <p className="text-xs text-gray-600">Utilización</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">${Math.round(court.revenue).toLocaleString()}</p>
                    <p className="text-xs text-gray-600">Ingresos</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">{court.bookings}</p>
                    <p className="text-xs text-gray-600">Reservas</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No hay datos de canchas disponibles</p>
          </div>
        )}
      </Card>
    </div>
  );

  const renderRevenueMetrics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="glass" padding="lg">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            Ingresos por Hora
          </h4>
          
          <div className="space-y-2">
            {mockAnalytics.revenue.revenueByHour
              .sort((a: any, b: any) => b.amount - a.amount)
              .slice(0, 5)
              .map((hourData: any, index: number) => (
                <div key={hourData.hour} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm font-medium">{hourData.hour}</span>
                  <span className="text-sm text-green-600 font-semibold">
                    ${Math.round(hourData.amount).toLocaleString()}
                  </span>
                </div>
              ))
            }
          </div>
        </Card>

        <Card variant="glass" padding="lg">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            Métricas de Ingresos
          </h4>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Ingreso por Reserva</span>
              <span className="font-semibold text-gray-900">
                ${Math.round(mockAnalytics.revenue.avgRevenuePerBooking).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Ingreso por Cancha/Día</span>
              <span className="font-semibold text-gray-900">
                ${Math.round(location.monthlyRevenue / location.totalCourts / 30).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Ingreso por Miembro/Mes</span>
              <span className="font-semibold text-gray-900">
                ${Math.round(location.monthlyRevenue / Math.max(1, location.totalMembers)).toLocaleString()}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderMembersMetrics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="glass" padding="lg">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Estado de Miembros
          </h4>
          
          <div className="space-y-4">
            {Object.entries(mockAnalytics.members.memberActivity).map(([status, count]: [string, any]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    status === 'active' ? 'bg-green-500' :
                    status === 'inactive' ? 'bg-gray-400' :
                    'bg-blue-500'
                  }`} />
                  <span className="capitalize text-gray-700">{
                    status === 'active' ? 'Activos' :
                    status === 'inactive' ? 'Inactivos' :
                    'Nuevos'
                  }</span>
                </div>
                <span className="font-semibold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card variant="glass" padding="lg">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-600" />
            Actividad de Miembros
          </h4>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Visitas Promedio/Mes</span>
              <span className="font-semibold text-gray-900">
                {mockAnalytics.members.avgVisitsPerMember.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Tasa de Retención</span>
              <span className="font-semibold text-gray-900 text-green-600">
                {Math.round((mockAnalytics.members.memberActivity.active / location.totalMembers) * 100)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Miembros Nuevos/Mes</span>
              <span className="font-semibold text-gray-900">
                {mockAnalytics.members.memberActivity.new}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">
          Métricas - {location.name}
        </h3>
        
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 días</SelectItem>
              <SelectItem value="30d">30 días</SelectItem>
              <SelectItem value="90d">90 días</SelectItem>
            </SelectContent>
          </Select>

          <Select value={metricType} onValueChange={(value: any) => setMetricType(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">General</SelectItem>
              <SelectItem value="courts">Canchas</SelectItem>
              <SelectItem value="revenue">Ingresos</SelectItem>
              <SelectItem value="members">Miembros</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => {
              console.log('Exporting metrics for location:', location.id);
            }}
          >
            Exportar
          </Button>
        </div>
      </div>

      {/* Metrics Content */}
      <motion.div
        key={metricType}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {metricType === 'overview' && renderOverviewMetrics()}
        {metricType === 'courts' && renderCourtsMetrics()}
        {metricType === 'revenue' && renderRevenueMetrics()}
        {metricType === 'members' && renderMembersMetrics()}
      </motion.div>
    </div>
  );
};

export default LocationMetrics;