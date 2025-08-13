'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Download,
  RefreshCw,
  FileText,
  TrendingUp,
  Users,
  AlertOctagon,
} from 'lucide-react';
import {
  ImportPreviewData,
  ImportError,
  ImportWarning,
  FieldSuggestion,
  CLIENT_SYSTEM_FIELDS,
} from '@/types/import-export';
import { ImportExportService } from '@/lib/api/services/import-export.service';
import { cn } from '@/lib/utils';

interface ImportPreviewProps {
  previewData: ImportPreviewData;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

type ViewMode = 'summary' | 'data' | 'errors' | 'suggestions';

export function ImportPreview({
  previewData,
  onRefresh,
  isRefreshing = false,
  className,
}: ImportPreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [showValidRowsOnly, setShowValidRowsOnly] = useState(false);
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());

  const toggleErrorExpansion = (index: number) => {
    setExpandedErrors((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getValidationSeverityColor = (severity: 'error' | 'warning') => {
    return severity === 'error' ? 'text-red-600' : 'text-yellow-600';
  };

  const getValidationIcon = (severity: 'error' | 'warning') => {
    return severity === 'error' ? AlertCircle : AlertTriangle;
  };

  const renderSummaryView = () => (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            {previewData.validation_summary.valid_rows}
          </p>
          <p className="text-sm text-gray-500">Filas válidas</p>
          <p className="text-xs text-gray-400 mt-1">
            {(
              (previewData.validation_summary.valid_rows /
                previewData.total_rows) *
              100
            ).toFixed(1)}
            %
          </p>
        </Card>

        <Card className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600">
            {previewData.validation_summary.invalid_rows}
          </p>
          <p className="text-sm text-gray-500">Filas con errores</p>
          <p className="text-xs text-gray-400 mt-1">
            {(
              (previewData.validation_summary.invalid_rows /
                previewData.total_rows) *
              100
            ).toFixed(1)}
            %
          </p>
        </Card>

        <Card className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">
            {previewData.validation_summary.warnings_count}
          </p>
          <p className="text-sm text-gray-500">Advertencias</p>
        </Card>

        <Card className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Users className="h-6 w-6 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {previewData.total_rows}
          </p>
          <p className="text-sm text-gray-500">Total filas</p>
        </Card>
      </div>

      {/* Field Mapping Status */}
      <Card className="p-4">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary-600" />
          Estado del Mapeo de Campos
        </h3>

        <div className="space-y-3">
          {previewData.headers.map((header, index) => {
            const suggestion = previewData.field_suggestions.find(
              (s) => s.csv_column === header
            );
            const systemField = CLIENT_SYSTEM_FIELDS.find(
              (f) => f.key === suggestion?.suggested_field
            );

            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">{header}</span>
                  {suggestion && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">→</span>
                      <Badge
                        variant={
                          suggestion.confidence > 0.8 ? 'default' : 'secondary'
                        }
                        className="text-xs"
                      >
                        {systemField?.label || suggestion.suggested_field}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {suggestion ? (
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-green-600">
                        {(suggestion.confidence * 100).toFixed(0)}% confianza
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <AlertOctagon className="h-4 w-4 text-gray-400" />
                      <span className="text-xs text-gray-500">Sin mapear</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Import Readiness */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Estado de la Importación</h3>
            <p className="text-sm text-gray-500 mt-1">
              {previewData.validation_summary.invalid_rows === 0
                ? 'Todos los datos están listos para importar'
                : `${previewData.validation_summary.invalid_rows} filas requieren atención`}
            </p>
          </div>
          <div className="text-right">
            {previewData.validation_summary.invalid_rows === 0 ? (
              <Badge className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Listo
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Requiere revisión
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </div>
  );

  const renderDataView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Vista Previa de Datos
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowValidRowsOnly(!showValidRowsOnly)}
          >
            {showValidRowsOnly ? (
              <EyeOff className="h-4 w-4 mr-1" />
            ) : (
              <Eye className="h-4 w-4 mr-1" />
            )}
            {showValidRowsOnly ? 'Mostrar todas' : 'Solo válidas'}
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-medium w-12">#</th>
                {previewData.headers.map((header, index) => (
                  <th key={index} className="text-left p-3 font-medium">
                    {header}
                  </th>
                ))}
                <th className="text-left p-3 font-medium w-20">Estado</th>
              </tr>
            </thead>
            <tbody>
              {previewData.sample_rows.map((row, rowIndex) => {
                const hasErrors = false; // This would be determined by validation
                const hasWarnings = false; // This would be determined by validation

                if (showValidRowsOnly && (hasErrors || hasWarnings)) {
                  return null;
                }

                return (
                  <tr
                    key={rowIndex}
                    className={cn(
                      'border-b hover:bg-gray-50',
                      hasErrors && 'bg-red-50',
                      hasWarnings && 'bg-yellow-50'
                    )}
                  >
                    <td className="p-3 text-gray-500">{rowIndex + 1}</td>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="p-3 max-w-xs truncate">
                        {String(cell)}
                      </td>
                    ))}
                    <td className="p-3">
                      {hasErrors ? (
                        <Badge variant="destructive" className="text-xs">
                          Error
                        </Badge>
                      ) : hasWarnings ? (
                        <Badge className="bg-yellow-500 text-xs">Warning</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          OK
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-sm text-gray-500 text-center">
        Mostrando las primeras {Math.min(previewData.sample_rows.length, 10)}{' '}
        filas de {previewData.total_rows} totales
      </p>
    </div>
  );

  const renderErrorsView = () => (
    <div className="space-y-4">
      <h3 className="font-medium flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-red-500" />
        Errores y Advertencias de Validación
      </h3>

      {/* Error Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 text-center border-red-200">
          <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
          <p className="text-xl font-bold text-red-600">
            {previewData.validation_summary.errors_count}
          </p>
          <p className="text-sm text-gray-500">Errores críticos</p>
        </Card>
        <Card className="p-4 text-center border-yellow-200">
          <AlertTriangle className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
          <p className="text-xl font-bold text-yellow-600">
            {previewData.validation_summary.warnings_count}
          </p>
          <p className="text-sm text-gray-500">Advertencias</p>
        </Card>
      </div>

      {/* Mock errors - in real implementation, these would come from validation */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-red-900">
                  Fila 3: Email inválido
                </span>
                <Badge variant="destructive" className="text-xs">
                  Error
                </Badge>
              </div>
              <p className="text-sm text-red-700 mt-1">
                El email &quot;usuario@&quot; no tiene un formato válido. Se requiere un
                email completo.
              </p>
              <p className="text-xs text-red-600 mt-1">
                Sugerencia: Verificar que el email tenga el formato correcto
                (ej: usuario@dominio.com)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-yellow-900">
                  Fila 7: Teléfono sin formato estándar
                </span>
                <Badge className="bg-yellow-500 text-xs">Advertencia</Badge>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                El teléfono &quot;123456&quot; es muy corto. Se recomienda usar formato
                internacional.
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Sugerencia: Usar formato +34 XXX XXX XXX para teléfonos
                españoles
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-red-900">
                  Fila 12: Campo requerido vacío
                </span>
                <Badge variant="destructive" className="text-xs">
                  Error
                </Badge>
              </div>
              <p className="text-sm text-red-700 mt-1">
                El campo &quot;apellido&quot; es requerido pero está vacío.
              </p>
              <p className="text-xs text-red-600 mt-1">
                Acción requerida: Proporcionar un apellido válido o configurar
                como opcional
              </p>
            </div>
          </div>
        </div>

        {previewData.validation_summary.errors_count > 3 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500 mb-3">
              Mostrando 3 de {previewData.validation_summary.errors_count}{' '}
              errores totales
            </p>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Descargar reporte completo
            </Button>
          </div>
        )}
      </Card>
    </div>
  );

  const renderSuggestionsView = () => (
    <div className="space-y-4">
      <h3 className="font-medium flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary-600" />
        Sugerencias de Mapeo de Campos
      </h3>

      <div className="space-y-3">
        {previewData.field_suggestions.map((suggestion, index) => {
          const systemField = CLIENT_SYSTEM_FIELDS.find(
            (f) => f.key === suggestion.suggested_field
          );

          return (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{suggestion.csv_column}</span>
                  <span className="text-gray-400">→</span>
                  <Badge
                    variant={
                      suggestion.confidence > 0.8 ? 'default' : 'secondary'
                    }
                  >
                    {systemField?.label || suggestion.suggested_field}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {(suggestion.confidence * 100).toFixed(0)}% confianza
                    </div>
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all',
                          suggestion.confidence > 0.8
                            ? 'bg-green-500'
                            : suggestion.confidence > 0.6
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        )}
                        style={{ width: `${suggestion.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p className="mb-2">
                  <strong>Razón:</strong> {suggestion.reason}
                </p>
                {systemField && (
                  <div className="space-y-1">
                    <p>
                      <strong>Tipo:</strong> {systemField.type}
                    </p>
                    <p>
                      <strong>Requerido:</strong>{' '}
                      {systemField.required ? 'Sí' : 'No'}
                    </p>
                    {systemField.example && (
                      <p>
                        <strong>Ejemplo:</strong> {systemField.example}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {previewData.field_suggestions.length === 0 && (
        <Card className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="font-medium mb-2">
            No se encontraron sugerencias automáticas
          </h3>
          <p className="text-sm text-gray-500">
            Deberás mapear los campos manualmente en el siguiente paso.
          </p>
        </Card>
      )}
    </div>
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Vista Previa de Importación</h2>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')}
            />
            Actualizar
          </Button>
        )}
      </div>

      {/* View Mode Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'summary', label: 'Resumen', icon: TrendingUp },
          { id: 'data', label: 'Datos', icon: FileText },
          { id: 'errors', label: 'Errores', icon: AlertCircle },
          { id: 'suggestions', label: 'Sugerencias', icon: Eye },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setViewMode(id as ViewMode)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              viewMode === id
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            {id === 'errors' &&
              previewData.validation_summary.errors_count > 0 && (
                <Badge variant="destructive" className="text-xs ml-1">
                  {previewData.validation_summary.errors_count}
                </Badge>
              )}
          </button>
        ))}
      </div>

      {/* Content based on view mode */}
      {viewMode === 'summary' && renderSummaryView()}
      {viewMode === 'data' && renderDataView()}
      {viewMode === 'errors' && renderErrorsView()}
      {viewMode === 'suggestions' && renderSuggestionsView()}
    </div>
  );
}
