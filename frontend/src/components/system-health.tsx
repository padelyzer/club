'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Wifi, WifiOff, ChevronUp, ChevronDown, Activity } from 'lucide-react';
import api from '@/lib/api/stable-client';

interface HealthStatus {
  backend: boolean;
  auth: boolean;
  cors: boolean;
  network: boolean;
}

export function SystemHealth() {
  const [health, setHealth] = useState<HealthStatus>({
    backend: false,
    auth: false,
    cors: false,
    network: typeof window !== 'undefined' ? navigator.onLine : true
  });
  const [isChecking, setIsChecking] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s

    // Network status listeners
    const handleOnline = () => setHealth(prev => ({ ...prev, network: true }));
    const handleOffline = () => setHealth(prev => ({ ...prev, network: false }));
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function checkHealth() {
    setIsChecking(true);
    const newHealth: HealthStatus = {
      backend: false,
      auth: false,
      cors: false,
      network: navigator.onLine
    };

    try {
      // Check backend health
      const healthResponse = await api.get('/health/');
      newHealth.backend = healthResponse.status === 'healthy';
      newHealth.cors = true; // If we got here, CORS works

      // Check auth if we have a token
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          await api.get('/auth/profile/');
          newHealth.auth = true;
        } catch {
          newHealth.auth = false;
        }
      }
    } catch (error) {
            // Force CORS error to show if backend is not reachable
      if (!newHealth.backend) {
        newHealth.cors = false;
      }
    }

    setHealth(newHealth);
    setIsChecking(false);
  }

  const getStatusIcon = (status: boolean) => {
    if (isChecking) return <AlertCircle className="w-4 h-4 text-yellow-500 animate-pulse" />;
    return status ? 
      <CheckCircle className="w-4 h-4 text-green-500" /> : 
      <XCircle className="w-4 h-4 text-red-500" />;
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null;

  const hasErrors = !health.network || !health.backend || !health.cors || !health.auth;
  const getOverallStatus = () => {
    if (isChecking) return 'checking';
    if (hasErrors) return 'error';
    return 'healthy';
  };

  const overallStatus = getOverallStatus();

  return (
    <div className={`fixed bottom-32 left-4 bg-white rounded-lg shadow-lg transition-all duration-300 text-sm z-50 ${
      isMinimized ? 'p-2' : 'p-4'
    }`}>
      {/* Header with minimize button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${
            overallStatus === 'checking' ? 'text-yellow-500 animate-pulse' :
            overallStatus === 'error' ? 'text-red-500' : 'text-green-500'
          }`} />
          <h3 className="font-semibold">System Status</h3>
        </div>
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title={isMinimized ? 'Expand' : 'Minimize'}
        >
          {isMinimized ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>
      </div>

      {/* Status details - only show when not minimized */}
      {!isMinimized && (
        <>
          <div className="space-y-1 mt-2">
            <div className="flex items-center gap-2">
              {health.network ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
              <span>Network</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(health.backend)}
              <span>Backend API</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(health.cors)}
              <span>CORS</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(health.auth)}
              <span>Authentication</span>
            </div>
          </div>
          <button
            onClick={checkHealth}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800"
            disabled={isChecking}
          >
            {isChecking ? 'Checking...' : 'Refresh'}
          </button>
        </>
      )}

      {/* Minimized state - show summary */}
      {isMinimized && (
        <div className="mt-1 text-xs text-gray-600">
          {overallStatus === 'checking' ? 'Checking...' :
           overallStatus === 'error' ? 'Issues detected' : 'All systems operational'}
        </div>
      )}
    </div>
  );
}