'use client';

import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Wand2,
  Eye,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  Plus,
} from 'lucide-react';
import {
  FieldMapping,
  FieldSuggestion,
  CLIENT_SYSTEM_FIELDS,
  SystemField,
} from '@/types/import-export';
import { ApiClient } from '@/types/client';
import { ImportExportService } from '@/lib/api/services/import-export.service';
import { cn } from '@/lib/utils';

interface FieldMapperProps {
  csvHeaders: string[];
  fieldMappings: FieldMapping[];
  suggestions?: FieldSuggestion[];
  sampleData?: string[][];
  onMappingsChange: (mappings: FieldMapping[]) => void;
  onPreview?: () => void;
  className?: string;
}

type TransformOption =
  | 'none'
  | 'uppercase'
  | 'lowercase'
  | 'capitalize'
  | 'trim'
  | 'phone_format'
  | 'date_format';

const transformOptions: {
  value: TransformOption;
  label: string;
  description: string;
}[] = [
  {
    value: 'none',
    label: 'Sin transformación',
    description: 'Mantener valor original',
  },
  {
    value: 'uppercase',
    label: 'MAYÚSCULAS',
    description: 'Convertir a mayúsculas',
  },
  {
    value: 'lowercase',
    label: 'minúsculas',
    description: 'Convertir a minúsculas',
  },
  {
    value: 'capitalize',
    label: 'Capitalizar',
    description: 'Primera letra mayúscula',
  },
  {
    value: 'trim',
    label: 'Limpiar espacios',
    description: 'Eliminar espacios al inicio y final',
  },
  {
    value: 'phone_format',
    label: 'Formato teléfono',
    description: 'Normalizar formato de teléfono',
  },
  {
    value: 'date_format',
    label: 'Formato fecha',
    description: 'Convertir a formato ISO (YYYY-MM-DD)',
  },
];

export function FieldMapper({
  csvHeaders,
  fieldMappings: initialMappings,
  suggestions = [],
  sampleData = [],
  onMappingsChange,
  onPreview,
  className,
}: FieldMapperProps) {
  const [mappings, setMappings] = useState<FieldMapping[]>(initialMappings);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<number | null>(null);

  // Initialize mappings from suggestions if not provided
  useEffect(() => {
    if (initialMappings.length === 0 && suggestions.length > 0) {
      const autoMappings: FieldMapping[] = csvHeaders.map((header) => {
        const suggestion = suggestions.find((s) => s.csv_column === header);
        return {
          csv_column: header,
          system_field: suggestion?.suggested_field || null,
          is_required: suggestion
            ? CLIENT_SYSTEM_FIELDS.find(
                (f) => f.key === suggestion.suggested_field
              )?.required || false
            : false,
          transform: 'none',
        };
      });
      setMappings(autoMappings);
      onMappingsChange(autoMappings);
    } else {
      setMappings(initialMappings);
    }
  }, [csvHeaders, suggestions, initialMappings, onMappingsChange]);

  const updateMapping = (index: number, updates: Partial<FieldMapping>) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], ...updates };

    // Update required status based on system field
    if (updates.system_field !== undefined) {
      const systemField = CLIENT_SYSTEM_FIELDS.find(
        (f) => f.key === updates.system_field
      );
      newMappings[index].is_required = systemField?.required || false;
    }

    setMappings(newMappings);
    onMappingsChange(newMappings);
  };

  const addMapping = () => {
    const newMapping: FieldMapping = {
      csv_column: '',
      system_field: null,
      is_required: false,
      transform: 'none',
    };
    const newMappings = [...mappings, newMapping];
    setMappings(newMappings);
    onMappingsChange(newMappings);
  };

  const removeMapping = (index: number) => {
    const newMappings = mappings.filter((_, i) => i !== index);
    setMappings(newMappings);
    onMappingsChange(newMappings);
  };

  const applyAutoMapping = () => {
    const autoMappings: FieldMapping[] = csvHeaders.map((header) => {
      const suggestion = suggestions.find((s) => s.csv_column === header);
      return {
        csv_column: header,
        system_field: suggestion?.suggested_field || null,
        is_required: suggestion
          ? CLIENT_SYSTEM_FIELDS.find(
              (f) => f.key === suggestion.suggested_field
            )?.required || false
          : false,
        transform: 'none',
      };
    });
    setMappings(autoMappings);
    onMappingsChange(autoMappings);
  };

  const resetMappings = () => {
    const resetMappings: FieldMapping[] = csvHeaders.map((header) => ({
      csv_column: header,
      system_field: null,
      is_required: false,
      transform: 'none',
    }));
    setMappings(resetMappings);
    onMappingsChange(resetMappings);
  };

  const getAvailableSystemFields = (
    currentMapping: FieldMapping
  ): SystemField[] => {
    const usedFields = mappings
      .filter((m) => m !== currentMapping && m.system_field)
      .map((m) => m.system_field);

    return CLIENT_SYSTEM_FIELDS.filter(
      (field) => !usedFields.includes(field.key)
    );
  };

  const getMappingStatus = (mapping: FieldMapping) => {
    if (!mapping.system_field) {
      return { status: 'unmapped', color: 'text-gray-500', icon: AlertCircle };
    }

    const systemField = CLIENT_SYSTEM_FIELDS.find(
      (f) => f.key === mapping.system_field
    );
    if (systemField?.required) {
      return { status: 'required', color: 'text-green-600', icon: CheckCircle };
    }

    return { status: 'optional', color: 'text-blue-600', icon: CheckCircle };
  };

  const getMappingConfidence = (csvColumn: string): number => {
    const suggestion = suggestions.find((s) => s.csv_column === csvColumn);
    return suggestion?.confidence || 0;
  };

  const getRequiredFieldsStatus = () => {
    const requiredFields = CLIENT_SYSTEM_FIELDS.filter((f) => f.required);
    const mappedRequiredFields = mappings
      .filter(
        (m) =>
          m.system_field &&
          requiredFields.some((rf) => rf.key === m.system_field)
      )
      .map((m) => m.system_field);

    const missingFields = requiredFields.filter(
      (rf) => !mappedRequiredFields.includes(rf.key)
    );

    return {
      total: requiredFields.length,
      mapped: mappedRequiredFields.length,
      missing: missingFields,
    };
  };

  const previewTransform = (
    value: string,
    transform?: TransformOption
  ): string => {
    if (!transform || transform === 'none') return value;

    switch (transform) {
      case 'uppercase':
        return value.toUpperCase();
      case 'lowercase':
        return value.toLowerCase();
      case 'capitalize':
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      case 'trim':
        return value.trim();
      case 'phone_format':
        return ImportExportService.normalizePhone(value);
      case 'date_format':
        try {
          return ImportExportService.formatDate(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  };

  const renderMappingRow = (mapping: FieldMapping, index: number) => {
    const status = getMappingStatus(mapping);
    const confidence = getMappingConfidence(mapping.csv_column);
    const availableFields = getAvailableSystemFields(mapping);
    const isSelected = selectedMapping === index;

    return (
      <Card
        key={index}
        className={cn(
          'p-4 transition-all cursor-pointer',
          isSelected
            ? 'ring-2 ring-primary-500 bg-primary-50'
            : 'hover:shadow-md'
        )}
        onClick={() => setSelectedMapping(isSelected ? null : index)}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-medium">{mapping.csv_column}</span>
              {confidence > 0 && (
                <Badge
                  variant={confidence > 0.8 ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {(confidence * 100).toFixed(0)}% confianza
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <status.icon className={cn('h-4 w-4', status.color)} />
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  removeMapping(index);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mapping Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Campo del Sistema</Label>
              <Select
                value={mapping.system_field || ''}
                onValueChange={(value) =>
                  updateMapping(index, {
                    system_field: (value as keyof ApiClient) || null,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar campo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No mapear</SelectItem>
                  {availableFields.map((field) => (
                    <SelectItem key={field.key} value={field.key || ''}>
                      <div className="flex items-center justify-between w-full">
                        <span>{field.label}</span>
                        {field.required && (
                          <Badge variant="destructive" className="text-xs ml-2">
                            Requerido
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm">Transformación</Label>
              <Select
                value={mapping.transform || 'none'}
                onValueChange={(value: TransformOption) =>
                  updateMapping(index, { transform: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transformOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value || ''}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-gray-500">
                          {option.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Default Value */}
          {isSelected && (
            <div>
              <Label className="text-sm">Valor por Defecto (opcional)</Label>
              <Input
                value={mapping.default_value || ''}
                onChange={(e) =>
                  updateMapping(index, { default_value: e.target.value })
                }
                placeholder="Valor a usar si la celda está vacía"
              />
            </div>
          )}

          {/* Preview */}
          {sampleData.length > 0 && mapping.csv_column && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <Label className="text-xs text-gray-600 mb-2 block">
                Vista Previa
              </Label>
              <div className="space-y-1">
                {sampleData.slice(0, 3).map((row, rowIndex) => {
                  const csvIndex = csvHeaders.indexOf(mapping.csv_column);
                  const originalValue = csvIndex >= 0 ? row[csvIndex] : '';
                  const transformedValue = previewTransform(
                    originalValue,
                    mapping.transform
                  );

                  return (
                    <div
                      key={rowIndex}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="text-gray-500 w-16">
                        Fila {rowIndex + 1}:
                      </span>
                      <span className="font-mono bg-white px-2 py-1 rounded border">
                        {originalValue}
                      </span>
                      {mapping.transform && mapping.transform !== 'none' && (
                        <>
                          <ArrowRight className="h-3 w-3 text-gray-400" />
                          <span className="font-mono bg-primary-50 px-2 py-1 rounded border border-primary-200">
                            {transformedValue}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Field Info */}
          {mapping.system_field && (
            <div className="bg-blue-50 p-3 rounded-lg">
              {(() => {
                const systemField = CLIENT_SYSTEM_FIELDS.find(
                  (f) => f.key === mapping.system_field
                );
                if (!systemField) return null;

                return (
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Tipo:</span>
                      <Badge variant="outline">{systemField.type}</Badge>
                      {systemField.required && (
                        <Badge variant="destructive" className="text-xs">
                          Requerido
                        </Badge>
                      )}
                    </div>
                    {systemField.example && (
                      <div>
                        <span className="font-medium">Ejemplo:</span>
                        <span className="ml-2 font-mono text-gray-600">
                          {systemField.example}
                        </span>
                      </div>
                    )}
                    {systemField.description && (
                      <div>
                        <span className="font-medium">Descripción:</span>
                        <span className="ml-2 text-gray-600">
                          {systemField.description}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </Card>
    );
  };

  const requiredStatus = getRequiredFieldsStatus();

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Mapeo de Campos
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Define cómo se mapean las columnas de tu archivo a los campos del
            sistema
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetMappings}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
          {suggestions.length > 0 && (
            <Button variant="outline" size="sm" onClick={applyAutoMapping}>
              <Wand2 className="h-4 w-4 mr-2" />
              Auto-mapear
            </Button>
          )}
          {onPreview && (
            <Button size="sm" onClick={onPreview}>
              <Eye className="h-4 w-4 mr-2" />
              Vista Previa
            </Button>
          )}
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="font-medium">Campos Requeridos</span>
          </div>
          <div className="text-2xl font-bold">
            {requiredStatus.mapped}/{requiredStatus.total}
          </div>
          <p className="text-sm text-gray-500">
            {requiredStatus.missing.length === 0
              ? 'Todos mapeados'
              : `${requiredStatus.missing.length} faltantes`}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-5 w-5 text-blue-500" />
            <span className="font-medium">Campos Mapeados</span>
          </div>
          <div className="text-2xl font-bold">
            {mappings.filter((m) => m.system_field).length}/{mappings.length}
          </div>
          <p className="text-sm text-gray-500">Columnas asignadas</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wand2 className="h-5 w-5 text-purple-500" />
            <span className="font-medium">Transformaciones</span>
          </div>
          <div className="text-2xl font-bold">
            {
              mappings.filter((m) => m.transform && m.transform !== 'none')
                .length
            }
          </div>
          <p className="text-sm text-gray-500">Aplicadas</p>
        </Card>
      </div>

      {/* Missing Required Fields Warning */}
      {requiredStatus.missing.length > 0 && (
        <Card className="p-4 border-yellow-200 bg-yellow-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-900">
                Campos Requeridos Faltantes
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Los siguientes campos son requeridos pero no están mapeados:
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {requiredStatus.missing.map((field) => (
                  <Badge
                    key={field.key}
                    variant="destructive"
                    className="text-xs"
                  >
                    {field.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Mappings List */}
      <div className="space-y-3">
        {mappings.map((mapping, index) => renderMappingRow(mapping, index))}
      </div>

      {/* Add Mapping Button */}
      <div className="text-center">
        <Button variant="outline" onClick={addMapping}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar Mapeo Manual
        </Button>
      </div>

      {/* Validation Summary */}
      <Card className="p-4 bg-gray-50">
        <h3 className="font-medium mb-3">Resumen de Validación</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>
                Campos válidos: {mappings.filter((m) => m.system_field).length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span>
                Campos requeridos faltantes: {requiredStatus.missing.length}
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Settings className="h-4 w-4 text-blue-500" />
              <span>
                Transformaciones:{' '}
                {
                  mappings.filter((m) => m.transform && m.transform !== 'none')
                    .length
                }
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-purple-500" />
              <span>
                Confianza promedio:{' '}
                {suggestions.length > 0
                  ? Math.round(
                      (suggestions.reduce((acc, s) => acc + s.confidence, 0) /
                        suggestions.length) *
                        100
                    )
                  : 0}
                %
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
