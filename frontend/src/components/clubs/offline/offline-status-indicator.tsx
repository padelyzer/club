'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, WifiOff, Cloud, CloudOff, RefreshCw, 
  Download, Upload, Clock, Database, Trash2,
  CheckCircle, AlertCircle, Info, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOffline } from '@/hooks/useOffline';

/**
 * Offline Status Indicator
 * Shows connection status and offline capabilities
 */

interface OfflineStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const OfflineStatusIndicator: React.FC<OfflineStatusIndicatorProps> = ({
  className,
  showDetails = false
}) => {
  const {
    isOnline,
    isSyncing,
    syncQueueLength,
    lastSyncTime,
    cacheInfo,
    error,
    syncData,
    clearCache
  } = useOffline();

  const [showPanel, setShowPanel] = useState(false);

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return 'Nunca';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Hace un momento';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;
    return new Date(timestamp).toLocaleDateString();
  };

  const formatCacheSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!showDetails) {
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
          isOnline
            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
          className
        )}
      >
        {isOnline ? (
          <Wifi className="w-3 h-3" />
        ) : (
          <WifiOff className="w-3 h-3" />
        )}
        {isOnline ? 'En línea' : 'Sin conexión'}
        {syncQueueLength > 0 && (
          <span className="w-4 h-4 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs">
            {syncQueueLength}
          </span>
        )}
      </motion.div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowPanel(!showPanel)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg",
          isOnline
            ? "bg-green-500 text-white hover:bg-green-600"
            : "bg-red-500 text-white hover:bg-red-600"
        )}
      >
        {isSyncing ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : isOnline ? (
          <Cloud className="w-4 h-4" />
        ) : (
          <CloudOff className="w-4 h-4" />
        )}
        
        <span>{isOnline ? 'En línea' : 'Modo offline'}</span>
        
        {syncQueueLength > 0 && (
          <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">
            {syncQueueLength}
          </span>
        )}
      </motion.button>

      {/* Detailed Panel */}
      <AnimatePresence>
        {showPanel && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowPanel(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute top-full mt-2 right-0 z-50 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Estado de Conexión
                  </h3>
                  <button
                    onClick={() => setShowPanel(false)}
                    className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Connection Status */}
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    isOnline
                      ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                      : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                  )}>
                    {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {isOnline ? 'Conectado' : 'Sin conexión'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {isOnline 
                        ? 'Datos sincronizados automáticamente' 
                        : 'Usando datos almacenados localmente'
                      }
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/30 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-red-700 dark:text-red-300 text-sm">
                        Error de sincronización
                      </div>
                      <div className="text-sm text-red-600 dark:text-red-400">
                        {error}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sync Status */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Última sincronización
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatLastSync(lastSyncTime)}
                    </span>
                  </div>

                  {syncQueueLength > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Cambios pendientes
                      </span>
                      <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium">
                        {syncQueueLength}
                      </span>
                    </div>
                  )}

                  {cacheInfo && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Datos almacenados
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {cacheInfo.items} elementos ({formatCacheSize(cacheInfo.size)})
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={syncData}
                    disabled={!isOnline || isSyncing}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                      isOnline && !isSyncing
                        ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {isSyncing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={clearCache}
                    className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>

                {/* Tips */}
                {!isOnline && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <div className="font-medium mb-1">Modo offline activo</div>
                      <div>
                        Puedes seguir navegando y marcando favoritos. Los cambios se sincronizarán 
                        automáticamente cuando recuperes la conexión.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Simple Network Status Badge
 */
export const NetworkStatusBadge: React.FC<{ className?: string }> = ({ className }) => {
  const { isOnline, syncQueueLength } = useOffline();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "w-2 h-2 rounded-full animate-pulse",
        isOnline ? "bg-green-500" : "bg-red-500"
      )} />
      
      {syncQueueLength > 0 && (
        <div className="w-4 h-4 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
          {syncQueueLength}
        </div>
      )}
    </div>
  );
};