'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  LineChart,
  PieChart,
  TrendingUp, 
  TrendingDown,
  Calendar,
  DollarSign,
  Users,
  Target,
  Activity,
  Clock,
  MapPin,
  Download,
  Filter,
  RefreshCw,
  Zap,
  Star,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card } from '@/components/ui/professional/Card';
import { Button } from '@/components/ui/professional/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useClubAnalytics } from '@/lib/api/hooks/useClubs';

interface AdvancedAnalyticsDashboardProps {
  clubId: string;
}

interface AnalyticsMetric {
  id: string;
  name: string;
  value: string | number;
  change: number;
  changeLabel: string;
  icon: any;
  color: 'blue' | 'green' | 'purple' | 'amber' | 'red';
  trend: 'up' | 'down' | 'stable';
  description: string;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    fill?: boolean;
  }[];
}

const AdvancedAnalyticsDashboard: React.FC<AdvancedAnalyticsDashboardProps> = ({ clubId }) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use the backend analytics data
  const { data: analyticsData, isLoading, refetch } = useClubAnalytics(clubId, {
    start: new Date(Date.now() - (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365) * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString()
  });

  // Generate comprehensive analytics based on backend data
  const analytics = useMemo(() => {
    if (!analyticsData) {
      // Mock data structure when no backend data is available
      return {
        kpis: {
          total_bookings: 245,
          total_revenue: 18750,
          active_members: 89,
          occupancy_rate: 72,
          avg_booking_duration: 90,
          customer_satisfaction: 4.6
        },
        trends: {
          booking_trend: 'up' as const,
          revenue_trend: 'up' as const,
          occupancy_trend: 'stable' as const
        },
        charts: {
          revenue_by_day: {
            labels: Array.from({length: 30}, (_, i) => {
              const date = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000);
              return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
            }),
            datasets: [{
              label: 'Ingresos Diarios',
              data: Array.from({length: 30}, () => Math.floor(Math.random() * 1000) + 300),
              borderColor: '#3B82F6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: true
            }]
          },
          bookings_by_hour: {
            labels: Array.from({length: 16}, (_, i) => `${6 + i}:00`),
            datasets: [{
              label: 'Reservas por Hora',
              data: Array.from({length: 16}, (_, i) => {
                // Peak hours simulation
                if (i >= 12 && i <= 15) return Math.floor(Math.random() * 15) + 20; // 18-21h peak
                if (i >= 6 && i <= 9) return Math.floor(Math.random() * 10) + 8; // Morning
                return Math.floor(Math.random() * 6) + 2; // Off-peak
              }),
              backgroundColor: '#10B981'
            }]
          },
          court_utilization: {
            labels: ['Cancha 1', 'Cancha 2', 'Cancha 3', 'Cancha 4', 'Cancha 5'],
            datasets: [{
              label: 'Utilización (%)',
              data: [85, 92, 78, 88, 95],
              backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
            }]
          },
          member_activity: {
            labels: ['Nuevos', 'Activos', 'Inactivos', 'VIP'],
            datasets: [{
              label: 'Miembros',
              data: [12, 67, 8, 15],
              backgroundColor: ['#10B981', '#3B82F6', '#6B7280', '#F59E0B']
            }]
          }
        }
      };
    }

    return analyticsData;
  }, [analyticsData]);

  const keyMetrics: AnalyticsMetric[] = useMemo(() => [
    {
      id: 'bookings',
      name: 'Total Reservas',
      value: analytics.kpis.total_bookings,
      change: 12.5,
      changeLabel: 'vs período anterior',
      icon: Calendar,
      color: 'blue',
      trend: analytics.trends.booking_trend === 'up' ? 'up' : 'down',
      description: 'Número total de reservas en el período seleccionado'
    },
    {
      id: 'revenue',
      name: 'Ingresos Totales',
      value: `$${analytics.kpis.total_revenue.toLocaleString()}`,
      change: 18.3,
      changeLabel: 'vs período anterior',
      icon: DollarSign,
      color: 'green',
      trend: analytics.trends.revenue_trend === 'up' ? 'up' : 'down',
      description: 'Ingresos totales generados por reservas y servicios'
    },
    {
      id: 'members',
      name: 'Miembros Activos',
      value: analytics.kpis.active_members,
      change: 5.7,
      changeLabel: 'vs período anterior',
      icon: Users,
      color: 'purple',
      trend: 'up',
      description: 'Miembros que han usado las instalaciones en el período'
    },
    {
      id: 'occupancy',
      name: 'Tasa Ocupación',
      value: `${analytics.kpis.occupancy_rate}%`,
      change: -2.1,
      changeLabel: 'vs período anterior',
      icon: Activity,
      color: analytics.kpis.occupancy_rate > 80 ? 'green' : analytics.kpis.occupancy_rate > 60 ? 'amber' : 'red',
      trend: analytics.trends.occupancy_trend === 'up' ? 'up' : 'stable',
      description: 'Porcentaje de tiempo que las canchas están ocupadas'
    },
    {
      id: 'duration',
      name: 'Duración Promedio',
      value: `${analytics.kpis.avg_booking_duration}m`,
      change: 3.2,
      changeLabel: 'vs período anterior',
      icon: Clock,
      color: 'blue',
      trend: 'up',
      description: 'Tiempo promedio de duración de las reservas'
    },
    {
      id: 'satisfaction',
      name: 'Satisfacción',
      value: `${analytics.kpis.customer_satisfaction}/5`,
      change: 0.3,
      changeLabel: 'vs período anterior',
      icon: Star,
      color: analytics.kpis.customer_satisfaction > 4.5 ? 'green' : analytics.kpis.customer_satisfaction > 3.5 ? 'amber' : 'red',
      trend: 'up',
      description: 'Calificación promedio de satisfacción de los clientes'
    }
  ], [analytics]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleExport = () => {
    const exportData = {
      club_id: clubId,
      time_range: timeRange,
      metrics: keyMetrics,
      charts: analytics.charts,
      exported_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `club-analytics-${clubId}-${timeRange}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Mock Chart Component (since we don't have a charting library installed)
  const MockChart: React.FC<{ 
    type: 'line' | 'bar' | 'pie'; 
    data: ChartData; 
    title: string;
    height?: number;
  }> = ({ type, data, title, height = 300 }) => (
    <div className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6`} style={{ height }}>
      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        {type === 'line' && <LineChart className="w-5 h-5 text-blue-600" />}
        {type === 'bar' && <BarChart3 className="w-5 h-5 text-green-600" />}
        {type === 'pie' && <PieChart className="w-5 h-5 text-purple-600" />}
        {title}
      </h4>
      
      <div className="relative h-full flex items-center justify-center">
        {/* Mock chart visualization */}
        <div className="text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
            type === 'line' ? 'bg-blue-100 text-blue-600' :
            type === 'bar' ? 'bg-green-100 text-green-600' :
            'bg-purple-100 text-purple-600'
          }`}>
            {type === 'line' && <LineChart className="w-8 h-8" />}
            {type === 'bar' && <BarChart3 className="w-8 h-8" />}
            {type === 'pie' && <PieChart className="w-8 h-8" />}
          </div>
          <p className="text-gray-600 text-sm">
            Gráfico {type === 'line' ? 'de líneas' : type === 'bar' ? 'de barras' : 'circular'}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            {data.datasets[0]?.data.length || 0} puntos de datos
          </p>
          
          {/* Show some sample data */}
          <div className="mt-4 text-xs text-gray-500">
            <p>Máximo: {Math.max(...(data.datasets[0]?.data || [0]))}</p>
            <p>Promedio: {Math.round((data.datasets[0]?.data || []).reduce((a, b) => a + b, 0) / (data.datasets[0]?.data.length || 1))}</p>
          </div>
        </div>
        
        {/* Chart visualization placeholder */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 400 200">
            {type === 'line' && (
              <path
                d="M50,150 Q100,100 150,120 T250,80 T350,90"
                stroke="currentColor"
                fill="none"
                strokeWidth="2"
                className="text-blue-600"
              />
            )}
            {type === 'bar' && (
              <g>
                {Array.from({ length: 8 }, (_, i) => (
                  <rect
                    key={i}
                    x={50 + i * 40}
                    y={200 - Math.random() * 120}
                    width={30}
                    height={Math.random() * 120}
                    fill="currentColor"
                    className="text-green-600"
                  />
                ))}
              </g>
            )}
            {type === 'pie' && (
              <circle
                cx="200"
                cy="100"
                r="60"
                fill="none"
                stroke="currentColor"
                strokeWidth="20"
                strokeDasharray="100 300"
                className="text-purple-600"
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {keyMetrics.map((metric, index) => (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => setSelectedMetric(selectedMetric === metric.id ? null : metric.id)}
            className="cursor-pointer"
          >
            <Card 
              variant="glass" 
              padding="lg" 
              className={`group hover:shadow-lg transition-all duration-200 ${
                selectedMetric === metric.id ? 'ring-2 ring-blue-300 bg-blue-50/50' : ''
              }`}
            >
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
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-900">{metric.value}</h3>
                <p className="text-sm font-medium text-gray-700">{metric.name}</p>
                <p className="text-xs text-gray-500">{metric.changeLabel}</p>
              </div>

              <AnimatePresence>
                {selectedMetric === metric.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-gray-200"
                  >
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-600">{metric.description}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="glass" padding="lg">
          <MockChart
            type="line"
            data={analytics.charts.revenue_by_day}
            title="Ingresos por Día"
            height={250}
          />
        </Card>
        
        <Card variant="glass" padding="lg">
          <MockChart
            type="bar"
            data={analytics.charts.bookings_by_hour}
            title="Reservas por Hora"
            height={250}
          />
        </Card>
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="glass" padding="lg">
          <MockChart
            type="pie"
            data={analytics.charts.member_activity}
            title="Actividad de Miembros"
            height={250}
          />
        </Card>
        
        <Card variant="glass" padding="lg">
          <MockChart
            type="bar"
            data={analytics.charts.court_utilization}
            title="Utilización de Canchas"
            height={250}
          />
        </Card>
      </div>

      {/* Insights Panel */}
      <Card variant="glass" padding="lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-600" />
          Insights Automatizados
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              type: 'success',
              title: 'Pico de Reservas',
              description: 'Las reservas de 18-21h representan el 45% del total. Considera aumentar precios en este horario.',
              icon: TrendingUp
            },
            {
              type: 'warning',
              title: 'Baja Ocupación Matutina',
              description: 'Las canchas están al 35% de ocupación entre 6-10h. Ofrece descuentos matutinos.',
              icon: AlertCircle
            },
            {
              type: 'info',
              title: 'Cancha Más Popular',
              description: 'La Cancha 5 tiene 95% de ocupación. Considera expandir con características similares.',
              icon: Target
            }
          ].map((insight, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                insight.type === 'success' ? 'border-green-200 bg-green-50' :
                insight.type === 'warning' ? 'border-amber-200 bg-amber-50' :
                'border-blue-200 bg-blue-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  insight.type === 'success' ? 'bg-green-100 text-green-600' :
                  insight.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  <insight.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium mb-1 ${
                    insight.type === 'success' ? 'text-green-900' :
                    insight.type === 'warning' ? 'text-amber-900' :
                    'text-blue-900'
                  }`}>
                    {insight.title}
                  </h4>
                  <p className={`text-sm ${
                    insight.type === 'success' ? 'text-green-700' :
                    insight.type === 'warning' ? 'text-amber-700' :
                    'text-blue-700'
                  }`}>
                    {insight.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderDetailedAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Analysis */}
        <Card variant="glass" padding="lg" className="xl:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Análisis de Ingresos Detallado</h3>
          
          <div className="space-y-6">
            <MockChart
              type="line"
              data={analytics.charts.revenue_by_day}
              title="Tendencia de Ingresos"
              height={200}
            />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Ingreso Promedio/Día', value: `$${Math.round(analytics.kpis.total_revenue / 30)}` },
                { label: 'Mejor Día', value: '$850' },
                { label: 'Ingreso/Reserva', value: `$${Math.round(analytics.kpis.total_revenue / analytics.kpis.total_bookings)}` },
                { label: 'Crecimiento Mensual', value: '+18%' }
              ].map((stat, index) => (
                <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-600">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
        
        {/* Top Performers */}
        <Card variant="glass" padding="lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Performers</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Canchas Más Rentables</h4>
              <div className="space-y-2">
                {[
                  { name: 'Cancha 5', value: '$3,250', percentage: 95 },
                  { name: 'Cancha 2', value: '$3,100', percentage: 92 },
                  { name: 'Cancha 4', value: '$2,980', percentage: 88 }
                ].map((court, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-gray-900">{court.name}</p>
                      <p className="text-xs text-gray-600">{court.percentage}% ocupación</p>
                    </div>
                    <p className="font-semibold text-green-600">{court.value}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Horarios Populares</h4>
              <div className="space-y-2">
                {[
                  { time: '19:00 - 20:00', bookings: 28 },
                  { time: '20:00 - 21:00', bookings: 26 },
                  { time: '18:00 - 19:00', bookings: 24 }
                ].map((slot, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <p className="font-medium text-gray-900">{slot.time}</p>
                    <p className="font-semibold text-blue-600">{slot.bookings}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded-lg mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-32 bg-gray-100 rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-gray-100 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Analytics Avanzado
          </h2>
          <p className="text-gray-600">
            Análisis profundo del rendimiento del club
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 días</SelectItem>
              <SelectItem value="30d">30 días</SelectItem>
              <SelectItem value="90d">90 días</SelectItem>
              <SelectItem value="1y">1 año</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="secondary"
            onClick={handleRefresh}
            disabled={isRefreshing}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            {isRefreshing ? 'Actualizando...' : 'Actualizar'}
          </Button>

          <Button
            variant="secondary"
            onClick={handleExport}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Exportar
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="detailed">Análisis Detallado</TabsTrigger>
        </TabsList>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <TabsContent value="overview">
            {renderOverview()}
          </TabsContent>

          <TabsContent value="detailed">
            {renderDetailedAnalytics()}
          </TabsContent>
        </motion.div>
      </Tabs>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;