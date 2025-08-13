'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  Pause,
  Play,
  Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRealTimeAnalytics, useFormattedUpdateTime } from '@/hooks/useRealTimeAnalytics';

interface RealtimeStatusProps {
  compact?: boolean;
  showControls?: boolean;
  className?: string;
}

export function RealtimeStatus({ 
  compact = false, 
  showControls = true, 
  className = '' 
}: RealtimeStatusProps) {
  const { t } = useTranslation();
  
  const {
    isAutoRefreshEnabled,
    isRefreshing,
    hasError,
    error,
    timeSinceLastUpdate,
    isStale,
    retryCount,
    maxRetries,
    refreshData,
    startAutoRefresh,
    stopAutoRefresh,
    isConnected,
    connectionStatus
  } = useRealTimeAnalytics();

  const formattedUpdateTime = useFormattedUpdateTime(timeSinceLastUpdate);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'refreshing':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'stale':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'refreshing':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'stale':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return t('analytics.realtime.connected');
      case 'refreshing':
        return t('analytics.realtime.refreshing');
      case 'stale':
        return t('analytics.realtime.stale');
      case 'error':
        return t('analytics.realtime.error');
      default:
        return t('analytics.realtime.disconnected');
    }
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center space-x-2 ${className}`}>
              {getStatusIcon()}
              <span className="text-xs text-gray-600">
                {formattedUpdateTime}
              </span>
              {isAutoRefreshEnabled ? (
                <Activity className="h-3 w-3 text-green-500" />
              ) : (
                <Pause className="h-3 w-3 text-gray-400" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{getStatusText()}</p>
              <p className="text-xs">
                {t('analytics.realtime.lastUpdate')}: {formattedUpdateTime}
              </p>
              {hasError && (
                <p className="text-xs text-red-600">{error?.message}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="text-sm font-medium text-gray-900">
              {t('analytics.realtime.status')}
            </span>
          </div>
          <Badge variant="outline" className={getStatusColor()}>
            {getStatusText()}
          </Badge>
          {isAutoRefreshEnabled && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Activity className="h-3 w-3 mr-1" />
              {t('analytics.realtime.autoRefresh')}
            </Badge>
          )}
        </div>

        {showControls && (
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshData}
                    disabled={isRefreshing}
                    className="h-8 w-8 p-0"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('analytics.realtime.manualRefresh')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={isAutoRefreshEnabled ? stopAutoRefresh : startAutoRefresh}
                    className="h-8 w-8 p-0"
                  >
                    {isAutoRefreshEnabled ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {isAutoRefreshEnabled 
                      ? t('analytics.realtime.pauseAutoRefresh')
                      : t('analytics.realtime.resumeAutoRefresh')
                    }
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      {/* Detailed status information */}
      <div className="mt-3 grid grid-cols-2 gap-4 text-xs text-gray-600">
        <div>
          <span className="font-medium">{t('analytics.realtime.lastUpdate')}:</span>
          <div className="mt-1">{formattedUpdateTime}</div>
        </div>
        
        <div>
          <span className="font-medium">{t('analytics.realtime.connection')}:</span>
          <div className="mt-1 flex items-center space-x-1">
            {isConnected ? (
              <Wifi className="h-3 w-3 text-green-600" />
            ) : (
              <WifiOff className="h-3 w-3 text-red-600" />
            )}
            <span>{isConnected ? t('analytics.realtime.online') : t('analytics.realtime.offline')}</span>
          </div>
        </div>
        
        {hasError && retryCount > 0 && (
          <div className="col-span-2">
            <span className="font-medium text-red-600">{t('analytics.realtime.retryInfo')}:</span>
            <div className="mt-1">{retryCount}/{maxRetries} {t('analytics.realtime.attempts')}</div>
          </div>
        )}
      </div>

      {/* Error details */}
      {hasError && error && (
        <div className="mt-3 p-2 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-red-800">{t('analytics.realtime.errorDetails')}:</p>
              <p className="text-xs text-red-700 mt-1">{error.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Data staleness warning */}
      {isStale && !hasError && (
        <div className="mt-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-start space-x-2">
            <Clock className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-yellow-800">{t('analytics.realtime.staleData')}:</p>
              <p className="text-xs text-yellow-700 mt-1">
                {t('analytics.realtime.staleDataDescription')}
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// Live metrics indicator component for individual charts
export function LiveMetricsIndicator({ 
  isLive, 
  lastUpdate, 
  className = '' 
}: { 
  isLive: boolean; 
  lastUpdate?: string; 
  className?: string; 
}) {
  const { t } = useTranslation();
  
  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
      <span className="text-xs text-gray-500">
        {isLive ? t('analytics.realtime.live') : t('analytics.realtime.static')}
      </span>
      {lastUpdate && (
        <span className="text-xs text-gray-400">
          • {useFormattedUpdateTime(Math.floor((Date.now() - new Date(lastUpdate).getTime()) / 1000))}
        </span>
      )}
    </div>
  );
}