/**
 * Componente de monitoreo de sincronización en tiempo real
 * Muestra el estado de salud del sistema y problemas de sincronización
 */

import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useTypeValidation } from '@/lib/api/middleware';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  checks: {
    database: HealthCheck;
    cache: HealthCheck;
    api_format: HealthCheck;
    model_integrity: HealthCheck;
    system: HealthCheck;
  };
  response_time_ms: number;
}

interface HealthCheck {
  healthy: boolean;
  message: string;
  details: Record<string, any>;
}

export const SyncMonitor: React.FC<{ showInProduction?: boolean }> = ({ 
  showInProduction = false 
}) => {
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { errors: validationErrors, clearErrors } = useTypeValidation();
  const [isExpanded, setIsExpanded] = useState(false);

  // Solo mostrar en desarrollo a menos que se fuerce
  if (process.env.NODE_ENV === 'production' && !showInProduction) {
    return null;
  }

  const fetchHealthCheck = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/health/check/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      setHealthData(data);
      
      if (!response.ok) {
        setError(`Health check failed: ${response.status}`);
      }
    } catch (err) {
      setError(`Failed to fetch health status: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check inicial
    fetchHealthCheck();
    
    // Check cada 30 segundos
    const interval = setInterval(fetchHealthCheck, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'unhealthy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsExpanded(true)}
          variant="outline"
          size="sm"
          className={`${
            healthData?.status === 'unhealthy' ? 'border-red-500' : ''
          }`}
        >
          {healthData && getStatusIcon(healthData.status)}
          <span className="ml-2">System Monitor</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[600px] overflow-auto">
      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-lg">System Monitor</CardTitle>
              {healthData && getStatusIcon(healthData.status)}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={fetchHealthCheck}
                variant="ghost"
                size="sm"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                onClick={() => setIsExpanded(false)}
                variant="ghost"
                size="sm"
              >
                ×
              </Button>
            </div>
          </div>
          <CardDescription>
            Real-time synchronization monitoring
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {healthData && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Status</span>
                <Badge className={getStatusColor(healthData.status)}>
                  {healthData.status.toUpperCase()}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Response Time</span>
                <span>{healthData.response_time_ms}ms</span>
              </div>
              
              <div className="border-t pt-3">
                <h4 className="text-sm font-medium mb-2">Health Checks</h4>
                <div className="space-y-2">
                  {Object.entries(healthData.checks).map(([name, check]) => (
                    <div key={name} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{name.replace('_', ' ')}</span>
                      <div className="flex items-center space-x-2">
                        {check.healthy ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {check.message}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {validationErrors.length > 0 && (
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">Type Validation Errors</h4>
                    <Button
                      onClick={clearErrors}
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {validationErrors.slice(-5).map((error, index) => (
                      <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        <div className="font-medium">{error.endpoint}</div>
                        <div>{error.error}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Hook para usar en otros componentes
export const useSyncHealth = () => {
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health/check/');
        const data = await response.json();
        setHealth(data);
      } catch (error) {
        console.error('Health check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 60000); // Check cada minuto

    return () => clearInterval(interval);
  }, []);

  return { health, loading, isHealthy: health?.status === 'healthy' };
};