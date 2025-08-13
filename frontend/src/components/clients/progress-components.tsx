'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  Pause,
  Play,
  X,
  RotateCcw,
  FileText,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import {
  OperationProgress,
  ImportResult,
  ExportResult,
  ProgressState,
} from '@/types/import-export';
import { ImportExportService } from '@/lib/api/services/import-export.service';
import { cn } from '@/lib/utils';

interface ProgressComponentProps {
  progress: OperationProgress;
  onCancel?: () => void;
  onRetry?: () => void;
  onComplete?: (result: ImportResult | ExportResult) => void;
  className?: string;
}

interface ProgressCircleProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

function ProgressCircle({
  percentage,
  size = 120,
  strokeWidth = 8,
  className,
}: ProgressCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn('relative', className)}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="text-primary-500 transition-all duration-300 ease-in-out"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-gray-700">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
}

export function ImportProgress({
  progress,
  onCancel,
  onRetry,
  onComplete,
  className,
}: ProgressComponentProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedRemaining, setEstimatedRemaining] = useState<number | null>(
    null
  );

  useEffect(() => {
    if (progress.state === 'processing') {
      const interval = setInterval(() => {
        const elapsed =
          (Date.now() - new Date(progress.start_time).getTime()) / 1000;
        setElapsedTime(elapsed);

        // Calculate estimated remaining time
        if (progress.progress_percentage > 0) {
          const totalEstimated = (elapsed / progress.progress_percentage) * 100;
          const remaining = totalEstimated - elapsed;
          setEstimatedRemaining(Math.max(0, remaining));
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [progress.state, progress.start_time, progress.progress_percentage]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600)
      return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  };

  const getStateInfo = () => {
    switch (progress.state) {
      case 'preparing':
        return {
          icon: Clock,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50',
          title: 'Preparando Importación',
          description: 'Validando archivo y configuración...',
        };
      case 'processing':
        return {
          icon: Upload,
          color: 'text-primary-500',
          bgColor: 'bg-primary-50',
          title: 'Importando Datos',
          description: progress.current_step || 'Procesando registros...',
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          title: 'Importación Completada',
          description: 'Todos los datos han sido procesados exitosamente.',
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          title: 'Error en la Importación',
          description:
            progress.error_message ||
            'Ha ocurrido un error durante la importación.',
        };
      case 'cancelled':
        return {
          icon: X,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          title: 'Importación Cancelada',
          description: 'La operación fue cancelada por el usuario.',
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          title: 'Estado Desconocido',
          description: 'Verificando estado de la importación...',
        };
    }
  };

  const stateInfo = getStateInfo();
  const IconComponent = stateInfo.icon;

  return (
    <Card className={cn('p-6', className)}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-full', stateInfo.bgColor)}>
              <IconComponent className={cn('h-6 w-6', stateInfo.color)} />
            </div>
            <div>
              <h3 className="font-semibold">{stateInfo.title}</h3>
              <p className="text-sm text-gray-500">{stateInfo.description}</p>
            </div>
          </div>

          <Badge
            variant={progress.state === 'completed' ? 'default' : 'secondary'}
          >
            {progress.state === 'processing'
              ? 'En Progreso'
              : progress.state === 'completed'
                ? 'Completado'
                : progress.state === 'error'
                  ? 'Error'
                  : progress.state === 'cancelled'
                    ? 'Cancelado'
                    : 'Preparando'}
          </Badge>
        </div>

        {/* Progress Circle */}
        {(progress.state === 'processing' ||
          progress.state === 'preparing') && (
          <div className="flex justify-center">
            <ProgressCircle percentage={progress.progress_percentage} />
          </div>
        )}

        {/* Progress Details */}
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                Progreso: {progress.completed_steps} de {progress.total_steps}{' '}
                pasos
              </span>
              <span>{Math.round(progress.progress_percentage)}%</span>
            </div>
            <Progress value={progress.progress_percentage || ''} className="h-2" />
          </div>

          {/* Time Information */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Tiempo transcurrido:</span>
              <div className="font-medium">{formatTime(elapsedTime)}</div>
            </div>
            {estimatedRemaining !== null && progress.state === 'processing' && (
              <div>
                <span className="text-gray-500">Tiempo estimado restante:</span>
                <div className="font-medium">
                  {formatTime(estimatedRemaining)}
                </div>
              </div>
            )}
          </div>

          {/* Current Step */}
          {progress.current_step && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm">
                <span className="text-gray-500">Paso actual:</span>
                <div className="font-medium mt-1">{progress.current_step}</div>
              </div>
            </div>
          )}

          {/* Results Preview */}
          {progress.state === 'completed' && progress.result && (
            <div className="space-y-3">
              <h4 className="font-medium">Resultados de la Importación</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    {(progress.result as ImportResult).imported_count}
                  </div>
                  <div className="text-xs text-green-700">Importados</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">
                    {(progress.result as ImportResult).updated_count}
                  </div>
                  <div className="text-xs text-blue-700">Actualizados</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-lg font-bold text-yellow-600">
                    {(progress.result as ImportResult).skipped_count}
                  </div>
                  <div className="text-xs text-yellow-700">Omitidos</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-lg font-bold text-red-600">
                    {(progress.result as ImportResult).error_count}
                  </div>
                  <div className="text-xs text-red-700">Errores</div>
                </div>
              </div>
            </div>
          )}

          {/* Error Details */}
          {progress.state === 'error' && progress.error_message && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-red-900">Error Details</h4>
                  <p className="text-sm text-red-700 mt-1">
                    {progress.error_message}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <div>
            {progress.state === 'error' && onRetry && (
              <Button variant="outline" onClick={onRetry}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {(progress.state === 'processing' ||
              progress.state === 'preparing') &&
              onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              )}

            {progress.state === 'completed' &&
              onComplete &&
              progress.result && (
                <Button onClick={() => onComplete!(progress.result!)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Ver Resultados
                </Button>
              )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function ExportProgress({
  progress,
  onCancel,
  onRetry,
  onComplete,
  className,
}: ProgressComponentProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (progress.state === 'processing') {
      const interval = setInterval(() => {
        const elapsed =
          (Date.now() - new Date(progress.start_time).getTime()) / 1000;
        setElapsedTime(elapsed);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [progress.state, progress.start_time]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600)
      return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  };

  const formatFileSize = (bytes: number): string => {
    return ImportExportService.formatFileSize(bytes);
  };

  const getStateInfo = () => {
    switch (progress.state) {
      case 'preparing':
        return {
          icon: Clock,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50',
          title: 'Preparando Exportación',
          description: 'Aplicando filtros y configurando formato...',
        };
      case 'processing':
        return {
          icon: Download,
          color: 'text-primary-500',
          bgColor: 'bg-primary-50',
          title: 'Generando Archivo',
          description: progress.current_step || 'Procesando datos...',
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          title: 'Exportación Completada',
          description: 'El archivo está listo para descargar.',
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          title: 'Error en la Exportación',
          description:
            progress.error_message ||
            'Ha ocurrido un error durante la exportación.',
        };
      case 'cancelled':
        return {
          icon: X,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          title: 'Exportación Cancelada',
          description: 'La operación fue cancelada por el usuario.',
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          title: 'Estado Desconocido',
          description: 'Verificando estado de la exportación...',
        };
    }
  };

  const stateInfo = getStateInfo();
  const IconComponent = stateInfo.icon;

  return (
    <Card className={cn('p-6', className)}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-full', stateInfo.bgColor)}>
              <IconComponent className={cn('h-6 w-6', stateInfo.color)} />
            </div>
            <div>
              <h3 className="font-semibold">{stateInfo.title}</h3>
              <p className="text-sm text-gray-500">{stateInfo.description}</p>
            </div>
          </div>

          <Badge
            variant={progress.state === 'completed' ? 'default' : 'secondary'}
          >
            {progress.state === 'processing'
              ? 'En Progreso'
              : progress.state === 'completed'
                ? 'Completado'
                : progress.state === 'error'
                  ? 'Error'
                  : progress.state === 'cancelled'
                    ? 'Cancelado'
                    : 'Preparando'}
          </Badge>
        </div>

        {/* Progress Visualization */}
        {(progress.state === 'processing' ||
          progress.state === 'preparing') && (
          <div className="space-y-4">
            {/* Animated Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso</span>
                <span>{Math.round(progress.progress_percentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress.progress_percentage}%` }}
                >
                  <div className="w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                </div>
              </div>
            </div>

            {/* Step Progress */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Paso {progress.completed_steps} de {progress.total_steps}
              </span>
              <span className="text-gray-500">
                Tiempo: {formatTime(elapsedTime)}
              </span>
            </div>
          </div>
        )}

        {/* Current Step Details */}
        {progress.current_step && progress.state === 'processing' && (
          <div className="bg-primary-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin">
                <TrendingUp className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <div className="font-medium text-primary-900">
                  {progress.current_step}
                </div>
                <div className="text-sm text-primary-700">
                  Procesando datos...
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Export Results */}
        {progress.state === 'completed' && progress.result && (
          <div className="space-y-4">
            <h4 className="font-medium">Detalles de la Exportación</h4>
            <div className="bg-green-50 p-4 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Archivo:</span>
                  <div className="font-medium text-gray-900">
                    {(progress.result as ExportResult).filename}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Formato:</span>
                  <div className="font-medium text-gray-900">
                    {(progress.result as ExportResult).format.toUpperCase()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Registros:</span>
                  <div className="font-medium text-gray-900">
                    {(
                      progress.result as ExportResult
                    ).total_records.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Tamaño:</span>
                  <div className="font-medium text-gray-900">
                    {formatFileSize(
                      (progress.result as ExportResult).file_size
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-green-200">
                <div className="text-xs text-green-700">
                  El archivo estará disponible hasta:{' '}
                  {new Date(
                    (progress.result as ExportResult).expires_at
                  ).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Details */}
        {progress.state === 'error' && progress.error_message && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-900">
                  Error en la Exportación
                </h4>
                <p className="text-sm text-red-700 mt-1">
                  {progress.error_message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between">
          <div>
            {progress.state === 'error' && onRetry && (
              <Button variant="outline" onClick={onRetry}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {(progress.state === 'processing' ||
              progress.state === 'preparing') &&
              onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              )}

            {progress.state === 'completed' && progress.result && (
              <Button
                onClick={() => {
                  if (progress.result) {
                    // Trigger download
                    const result = progress.result as ExportResult;
                    window.open(result.download_url, '_blank');
                  }
                  onComplete?.(progress.result!);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar Archivo
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
