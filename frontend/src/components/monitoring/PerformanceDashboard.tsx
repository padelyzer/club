'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PieChart, Pie, Cell
} from 'recharts';
import { 
  Activity, AlertTriangle, CheckCircle, Clock, 
  Database, Gauge, TrendingUp, Users, Zap 
} from 'lucide-react';

interface PerformanceMetric {
  name: string;
  value: number;
  target: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

interface WebVital {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [webVitals, setWebVitals] = useState<WebVital[]>([]);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');

  useEffect(() => {
    // Fetch performance data
    fetchPerformanceData();
    
    // Set up real-time updates
    const interval = setInterval(fetchPerformanceData, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [selectedTimeRange]);

  const fetchPerformanceData = async () => {
    try {
      // Fetch from performance monitoring API
      const response = await fetch(`/api/performance/metrics?range=${selectedTimeRange}`);
      const data = await response.json();
      
      setMetrics(data.current);
      setHistoricalData(data.historical);
      setWebVitals(data.webVitals);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'critical':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  if (isLoading) {
    return <div>Loading performance data...</div>;
  }

  // Mock data for demonstration
  const mockMetrics: PerformanceMetric[] = [
    { name: 'API Response Time (p95)', value: 185, target: 200, unit: 'ms', status: 'good', trend: 'down' },
    { name: 'Page Load Time', value: 1.8, target: 2.0, unit: 's', status: 'good', trend: 'stable' },
    { name: 'Error Rate', value: 0.8, target: 1.0, unit: '%', status: 'good', trend: 'down' },
    { name: 'Requests/Second', value: 245, target: 200, unit: 'req/s', status: 'good', trend: 'up' },
    { name: 'DB Query Time (p95)', value: 45, target: 50, unit: 'ms', status: 'good', trend: 'stable' },
    { name: 'Cache Hit Rate', value: 82, target: 80, unit: '%', status: 'good', trend: 'up' },
  ];

  const mockHistoricalData = Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    responseTime: Math.random() * 50 + 150,
    errorRate: Math.random() * 0.5,
    throughput: Math.random() * 100 + 200,
  }));

  const mockWebVitals = [
    { name: 'LCP', value: 2.1, rating: 'good' as const },
    { name: 'FID', value: 45, rating: 'good' as const },
    { name: 'CLS', value: 0.08, rating: 'good' as const },
    { name: 'TTFB', value: 0.8, rating: 'needs-improvement' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of system performance and health metrics
          </p>
        </div>
        
        <div className="flex gap-2">
          {['1h', '6h', '24h', '7d'].map((range) => (
            <button
              key={range}
              onClick={() => setSelectedTimeRange(range)}
              className={`px-3 py-1 rounded-md ${
                selectedTimeRange === range 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockMetrics.map((metric) => (
          <Card key={metric.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
              {getStatusIcon(metric.status)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className={getStatusColor(metric.status)}>
                  {metric.value}{metric.unit}
                </span>
                <span className="text-sm text-muted-foreground ml-2">
                  / {metric.target}{metric.unit}
                </span>
              </div>
              <Progress 
                value={(metric.value / metric.target) * 100} 
                className="mt-2"
              />
              <div className="flex items-center mt-2 text-xs text-muted-foreground">
                <TrendingUp className={`h-3 w-3 mr-1 ${
                  metric.trend === 'up' ? 'text-green-500' : 
                  metric.trend === 'down' ? 'text-red-500' : 
                  'text-gray-500'
                }`} />
                {metric.trend === 'up' ? 'Increasing' : 
                 metric.trend === 'down' ? 'Decreasing' : 
                 'Stable'}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="response-time" className="space-y-4">
        <TabsList>
          <TabsTrigger value="response-time">Response Time</TabsTrigger>
          <TabsTrigger value="throughput">Throughput</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="web-vitals">Web Vitals</TabsTrigger>
        </TabsList>

        <TabsContent value="response-time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Response Time Trend</CardTitle>
              <CardDescription>95th percentile response times over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockHistoricalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="responseTime" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="throughput" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Request Throughput</CardTitle>
              <CardDescription>Requests per second over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={mockHistoricalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="throughput" 
                    stroke="#82ca9d" 
                    fill="#82ca9d" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Rate</CardTitle>
              <CardDescription>Percentage of failed requests</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockHistoricalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="errorRate" 
                    stroke="#ff6b6b" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="web-vitals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Core Web Vitals</CardTitle>
              <CardDescription>Google's key metrics for user experience</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {mockWebVitals.map((vital) => (
                  <div key={vital.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{vital.name}</span>
                      <Badge variant={
                        vital.rating === 'good' ? 'default' :
                        vital.rating === 'needs-improvement' ? 'secondary' :
                        'destructive'
                      }>
                        {vital.rating}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold">
                      {vital.value}
                      <span className="text-sm text-muted-foreground ml-1">
                        {vital.name === 'CLS' ? '' : vital.name === 'LCP' ? 's' : 'ms'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
          <CardDescription>Current performance issues requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Database Connection Pool Warning</AlertTitle>
              <AlertDescription>
                Connection pool usage at 85%. Consider scaling database resources.
              </AlertDescription>
            </Alert>
            
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>High Error Rate on /api/payments</AlertTitle>
              <AlertDescription>
                Error rate spike detected (5.2%). Investigate payment service integration.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">CPU Usage</span>
                  <span className="text-sm">45%</span>
                </div>
                <Progress value={45} />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Memory Usage</span>
                  <span className="text-sm">72%</span>
                </div>
                <Progress value={72} className="bg-yellow-100" />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Disk I/O</span>
                  <span className="text-sm">23%</span>
                </div>
                <Progress value={23} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Active Connections</span>
                  <span className="text-sm">85/100</span>
                </div>
                <Progress value={85} className="bg-yellow-100" />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Query Cache Hit Rate</span>
                  <span className="text-sm">92%</span>
                </div>
                <Progress value={92} />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Replication Lag</span>
                  <span className="text-sm">120ms</span>
                </div>
                <Progress value={12} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}