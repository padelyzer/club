'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, RefreshCw, AlertCircle, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOfflineQueue } from '@/lib/api/offline-queue';
import { offlineQueue } from '@/lib/api/offline-queue';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function OfflineIndicator({
  className,
  showDetails = false,
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const { queuedRequests, hasQueuedRequests, clearQueue, removeFromQueue } =
    useOfflineQueue();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      if (hasQueuedRequests) {
        handleManualSync();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [hasQueuedRequests]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await offlineQueue.processQueue();
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOnline || hasQueuedRequests) {
    return (
      <div className={cn('fixed bottom-4 right-4 z-50', className)}>
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              className={cn(
                'p-4 shadow-lg',
                !isOnline
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              )}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {!isOnline ? (
                    <WifiOff
                      className="h-5 w-5 text-red-500"
                      aria-hidden="true"
                    />
                  ) : (
                    <Wifi
                      className="h-5 w-5 text-green-500"
                      aria-hidden="true"
                    />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {!isOnline ? 'Sin conexión' : 'Conexión restaurada'}
                    </p>
                    {hasQueuedRequests && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {queuedRequests.length} cambios pendientes de
                        sincronizar
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {hasQueuedRequests && isOnline && (
                    <Button
                      size="sm"
                      onClick={handleManualSync}
                      disabled={isSyncing}
                      aria-label="Sincronizar cambios pendientes"
                    >
                      {isSyncing ? (
                        <>
                          <RefreshCw
                            className="h-3 w-3 mr-1 animate-spin"
                            aria-hidden="true"
                          />
                          Sincronizando...
                        </>
                      ) : (
                        <>
                          <RefreshCw
                            className="h-3 w-3 mr-1"
                            aria-hidden="true"
                          />
                          Sincronizar
                        </>
                      )}
                    </Button>
                  )}

                  {showDetails && hasQueuedRequests && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowQueue(!showQueue)}
                      aria-label={
                        showQueue
                          ? 'Ocultar cola de sincronización'
                          : 'Mostrar cola de sincronización'
                      }
                      aria-expanded={showQueue}
                    >
                      {showQueue ? 'Ocultar' : 'Ver'} cola
                    </Button>
                  )}
                </div>
              </div>

              {/* Queue Details */}
              {showQueue && hasQueuedRequests && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4 pt-4 border-t"
                >
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium">
                        Cola de sincronización
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={clearQueue}
                        className="text-xs"
                        aria-label="Limpiar toda la cola"
                      >
                        Limpiar todo
                      </Button>
                    </div>
                    {queuedRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded text-sm"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <Badge variant="outline" className="text-xs">
                            {request.method.toUpperCase()}
                          </Badge>
                          <span className="truncate text-xs">
                            {request.url}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {request.retryCount > 0 && (
                            <Tooltip
                              content={`Intento ${request.retryCount} de 3`}
                            >
                              <Badge variant="destructive" className="text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {request.retryCount}
                              </Badge>
                            </Tooltip>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromQueue(request.id)}
                            className="h-6 w-6 p-0"
                            aria-label={`Eliminar ${request.method} ${request.url} de la cola`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return null;
}

// Compact version for header/navbar
export function OfflineStatusBadge({ className }: { className?: string }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { hasQueuedRequests, queuedRequests } = useOfflineQueue();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <Badge
        variant="destructive"
        className={cn('flex items-center gap-1', className)}
        role="status"
        aria-live="polite"
      >
        <WifiOff className="h-3 w-3" aria-hidden="true" />
        <span>Sin conexión</span>
      </Badge>
    );
  }

  if (hasQueuedRequests) {
    return (
      <Tooltip
        content={`${queuedRequests.length} cambios pendientes de sincronizar`}
      >
        <Badge
          variant="outline"
          className={cn('flex items-center gap-1 cursor-help', className)}
          role="status"
          aria-live="polite"
        >
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
          <span>{queuedRequests.length}</span>
        </Badge>
      </Tooltip>
    );
  }

  return null;
}
