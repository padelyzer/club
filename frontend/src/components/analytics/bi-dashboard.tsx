'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/ui/states/loading-state';
import { ErrorState } from '@/components/ui/states/error-state';
import { useEnhancedRealTimeAnalytics } from '@/hooks/useEnhancedRealTimeAnalytics';
import { useAnalyticsExport } from '@/hooks/useAnalyticsExport';
import { RealtimeStatus, LiveMetricsIndicator } from './realtime-status';
import { ExportDialog } from './export-dialog';
import { ExportButtonCompact } from './export-button';
import { CalendarDays, TrendingUp, Users, DollarSign, Activity, RefreshCw, Download, AlertCircle, Wifi, WifiOff, Clock } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface BIDashboardProps {
  kpis: any;
  revenue: any;
  usage: any;
  growth: any;
  isLoading: boolean;
  error?: string | null;
  onRefresh: () => void;
  userRole?: string;
  activeClub?: any;
}

/**
 * BI Dashboard Component
 * Modular component for displaying business intelligence analytics
 * Connects to the new backend BI API endpoints
 */
export function BIDashboard({
  kpis,
  revenue,
  usage,
  growth,
  isLoading,
  error,
  onRefresh,
  userRole,
  activeClub
}: BIDashboardProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  
  // Enhanced real-time analytics capabilities
  const realtime = useEnhancedRealTimeAnalytics({
    enabled: true,
    useWebSocket: true,
    usePolling: true,
    pollingInterval: 300000, // 5 minutes
    wsChannels: ['bi_kpis', 'bi_revenue', 'bi_usage', 'bi_growth'],
  });

  // Export functionality
  const exportHook = useAnalyticsExport();

  const renderKPICard = (title: string, value: string | number, icon: React.ReactNode, trend?: { value: number; isPositive: boolean }) => (
    <Card className="bg-white hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {trend && (
                <Badge variant={trend.isPositive ? 'default' : 'destructive'} className="text-xs">
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </Badge>
              )}
            </div>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderRevenueChart = () => {
    if (!revenue?.data || revenue.data.length === 0) {
      return (
        <Card className="bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                {t('analytics.revenueOverTime')}
              </CardTitle>
              <LiveMetricsIndicator 
                isLive={realtime.isConnected}
                lastUpdate={revenue?.lastUpdate}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>{t('analytics.noDataAvailable')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    const chartData = revenue.data.map((item: any) => ({
      date: new Date(item.date || item.period).toLocaleDateString(),
      revenue: item.total || item.amount || item.value || 0,
      previousRevenue: item.previous_total || item.previous_amount || 0
    }));

    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              {t('analytics.revenueOverTime')}
            </div>
            <div className="flex items-center gap-2">
              <LiveMetricsIndicator 
                isLive={realtime.isConnected}
                lastUpdate={revenue?.lastUpdate}
              />
              <Badge variant="outline" className="text-xs">
                €{revenue.total?.toLocaleString() || 0} {t('common.total')}
              </Badge>
              <ExportButtonCompact 
                type="revenue"
                onCustomExportClick={() => setExportDialogOpen(true)}
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `€${value}`} />
              <Tooltip 
                formatter={(value, name) => [`€${Number(value).toLocaleString()}`, name === 'revenue' ? 'Revenue' : 'Previous']}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
              {chartData.some((item: any) => item.previousRevenue > 0) && (
                <Area type="monotone" dataKey="previousRevenue" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.05} strokeDasharray="5 5" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderUsageChart = () => {
    if (!usage?.occupancy_by_hour && !usage?.hourly_occupancy) {
      return (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              {t('analytics.occupancyByHour')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>{t('analytics.noDataAvailable')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    const hourlyData = usage.occupancy_by_hour || usage.hourly_occupancy || {};
    const chartData = Object.entries(hourlyData).map(([hour, value]: [string, any]) => ({
      hour: `${hour}:00`,
      occupancy: typeof value === 'number' ? value : value.percentage || 0
    }));

    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              {t('analytics.occupancyByHour')}
            </div>
            <Badge variant="outline" className="text-xs">
              {usage.avg_occupancy || 0}% {t('analytics.average')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="hour" />
              <YAxis tickFormatter={(value) => `${value}%`} />
              <Tooltip 
                formatter={(value) => [`${value}%`, 'Occupancy']}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Bar 
                dataKey="occupancy" 
                fill="#10b981" 
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderGrowthMetrics = () => {
    if (!growth) {
      return (
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-32 text-gray-500">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>{t('analytics.noGrowthDataAvailable')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {growth.revenue && renderKPICard(
          t('analytics.revenueGrowth'),
          `${growth.revenue.growth_percentage || 0}%`,
          <TrendingUp className="h-6 w-6 text-blue-500" />,
          { value: growth.revenue.growth_percentage || 0, isPositive: (growth.revenue.growth_percentage || 0) >= 0 }
        )}
        {growth.users && renderKPICard(
          t('analytics.userGrowth'),
          `${growth.users.growth_percentage || 0}%`,
          <Users className="h-6 w-6 text-purple-500" />,
          { value: growth.users.growth_percentage || 0, isPositive: (growth.users.growth_percentage || 0) >= 0 }
        )}
        {growth.bookings && renderKPICard(
          t('analytics.bookingsGrowth'),
          `${growth.bookings.growth_percentage || 0}%`,
          <CalendarDays className="h-6 w-6 text-orange-500" />,
          { value: growth.bookings.growth_percentage || 0, isPositive: (growth.bookings.growth_percentage || 0) >= 0 }
        )}
        {(growth.all || growth.overall) && renderKPICard(
          t('analytics.overallGrowth'),
          `${(growth.all?.growth_percentage || growth.overall?.growth_percentage || 0)}%`,
          <Activity className="h-6 w-6 text-green-500" />,
          { 
            value: growth.all?.growth_percentage || growth.overall?.growth_percentage || 0, 
            isPositive: (growth.all?.growth_percentage || growth.overall?.growth_percentage || 0) >= 0 
          }
        )}
      </div>
    );
  };

  if (error && !kpis) {
    return (
      <ErrorState 
        message={error} 
        onRetry={onRefresh}
        title={t('analytics.errorLoadingDashboard')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {t('analytics.biDashboard')}
            </h1>
            <p className="text-gray-600 mt-1">
              {userRole === 'ROOT' 
                ? t('analytics.organizationWideAnalytics') 
                : activeClub 
                  ? `${activeClub.name} - ${t('analytics.clubAnalytics')}`
                  : t('analytics.clubAnalytics')
              }
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Real-time Status */}
            <RealtimeStatus 
              compact={true}
              showControls={false}
              className="px-3 py-1 bg-gray-50 rounded-lg"
            />
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => realtime.forceRefresh()}
                disabled={isLoading || realtime.polling?.refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${(isLoading || realtime.polling?.refreshing) ? 'animate-spin' : ''}`} />
                {t('common.refresh')}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setExportDialogOpen(true)}
                disabled={exportHook.isExporting}
              >
                {exportHook.isExporting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {exportHook.isExporting ? t('analytics.export.exporting') : t('common.export')}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Real-time status indicator */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            {connectionStatus === 'connected' && (
              <>
                <Wifi className="h-3 w-3 text-green-500" />
                <span className="text-green-600">{t('analytics.connected')}</span>
              </>
            )}
            {connectionStatus === 'refreshing' && (
              <>
                <RefreshCw className="h-3 w-3 text-blue-500 animate-spin" />
                <span className="text-blue-600">{t('analytics.refreshing')}</span>
              </>
            )}
            {connectionStatus === 'error' && (
              <>
                <WifiOff className="h-3 w-3 text-red-500" />
                <span className="text-red-600">{t('analytics.connectionError')}</span>
              </>
            )}
            {connectionStatus === 'stale' && (
              <>
                <Clock className="h-3 w-3 text-yellow-500" />
                <span className="text-yellow-600">{t('analytics.dataStale')}</span>
              </>
            )}
          </div>
          <span className="text-gray-500">
            {t('analytics.lastUpdate')}: {formattedUpdateTime}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={isAutoRefreshEnabled ? stopAutoRefresh : startAutoRefresh}
          >
            {isAutoRefreshEnabled ? t('analytics.pauseAutoRefresh') : t('analytics.enableAutoRefresh')}
          </Button>
        </div>
      </div>

      {/* KPIs Overview */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderKPICard(
            t('analytics.totalRevenue'),
            `€${kpis.total_revenue?.toLocaleString() || 0}`,
            <DollarSign className="h-6 w-6 text-blue-500" />
          )}
          {renderKPICard(
            t('analytics.totalBookings'),
            kpis.total_bookings?.toLocaleString() || 0,
            <CalendarDays className="h-6 w-6 text-green-500" />
          )}
          {renderKPICard(
            t('analytics.activeUsers'),
            kpis.active_users?.toLocaleString() || 0,
            <Users className="h-6 w-6 text-purple-500" />
          )}
          {renderKPICard(
            t('analytics.avgOccupancy'),
            `${kpis.avg_occupancy || 0}%`,
            <Activity className="h-6 w-6 text-orange-500" />
          )}
        </div>
      )}

      {/* Loading overlay for refreshing */}
      {isLoading && kpis && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <LoadingState message={t('analytics.refreshingData')} />
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white p-1 shadow-sm border border-gray-100">
          <TabsTrigger value="overview" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            {t('analytics.overview')}
          </TabsTrigger>
          <TabsTrigger value="revenue" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            {t('analytics.revenue')}
          </TabsTrigger>
          <TabsTrigger value="usage" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            {t('analytics.usage')}
          </TabsTrigger>
          <TabsTrigger value="growth" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            {t('analytics.growth')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderRevenueChart()}
            {renderUsageChart()}
          </div>
          {renderGrowthMetrics()}
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          {renderRevenueChart()}
          {revenue?.breakdown && (
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>{t('analytics.revenueBreakdown')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(revenue.breakdown).map(([key, value]: [string, any]) => (
                    <div key={key} className="text-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <p className="text-sm text-gray-600 capitalize">{key.replace('_', ' ')}</p>
                      <p className="text-xl font-bold text-gray-900">€{Number(value)?.toLocaleString() || 0}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          {renderUsageChart()}
          {usage && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>{t('analytics.occupancyMetrics')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">{t('analytics.avgOccupancy')}</span>
                      <span className="font-semibold text-lg">{usage.avg_occupancy || 0}%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">{t('analytics.peakHours')}</span>
                      <span className="font-semibold">
                        {usage.peak_hours?.join(', ') || t('common.noData')}
                      </span>
                    </div>
                    {usage.total_hours && (
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">{t('analytics.totalHours')}</span>
                        <span className="font-semibold">{usage.total_hours}h</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="growth" className="space-y-6">
          {renderGrowthMetrics()}
          {growth && (
            <Card className="bg-white">
              <CardHeader>
                <CardTitle>{t('analytics.growthAnalysis')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(growth).map(([metric, data]: [string, any]) => {
                    if (!data || typeof data !== 'object') return null;
                    
                    return (
                      <div key={metric} className="border-b border-gray-100 pb-4 last:border-b-0">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 capitalize font-medium">
                            {metric.replace('_', ' ')} {t('analytics.growth')}
                          </span>
                          <div className="text-right">
                            <span className={`font-semibold text-lg ${
                              (data.growth_percentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {data.growth_percentage >= 0 ? '+' : ''}{data.growth_percentage || 0}%
                            </span>
                            <p className="text-sm text-gray-500">
                              {data.current_value || 0} vs {data.previous_value || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        availableSections={['kpis', 'revenue', 'usage', 'growth']}
        defaultFormat="pdf"
        defaultSections={['kpis']}
      />
    </div>
  );
}