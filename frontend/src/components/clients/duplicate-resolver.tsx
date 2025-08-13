'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  UserCheck,
  UserX,
  UserPlus,
  ArrowRight,
  Info,
} from 'lucide-react';
import { DuplicateDetection, DuplicateStrategy } from '@/types/import-export';
import { ApiClient } from '@/types/client';
import { cn } from '@/lib/utils';

interface DuplicateResolverProps {
  duplicates: DuplicateDetection[];
  onResolutionChange: (duplicates: DuplicateDetection[]) => void;
  onBulkAction?: (action: DuplicateStrategy) => void;
  className?: string;
}

interface DuplicateResolution extends DuplicateDetection {
  resolution?: DuplicateStrategy;
}

const strategyLabels: Record<DuplicateStrategy, string> = {
  skip: 'Omitir',
  update: 'Actualizar',
  duplicate: 'Crear duplicado',
  ask: 'Preguntar',
};

const strategyDescriptions: Record<DuplicateStrategy, string> = {
  skip: 'Ignorar este registro y mantener el existente',
  update: 'Actualizar el registro existente con los nuevos datos',
  duplicate: 'Crear un nuevo registro aunque sea duplicado',
  ask: 'Decidir manualmente para cada caso',
};

const strategyIcons: Record<
  DuplicateStrategy,
  React.ComponentType<{ className?: string }>
> = {
  skip: UserX,
  update: RefreshCw,
  duplicate: UserPlus,
  ask: AlertTriangle,
};

export function DuplicateResolver({
  duplicates: initialDuplicates,
  onResolutionChange,
  onBulkAction,
  className,
}: DuplicateResolverProps) {
  const [duplicates, setDuplicates] = useState<DuplicateResolution[]>(
    initialDuplicates.map((d) => ({ ...d, resolution: d.suggested_action }))
  );
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [bulkStrategy, setBulkStrategy] = useState<DuplicateStrategy>('ask');
  const [showResolved, setShowResolved] = useState(true);

  const updateResolution = (index: number, resolution: DuplicateStrategy) => {
    const updated = [...duplicates];
    updated[index].resolution = resolution;
    setDuplicates(updated);
    onResolutionChange(updated);
  };

  const applyBulkAction = (strategy: DuplicateStrategy) => {
    const updated = duplicates.map((d) => ({ ...d, resolution: strategy }));
    setDuplicates(updated);
    onResolutionChange(updated);
    onBulkAction?.(strategy);
  };

  const toggleExpanded = (index: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getStrategyColor = (strategy: DuplicateStrategy) => {
    switch (strategy) {
      case 'skip':
        return 'text-gray-600 bg-gray-100';
      case 'update':
        return 'text-blue-600 bg-blue-100';
      case 'duplicate':
        return 'text-green-600 bg-green-100';
      case 'ask':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-red-600 bg-red-100';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const filteredDuplicates = showResolved
    ? duplicates
    : duplicates.filter((d) => !d.resolution || d.resolution === 'ask');

  const resolvedCount = duplicates.filter(
    (d) => d.resolution && d.resolution !== 'ask'
  ).length;
  const unresolvedCount = duplicates.length - resolvedCount;

  const renderComparisonTable = (csvData: any, existingClient: ApiClient) => {
    const fields = [
      { key: 'first_name', label: 'Nombre' },
      { key: 'last_name', label: 'Apellido' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'birth_date', label: 'Fecha de Nacimiento' },
      { key: 'document_number', label: 'Documento' },
    ];

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-3 font-medium">Campo</th>
              <th className="text-left p-3 font-medium">Datos Existentes</th>
              <th className="text-left p-3 font-medium">Nuevos Datos</th>
              <th className="text-left p-3 font-medium">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => {
              const existingValue =
                existingClient[field.key as keyof ApiClient] || '-';
              const newValue = csvData[field.key] || '-';
              const isDifferent = existingValue !== newValue;

              return (
                <tr
                  key={field.key}
                  className={cn('border-b', isDifferent && 'bg-yellow-50')}
                >
                  <td className="p-3 font-medium">{field.label}</td>
                  <td className="p-3">
                    <span
                      className={cn(
                        'px-2 py-1 rounded',
                        !isDifferent && 'bg-gray-100'
                      )}
                    >
                      {String(existingValue)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={cn(
                        'px-2 py-1 rounded',
                        isDifferent && 'bg-yellow-200'
                      )}
                    >
                      {String(newValue)}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {isDifferent ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  if (duplicates.length === 0) {
    return (
      <Card className={cn('p-8 text-center', className)}>
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="font-medium text-lg mb-2">
          No se encontraron duplicados
        </h3>
        <p className="text-gray-500">
          Todos los registros son únicos y pueden importarse sin conflictos.
        </p>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Resolver Duplicados
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Se encontraron {duplicates.length} posibles duplicados que requieren
            revisión
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowResolved(!showResolved)}
          >
            {showResolved ? (
              <EyeOff className="h-4 w-4 mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            {showResolved ? 'Ocultar resueltos' : 'Mostrar todos'}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {duplicates.length}
          </div>
          <div className="text-sm text-gray-500">Total duplicados</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {resolvedCount}
          </div>
          <div className="text-sm text-gray-500">Resueltos</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {unresolvedCount}
          </div>
          <div className="text-sm text-gray-500">Pendientes</div>
        </Card>
      </div>

      {/* Bulk Actions */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Acciones en Lote</h3>
            <p className="text-sm text-gray-500">
              Aplicar la misma acción a todos los duplicados
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select
              value={bulkStrategy || ''}
              onValueChange={(value: DuplicateStrategy) =>
                setBulkStrategy(value)
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(strategyLabels) as DuplicateStrategy[]).map(
                  (strategy) => (
                    <SelectItem key={strategy} value={strategy || ''}>
                      {strategyLabels[strategy]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>

            <Button onClick={() => applyBulkAction(bulkStrategy)}>
              Aplicar a Todos
            </Button>
          </div>
        </div>
      </Card>

      {/* Duplicates List */}
      <div className="space-y-4">
        {filteredDuplicates.map((duplicate, index) => {
          const isExpanded = expandedItems.has(index);
          const StrategyIcon = strategyIcons[duplicate.resolution || 'ask'];

          return (
            <Card key={index} className="overflow-hidden">
              {/* Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpanded(index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        Fila {duplicate.csv_row}
                      </span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {duplicate.existing_client.first_name}{' '}
                        {duplicate.existing_client.last_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        className={getConfidenceColor(
                          duplicate.match_confidence
                        )}
                      >
                        {(duplicate.match_confidence * 100).toFixed(0)}%
                        coincidencia
                      </Badge>

                      <Badge variant="outline">
                        {duplicate.match_fields.join(', ')}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {duplicate.resolution && (
                      <div className="flex items-center gap-2">
                        <StrategyIcon className="h-4 w-4" />
                        <Badge
                          className={getStrategyColor(duplicate.resolution)}
                        >
                          {strategyLabels[duplicate.resolution]}
                        </Badge>
                      </div>
                    )}

                    <Button variant="ghost" size="sm">
                      {isExpanded ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t bg-gray-50">
                  <div className="p-4 space-y-4">
                    {/* Strategy Selection */}
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-sm">Acción:</span>
                      <div className="flex gap-2">
                        {(Object.keys(strategyLabels) as DuplicateStrategy[])
                          .filter((s) => s !== 'ask')
                          .map((strategy) => {
                            const Icon = strategyIcons[strategy];
                            return (
                              <Button
                                key={strategy}
                                variant={
                                  duplicate.resolution === strategy
                                    ? 'default'
                                    : 'outline'
                                }
                                size="sm"
                                onClick={() =>
                                  updateResolution(index, strategy)
                                }
                              >
                                <Icon className="h-4 w-4 mr-2" />
                                {strategyLabels[strategy]}
                              </Button>
                            );
                          })}
                      </div>
                    </div>

                    {/* Strategy Description */}
                    {duplicate.resolution && duplicate.resolution !== 'ask' && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                          <div className="text-sm text-blue-700">
                            <strong>Acción seleccionada:</strong>{' '}
                            {strategyDescriptions[duplicate.resolution]}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Data Comparison */}
                    <div>
                      <h4 className="font-medium mb-3">Comparación de Datos</h4>
                      {renderComparisonTable({}, duplicate.existing_client)}
                    </div>

                    {/* Match Details */}
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <h4 className="font-medium text-yellow-900 mb-2">
                        Detalles de la Coincidencia
                      </h4>
                      <div className="space-y-1 text-sm text-yellow-700">
                        <div>
                          <strong>Campos coincidentes:</strong>{' '}
                          {duplicate.match_fields.join(', ')}
                        </div>
                        <div>
                          <strong>Nivel de confianza:</strong>{' '}
                          {(duplicate.match_confidence * 100).toFixed(1)}%
                        </div>
                        <div>
                          <strong>Cliente existente ID:</strong>{' '}
                          {duplicate.existing_client.id}
                        </div>
                        <div>
                          <strong>Email existente:</strong>{' '}
                          {duplicate.existing_client.email}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      {unresolvedCount > 0 && (
        <Card className="p-4 border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-900">
                {unresolvedCount} duplicados pendientes de resolución
              </p>
              <p className="text-sm text-yellow-700">
                Debes resolver todos los duplicados antes de continuar con la
                importación.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Success Message */}
      {unresolvedCount === 0 && resolvedCount > 0 && (
        <Card className="p-4 border-green-200 bg-green-50">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">
                Todos los duplicados han sido resueltos
              </p>
              <p className="text-sm text-green-700">
                Puedes continuar con la importación. Se aplicarán las acciones
                seleccionadas.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
