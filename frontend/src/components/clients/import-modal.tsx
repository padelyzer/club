'use client';

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
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
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  X,
  Settings,
  Eye,
  Download,
  RotateCcw,
  FileSpreadsheet,
  Users,
  AlertTriangle,
} from 'lucide-react';
import {
  ImportConfig,
  ImportModalState,
  ImportStep,
  CSVDetectionResult,
  ImportPreviewData,
  DuplicateDetection,
  DuplicateStrategy,
  CSV_DELIMITERS,
  FILE_ENCODINGS,
  DEFAULT_FILE_VALIDATION,
  FieldMapping,
} from '@/types/import-export';
import { ImportExportService } from '@/lib/api/services/import-export.service';
import { useClientsStore } from '@/store/clientsStore';
import { cn } from '@/lib/utils';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (result: any) => void;
}

function ImportModalComponent({
  isOpen,
  onClose,
  onImportComplete,
}: ImportModalProps) {
  const { addClient, updateClient } = useClientsStore();

  const [state, setState] = useState<ImportModalState>({
    isOpen: false,
    currentStep: 'upload',
    config: {
      has_header: true,
      delimiter: ',',
      encoding: 'UTF-8',
      field_mappings: [],
      duplicate_strategy: 'ask',
      validate_email: true,
      validate_phone: true,
      skip_invalid_rows: false,
      chunk_size: 100,
    } as Partial<ImportConfig>,
    duplicates: [],
  });

  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setState((prev) => ({
        ...prev,
        isOpen: true,
        currentStep: 'upload',
        config: {
          has_header: true,
          delimiter: ',',
          encoding: 'UTF-8',
          field_mappings: [],
          duplicate_strategy: 'ask',
          validate_email: true,
          validate_phone: true,
          skip_invalid_rows: false,
          chunk_size: 100,
        } as Partial<ImportConfig>,
        duplicates: [],
        previewData: undefined,
        progress: undefined,
        result: undefined,
      }));
      setUploadError(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  const updateConfig = (updates: Partial<ImportConfig>) => {
    setState((prev) => ({
      ...prev,
      config: { ...prev.config, ...updates },
    }));
  };

  // File drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = async (file: File) => {
    setUploadError(null);

    // Validate file
    try {
      const validation = await ImportExportService.validateImportFile(file);
      if (!validation.valid) {
        setUploadError(validation.errors.join(', '));
        return;
      }

      if (validation.warnings.length > 0) {
              }
    } catch (error) {
      setUploadError('Error validating file. Please check the file format.');
      return;
    }

    // Check file size
    if (file.size > DEFAULT_FILE_VALIDATION.max_file_size) {
      setUploadError(
        `File is too large. Maximum size is ${ImportExportService.formatFileSize(
          DEFAULT_FILE_VALIDATION.max_file_size
        )}`
      );
      return;
    }

    // Check file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!DEFAULT_FILE_VALIDATION.allowed_extensions.includes(extension)) {
      setUploadError(
        `Unsupported file format. Allowed formats: ${DEFAULT_FILE_VALIDATION.allowed_extensions.join(', ')}`
      );
      return;
    }

    updateConfig({ file });

    // Auto-detect CSV format
    if (extension === '.csv') {
      try {
        const detection = await ImportExportService.detectCSVFormat(file);
        updateConfig({
          delimiter: detection.delimiter,
          has_header: detection.has_header,
          encoding: detection.encoding,
        });
      } catch (error) {
              }
    }

    setState((prev) => ({ ...prev, currentStep: 'configure' }));
  };

  const handlePreview = async () => {
    if (!state.config.file) return;

    setIsProcessing(true);
    try {
      const previewData = await ImportExportService.previewImport(
        state.config as ImportConfig
      );

      setState((prev) => ({
        ...prev,
        currentStep: 'preview',
        previewData,
      }));
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : 'Error generating preview'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDetectDuplicates = async () => {
    if (!state.config.file) return;

    setIsProcessing(true);
    try {
      const duplicates = await ImportExportService.detectDuplicates(
        state.config as ImportConfig
      );

      setState((prev) => ({
        ...prev,
        currentStep: 'duplicates',
        duplicates,
      }));
    } catch (error) {
            // Continue to processing if duplicate detection fails
      handleStartImport();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartImport = async () => {
    if (!state.config.file) return;

    setIsProcessing(true);
    try {
      const { operation_id } = await ImportExportService.startImport(
        state.config as ImportConfig
      );

      setState((prev) => ({
        ...prev,
        currentStep: 'processing',
        progress: {
          id: operation_id,
          type: 'import',
          state: 'processing',
          progress_percentage: 0,
          current_step: 'Starting import...',
          total_steps: 4,
          completed_steps: 0,
          start_time: new Date().toISOString(),
        },
      }));

      pollImportProgress(operation_id);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : 'Error starting import'
      );
      setState((prev) => ({ ...prev, currentStep: 'configure' }));
    } finally {
      setIsProcessing(false);
    }
  };

  const pollImportProgress = async (operationId: string) => {
    const interval = setInterval(async () => {
      try {
        const progress =
          await ImportExportService.getImportProgress(operationId);

        setState((prev) => ({
          ...prev,
          progress,
        }));

        if (progress.state === 'completed') {
          clearInterval(interval);
          const result = await ImportExportService.getImportResult(operationId);

          setState((prev) => ({
            ...prev,
            currentStep: 'results',
            result,
          }));

          onImportComplete?.(result);
        } else if (progress.state === 'error') {
          clearInterval(interval);
          setState((prev) => ({
            ...prev,
            currentStep: 'configure',
          }));
        }
      } catch (error) {
        clearInterval(interval);
              }
    }, 2000);

    // Cleanup interval after 10 minutes
    setTimeout(() => clearInterval(interval), 600000);
  };

  const handleClose = () => {
    setState({
      isOpen: false,
      currentStep: 'upload',
      config: {
        has_header: true,
        delimiter: ',',
        encoding: 'UTF-8',
        field_mappings: [],
        duplicate_strategy: 'ask',
        validate_email: true,
        validate_phone: true,
        skip_invalid_rows: false,
        chunk_size: 100,
      } as Partial<ImportConfig>,
      duplicates: [],
    });
    setUploadError(null);
    setIsProcessing(false);
    onClose();
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragOver
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium mb-2">
          Selecciona o arrastra tu archivo
        </h3>
        <p className="text-gray-500 mb-4">
          Formatos soportados: CSV, Excel (.xlsx, .xls)
        </p>
        <p className="text-sm text-gray-400 mb-6">
          Tamaño máximo:{' '}
          {ImportExportService.formatFileSize(
            DEFAULT_FILE_VALIDATION.max_file_size
          )}
        </p>

        <Button onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" />
          Seleccionar Archivo
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {uploadError && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <p className="font-medium">Error</p>
          </div>
          <p className="text-red-600 text-sm mt-1">{uploadError}</p>
        </Card>
      )}

      <Card className="p-4 bg-blue-50">
        <h4 className="font-medium text-blue-900 mb-2">
          Consejos para una importación exitosa:
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            • Asegúrate de que tu archivo tenga encabezados en la primera fila
          </li>
          <li>
            • Los emails deben tener un formato válido (ejemplo@dominio.com)
          </li>
          <li>• Las fechas deben estar en formato YYYY-MM-DD</li>
          <li>• Los campos requeridos son: nombre, apellido y email</li>
        </ul>
      </Card>
    </div>
  );

  const renderConfigureStep = () => (
    <div className="space-y-6">
      {/* File Info */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary-600" />
          <div className="flex-1">
            <p className="font-medium">{state.config.file?.name}</p>
            <p className="text-sm text-gray-500">
              {state.config.file &&
                ImportExportService.formatFileSize(state.config.file.size)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setState((prev) => ({ ...prev, currentStep: 'upload' }))
            }
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* CSV Configuration (only for CSV files) */}
      {state.config.file?.name.endsWith('.csv') && (
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración CSV
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Delimitador</Label>
              <Select
                value={state.config.delimiter || ''}
                onValueChange={(value) => updateConfig({ delimiter: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=",">Coma (,)</SelectItem>
                  <SelectItem value=";">Punto y coma (;)</SelectItem>
                  <SelectItem value="\t">Tabulación</SelectItem>
                  <SelectItem value="|">Barra vertical (|)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Codificación</Label>
              <Select
                value={state.config.encoding || ''}
                onValueChange={(value) => updateConfig({ encoding: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILE_ENCODINGS.map((encoding) => (
                    <SelectItem key={encoding} value={encoding || ''}>
                      {encoding}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="has_header"
              checked={state.config.has_header}
              onChange={(e) => updateConfig({ has_header: e.target.checked })}
              className="rounded border-gray-300 focus:ring-primary-500"
            />
            <Label htmlFor="has_header">
              El archivo tiene encabezados en la primera fila
            </Label>
          </div>
        </div>
      )}

      {/* Import Options */}
      <div className="space-y-4">
        <h3 className="font-medium">Opciones de Importación</h3>

        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="validate_email"
              checked={state.config.validate_email}
              onChange={(e) =>
                updateConfig({ validate_email: e.target.checked })
              }
              className="rounded border-gray-300 focus:ring-primary-500"
            />
            <Label htmlFor="validate_email">Validar formato de email</Label>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="validate_phone"
              checked={state.config.validate_phone}
              onChange={(e) =>
                updateConfig({ validate_phone: e.target.checked })
              }
              className="rounded border-gray-300 focus:ring-primary-500"
            />
            <Label htmlFor="validate_phone">Validar formato de teléfono</Label>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="skip_invalid_rows"
              checked={state.config.skip_invalid_rows}
              onChange={(e) =>
                updateConfig({ skip_invalid_rows: e.target.checked })
              }
              className="rounded border-gray-300 focus:ring-primary-500"
            />
            <Label htmlFor="skip_invalid_rows">Omitir filas con errores</Label>
          </div>
        </div>

        <div>
          <Label>Estrategia para duplicados</Label>
          <Select
            value={state.config.duplicate_strategy || ''}
            onValueChange={(value: DuplicateStrategy) =>
              updateConfig({ duplicate_strategy: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ask">Preguntar para cada duplicado</SelectItem>
              <SelectItem value="skip">Omitir duplicados</SelectItem>
              <SelectItem value="update">Actualizar existentes</SelectItem>
              <SelectItem value="duplicate">Crear duplicados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Vista Previa de Datos
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreview}
          disabled={isProcessing}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {state.previewData && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {state.previewData.validation_summary.valid_rows}
              </p>
              <p className="text-xs text-gray-500">Filas válidas</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">
                {state.previewData.validation_summary.invalid_rows}
              </p>
              <p className="text-xs text-gray-500">Filas con errores</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {state.previewData.validation_summary.warnings_count}
              </p>
              <p className="text-xs text-gray-500">Advertencias</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {state.previewData.total_rows}
              </p>
              <p className="text-xs text-gray-500">Total filas</p>
            </Card>
          </div>

          {/* Sample Data Table */}
          <Card className="p-4">
            <h4 className="font-medium mb-3">Muestra de Datos</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {state.previewData.headers.map((header, index) => (
                      <th key={index} className="text-left p-2 font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.previewData.sample_rows
                    .slice(0, 5)
                    .map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b">
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="p-2">
                            {String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );

  const renderProcessingStep = () => (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>

      <div>
        <h3 className="font-medium mb-2">Procesando Importación</h3>
        <p className="text-sm text-gray-500 mb-4">
          {state.progress?.current_step || 'Iniciando importación...'}
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

      <Button
        variant="outline"
        onClick={() => {
          if (state.progress?.id) {
            ImportExportService.cancelImport(state.progress.id);
          }
          handleClose();
        }}
      >
        Cancelar
      </Button>
    </div>
  );

  const renderResultsStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="font-medium mb-2">Importación Completada</h3>
      </div>

      {state.result && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {state.result.imported_count}
              </p>
              <p className="text-sm text-gray-500">Registros importados</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {state.result.updated_count}
              </p>
              <p className="text-sm text-gray-500">Registros actualizados</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {state.result.skipped_count}
              </p>
              <p className="text-sm text-gray-500">Registros omitidos</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">
                {state.result.error_count}
              </p>
              <p className="text-sm text-gray-500">Errores</p>
            </Card>
          </div>

          {/* Errors and Warnings */}
          {(state.result.errors.length > 0 ||
            state.result.warnings.length > 0) && (
            <Card className="p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Errores y Advertencias
              </h4>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {state.result.errors.map((error, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Fila {error.row}:</span>
                      <span className="text-gray-600 ml-1">
                        {error.message}
                      </span>
                    </div>
                  </div>
                ))}

                {state.result.warnings.map((warning, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">Fila {warning.row}:</span>
                      <span className="text-gray-600 ml-1">
                        {warning.message}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {state.result.errors.length > 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    if (state.progress?.id) {
                      ImportExportService.downloadImportErrorLog(
                        state.progress.id
                      )
                        .then((blob) => {
                          ImportExportService.downloadBlob(
                            blob,
                            'import-errors.csv'
                          );
                        })
                        .catch(console.error);
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar log completo
                </Button>
              )}
            </Card>
          )}

          {/* Processing Time */}
          <Card className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Tiempo de procesamiento:</span>
              <span className="font-medium">
                {(state.result.processing_time / 1000).toFixed(2)} segundos
              </span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );

  const getStepTitle = () => {
    switch (state.currentStep) {
      case 'upload':
        return 'Subir Archivo';
      case 'configure':
        return 'Configurar Importación';
      case 'mapping':
        return 'Mapear Campos';
      case 'preview':
        return 'Vista Previa';
      case 'duplicates':
        return 'Revisar Duplicados';
      case 'processing':
        return 'Procesando';
      case 'results':
        return 'Resultados';
      default:
        return 'Importar Clientes';
    }
  };

  const canProceed = () => {
    switch (state.currentStep) {
      case 'upload':
        return !!state.config.file && !uploadError;
      case 'configure':
        return !!state.config.file && !isProcessing;
      case 'preview':
        return !!state.previewData && !isProcessing;
      default:
        return false;
    }
  };

  const nextStep = () => {
    switch (state.currentStep) {
      case 'configure':
        handlePreview();
        break;
      case 'preview':
        if (state.config.duplicate_strategy === 'ask') {
          handleDetectDuplicates();
        } else {
          handleStartImport();
        }
        break;
      case 'duplicates':
        handleStartImport();
        break;
    }
  };

  const prevStep = () => {
    switch (state.currentStep) {
      case 'configure':
        setState((prev) => ({ ...prev, currentStep: 'upload' }));
        break;
      case 'preview':
        setState((prev) => ({ ...prev, currentStep: 'configure' }));
        break;
      case 'duplicates':
        setState((prev) => ({ ...prev, currentStep: 'preview' }));
        break;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {getStepTitle()}
          </DialogTitle>
          <DialogDescription>
            {state.currentStep === 'upload' &&
              'Selecciona un archivo CSV o Excel para importar clientes.'}
            {state.currentStep === 'configure' &&
              'Configura las opciones de importación.'}
            {state.currentStep === 'preview' &&
              'Revisa los datos antes de importar.'}
            {state.currentStep === 'processing' &&
              'Procesando la importación de clientes.'}
            {state.currentStep === 'results' && 'Resultados de la importación.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[400px]">
          {state.currentStep === 'upload' && renderUploadStep()}
          {state.currentStep === 'configure' && renderConfigureStep()}
          {state.currentStep === 'preview' && renderPreviewStep()}
          {state.currentStep === 'processing' && renderProcessingStep()}
          {state.currentStep === 'results' && renderResultsStep()}
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <div>
              {['configure', 'preview', 'duplicates'].includes(
                state.currentStep
              ) && (
                <Button variant="outline" onClick={prevStep}>
                  Anterior
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                {state.currentStep === 'results' ? 'Cerrar' : 'Cancelar'}
              </Button>

              {state.currentStep !== 'processing' &&
                state.currentStep !== 'results' && (
                  <Button onClick={nextStep} disabled={!canProceed()}>
                    {state.currentStep === 'preview' ? 'Importar' : 'Siguiente'}
                  </Button>
                )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const ImportModal = memo(ImportModalComponent);
