'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Download,
  FileText,
  Table,
  FileSpreadsheet,
  Save,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Settings,
  FileText as Template,
  Filter,
} from 'lucide-react';
import {
  ExportConfig,
  ExportFormat,
  ExportTemplate,
  ExportModalState,
  ExportStep,
  CLIENT_SYSTEM_FIELDS,
  DEFAULT_EXPORT_TEMPLATES,
} from '@/types/import-export';
import { ApiClient, ApiClientFilters } from '@/types/client';
import { ImportExportService } from '@/lib/api/services/import-export.service';
import { useClientsStore } from '@/store/clientsStore';
import { cn } from '@/lib/utils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters?: ApiClientFilters;
}

const formatIcons: Record<
  ExportFormat,
  React.ComponentType<{ className?: string }>
> = {
  csv: FileText,
  xlsx: FileSpreadsheet,
  pdf: FileText,
  json: Table
};

const formatLabels: Record<ExportFormat, string> = {
  csv: 'CSV - Comma Separated Values',
  xlsx: 'Excel - Microsoft Excel Spreadsheet',
  pdf: 'PDF - Portable Document Format',
  json: 'JSON - JavaScript Object Notation'
};

export function ExportModal({
  isOpen,
  onClose,
  currentFilters,
}: ExportModalProps) {
  const { clients, totalClients } = useClientsStore();

  const [state, setState] = useState<ExportModalState>({
    isOpen: false,
    currentStep: 'configure',
    config: {
      format: 'csv',
      include_headers: true,
      selected_fields: ['first_name', 'last_name', 'email', 'phone'],
      filters: currentFilters,
      include_stats: false
    },
    templates: []
  });

  const [customFilename, setCustomFilename] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Load templates on mount
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setState((prev) => ({
        ...prev,
        isOpen: true,
        config: {
          ...prev.config,
          filters: currentFilters
        }
      }));
    }
  }, [isOpen, currentFilters]);

  const loadTemplates = async () => {
    try {
      const templates = await ImportExportService.getExportTemplates();
      setState((prev) => ({
        ...prev,
        templates: [
          ...templates,
          ...DEFAULT_EXPORT_TEMPLATES.map((t, i) => ({
            ...t,
            id: `default-${i}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))
        ]
      }));
    } catch (error) {
            // Use default templates if API fails
      setState((prev) => ({
        ...prev,
        templates: DEFAULT_EXPORT_TEMPLATES.map((t, i) => ({
          ...t,
          id: `default-${i}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      }));
    }
  };

  const updateConfig = (updates: Partial<ExportConfig>) => {
    setState((prev) => ({
        ...prev,
      config: { ...prev.config, ...updates },
    }));
  };

  const selectTemplate = (templateId: string) => {
    const template = state.templates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      updateConfig({
        format: template.format,
        ...template.config
      });
    }
  };

  const toggleField = (field: keyof ApiClient) => {
    const currentFields = state.config.selected_fields || [];
    const newFields = currentFields.includes(field)
      ? currentFields.filter((f) => f !== field)
      : [...currentFields, field];

    updateConfig({ selected_fields: newFields });
  };

  const handleExport = async () => {
    if (!state.config.format || !state.config.selected_fields?.length) {
      return;
    }

    setIsProcessing(true);

    try {
      const filename =
        customFilename ||
        ImportExportService.generateFilename('clientes', state.config.format);

      const exportConfig: ExportConfig = {
        ...state.config,
        filename,
      };

      // For large datasets, use async export
      if (totalClients > 1000) {
        const { operation_id } =
          await ImportExportService.startExport(exportConfig);

        setState((prev) => ({
        ...prev,
        currentStep: 'processing',
        progress: {
            id: operation_id,
            type: 'export',
            state: 'processing',
            progress_percentage: 0,
            current_step: 'Preparing export...',
            total_steps: 3,
            completed_steps: 0,
            start_time: new Date().toISOString()
          },
        }));

        // Poll for progress
        pollExportProgress(operation_id);
      } else {
        // For small datasets, use quick export
        let blob: Blob;

        switch (state.config.format) {
          case 'csv':
            blob = await ImportExportService.exportToCSV(state.config.filters);
            break;
          case 'xlsx':
            blob = await ImportExportService.exportToExcel(
              state.config.filters
            );
            break;
          case 'pdf':
            blob = await ImportExportService.exportToPDF(state.config.filters);
            break;
          case 'json':
            blob = await ImportExportService.exportToJSON(state.config.filters);
            break;
          default: 
            throw new Error('Unsupported format');
        }

        ImportExportService.downloadBlob(blob, filename);
        handleClose();
      }
    } catch (error) {
            setState((prev) => ({
        ...prev,
        currentStep: 'configure',
        progress: {
          ...prev.progress!,
          state: 'error',
          error_message: error instanceof Error ? error.message : 'Error during export'
        }
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const pollExportProgress = async (operationId: string) => {
    const interval = setInterval(async () => {
      try {
        const progress =
          await ImportExportService.getExportProgress(operationId);

        setState((prev) => ({
        ...prev,
          progress,
        }));

        if (progress.state === 'completed') {
          clearInterval(interval);
          const result = await ImportExportService.getExportResult(operationId);

          setState((prev) => ({
        ...prev,
        currentStep: 'download',
        result
      }));
        } else if (progress.state === 'error') {
          clearInterval(interval);
          setState((prev) => ({
        ...prev,
        currentStep: 'configure'
      }));
        }
      } catch (error) {
        clearInterval(interval);
              }
    }, 2000);

    // Cleanup interval after 5 minutes
    setTimeout(() => clearInterval(interval), 300000);
  };

  const handleDownload = async () => {
    if (!state.progress?.id) return;

    try {
      const blob = await ImportExportService.downloadExportFile(
        state.progress.id
      );
      const filename =
        state.result?.filename ||
        ImportExportService.generateFilename('clientes', state.config.format);

      ImportExportService.downloadBlob(blob, filename);
      handleClose();
    } catch (error) {
          }
  };

  const handleClose = () => {
    setState({
      isOpen: false,
      currentStep: 'configure',
      config: {
        format: 'csv',
        include_headers: true,
        selected_fields: ['first_name', 'last_name', 'email', 'phone'],
        filters: currentFilters,
        include_stats: false
      },
      templates: []
    });
    setCustomFilename('');
    setSelectedTemplateId('');
    setIsProcessing(false);
    onClose();
  };

  const renderConfigureStep = () => (
    <div className="space-y-6">
      {/* Template Selection */}
      <div>
        <Label className="text-sm font-medium mb-2 flex items-center gap-2">
          <Template className="h-4 w-4" />
          Plantilla de Exportación
        </Label>
        <Select value={selectedTemplateId || ''} onValueChange={selectTemplate}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una plantilla o configura manualmente" />
          </SelectTrigger>
          <SelectContent>
            {state.templates.map((template) => (
              <SelectItem key={template.id} value={template.id || ''}>
                <div className="flex items-center gap-2">
                  <span>{template.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {template.format.toUpperCase()}
                  </Badge>
                  {template.is_default && (
                    <Badge variant="secondary" className="text-xs">
                      Por defecto
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedTemplateId && (
          <p className="text-xs text-gray-500 mt-1">
            {
              state.templates.find((t) => t.id === selectedTemplateId)
                ?.description
            }
          </p>
        )}
      </div>

      {/* Format Selection */}
      <div>
        <Label className="text-sm font-medium mb-2">
          Formato de Exportación
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(formatLabels) as ExportFormat[]).map((format) => {
            const Icon = formatIcons[format];
            return (
              <Card
                key={format}
                className={cn(
                  'p-4 cursor-pointer transition-all border-2 hover:border-primary-500',
                  state.config.format === format
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200'
                )}
                onClick={() => updateConfig({ format })}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-6 w-6 text-primary-600" />
                  <div>
                    <p className="font-medium text-sm">
                      {format.toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatLabels[format].split(' - ')[1]}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Custom Filename */}
      <div>
        <Label htmlFor="filename" className="text-sm font-medium mb-2">
          Nombre del Archivo (opcional)
        </Label>
        <Input
          id="filename"
          value={customFilename || ''}
          onChange={(e) => setCustomFilename(e.target.value)}
          placeholder={`clientes_${new Date().toISOString().split('T')[0]}.${state.config.format}`}
        />
      </div>

      {/* Export Options */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Opciones de Exportación</Label>

        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="include_headers"
            checked={state.config.include_headers}
            onChange={(e) =>
              updateConfig({ include_headers: e.target.checked })
            }
            className="rounded border-gray-300 focus:ring-primary-500"
          />
          <Label htmlFor="include_headers" className="text-sm">
            Incluir encabezados
          </Label>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="include_stats"
            checked={state.config.include_stats}
            onChange={(e) => updateConfig({ include_stats: e.target.checked })}
            className="rounded border-gray-300 focus:ring-primary-500"
          />
          <Label htmlFor="include_stats" className="text-sm">
            Incluir estadísticas
          </Label>
        </div>
      </div>
    </div>
  );

  const renderFieldsStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-5 w-5 text-primary-600" />
        <h3 className="font-medium">Seleccionar Campos a Exportar</h3>
      </div>

      <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
        {CLIENT_SYSTEM_FIELDS.map((field) => (
          <div
            key={field.key}
            className={cn(
              'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
              state.config.selected_fields?.includes(field.key)
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            )}
            onClick={() => toggleField(field.key)}
          >
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={
                  state.config.selected_fields?.includes(field.key) || false
                }
                onChange={() => toggleField(field.key)}
                className="rounded border-gray-300 focus:ring-primary-500"
              />
              <div>
                <p className="font-medium text-sm">{field.label}</p>
                {field.example && (
                  <p className="text-xs text-gray-500">ej: {field.example}</p>
                )}
              </div>
            </div>
            {field.required && (
              <Badge variant="destructive" className="text-xs">
                Requerido
              </Badge>
            )}
          </div>
        ))}
      </div>

      <div className="text-sm text-gray-500 mt-4">
        {state.config.selected_fields?.length || 0} campos seleccionados
      </div>
    </div>
  );

  const renderFiltersStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-primary-600" />
        <h3 className="font-medium">Filtros de Exportación</h3>
      </div>

      <Card className="p-4">
        <div className="space-y-3">
          <p className="text-sm font-medium">Filtros Actuales:</p>

          {currentFilters && Object.keys(currentFilters).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(currentFilters).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">
                    {key.replace('_', ' ')}:
                  </span>
                  <Badge variant="outline">{String(value)}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No hay filtros aplicados. Se exportarán todos los clientes.
            </p>
          )}

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              Total de registros a exportar: <strong>{totalClients}</strong>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>

      <div>
        <h3 className="font-medium mb-2">Procesando Exportación</h3>
        <p className="text-sm text-gray-500 mb-4">
          {state.progress?.current_step || 'Preparando exportación...'}
        </p>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${state.progress?.progress_percentage || 0}%` }}
          />
        </div>

        <p className="text-xs text-gray-500 mt-2">
          {state.progress?.progress_percentage || 0}% completado
        </p>
      </div>
    </div>
  );

  const renderDownloadStep = () => (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
      </div>

      <div>
        <h3 className="font-medium mb-2">Exportación Completada</h3>
        <p className="text-sm text-gray-500 mb-4">
          Tu archivo está listo para descargar.
        </p>

        {state.result && (
          <Card className="p-4 text-left">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Archivo:</span>
                <span className="font-medium">{state.result.filename}</span>
              </div>
              <div className="flex justify-between">
                <span>Formato:</span>
                <span className="font-medium">
                  {state.result.format.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Registros:</span>
                <span className="font-medium">
                  {state.result.total_records}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tamaño:</span>
                <span className="font-medium">
                  {ImportExportService.formatFileSize(state.result.file_size)}
                </span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );

  const getStepTitle = () => {
    switch (state.currentStep) {
      case 'configure':
        return 'Configurar Exportación';
      case 'fields':
        return 'Seleccionar Campos';
      case 'filters':
        return 'Revisar Filtros';
      case 'processing':
        return 'Procesando';
      case 'download':
        return 'Descargar';
      default: 
        return 'Exportar Clientes';
    }
  };

  const canProceed = () => {
    switch (state.currentStep) {
      case 'configure':
        return state.config.format && !isProcessing;
      case 'fields':
        return (
          state.config.selected_fields &&
          state.config.selected_fields.length > 0
        );
      case 'filters':
        return true;
      default: 
        return false;
    }
  };

  const nextStep = () => {
    switch (state.currentStep) {
      case 'configure':
        setState((prev) => ({
        ...prev, 
        currentStep: 'fields'
      }));
        break;
      case 'fields':
        setState((prev) => ({
        ...prev, 
        currentStep: 'filters'
      }));
        break;
      case 'filters':
        handleExport();
        break;
    }
  };

  const prevStep = () => {
    switch (state.currentStep) {
      case 'fields':
        setState((prev) => ({
        ...prev, 
        currentStep: 'configure'
      }));
        break;
      case 'filters':
        setState((prev) => ({
        ...prev, 
        currentStep: 'fields'
      }));
        break;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {getStepTitle()}
          </DialogTitle>
          <DialogDescription>
            {state.currentStep === 'configure' &&
              'Configura las opciones de exportación para tus clientes.'}
            {state.currentStep === 'fields' &&
              'Selecciona qué campos deseas incluir en la exportación.'}
            {state.currentStep === 'filters' &&
              'Revisa los filtros que se aplicarán a la exportación.'}
            {state.currentStep === 'processing' &&
              'Espera mientras procesamos tu exportación.'}
            {state.currentStep === 'download' &&
              'Tu exportación está lista para descargar.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[300px]">
          {state.currentStep === 'configure' && renderConfigureStep()}
          {state.currentStep === 'fields' && renderFieldsStep()}
          {state.currentStep === 'filters' && renderFiltersStep()}
          {state.currentStep === 'processing' && renderProcessingStep()}
          {state.currentStep === 'download' && renderDownloadStep()}
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <div>
              {state.currentStep !== 'configure' &&
                state.currentStep !== 'processing' &&
                state.currentStep !== 'download' && (
                  <Button variant="outline" onClick={prevStep}>
                    Anterior
                  </Button>
                )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                {state.currentStep === 'download' ? 'Cerrar' : 'Cancelar'}
              </Button>

              {state.currentStep === 'download' ? (
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
              ) : (
                state.currentStep !== 'processing' && (
                  <Button onClick={nextStep} disabled={!canProceed()}>
                    {state.currentStep === 'filters' ? 'Exportar' : 'Siguiente'}
                  </Button>
                )
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
