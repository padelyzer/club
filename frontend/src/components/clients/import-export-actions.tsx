'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Upload,
  FileText,
  FileSpreadsheet,
  Users,
  ChevronDown,
  Settings,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { ImportModal, ExportModal } from './import-export-index';
import { useClientsStore } from '@/store/clientsStore';
import { ImportExportService } from '@/lib/api/services/import-export.service';
import { cn } from '@/lib/utils';

interface ImportExportActionsProps {
  className?: string;
  showLabels?: boolean;
  variant?: 'default' | 'compact';
}

export function ImportExportActions({
  className,
  showLabels = true,
  variant = 'default',
}: ImportExportActionsProps) {
  const {
    filters,
    totalClients,
    importModal,
    exportModal,
    activeOperations,
    openImportModal,
    closeImportModal,
    openExportModal,
    closeExportModal,
    lastImportResult,
    lastExportResult,
  } = useClientsStore();

  const [quickExporting, setQuickExporting] = useState<string | null>(null);

  const activeImportOperations = activeOperations.filter(
    (op) => op.type === 'import'
  );
  const activeExportOperations = activeOperations.filter(
    (op) => op.type === 'export'
  );

  const handleQuickExport = async (format: 'csv' | 'xlsx' | 'pdf' | 'json') => {
    setQuickExporting(format);

    try {
      let blob: Blob;
      const filename = ImportExportService.generateFilename('clientes', format);

      switch (format) {
        case 'csv':
          blob = await ImportExportService.exportToCSV(filters);
          break;
        case 'xlsx':
          blob = await ImportExportService.exportToExcel(filters);
          break;
        case 'pdf':
          blob = await ImportExportService.exportToPDF(filters);
          break;
        case 'json':
          blob = await ImportExportService.exportToJSON(filters);
          break;
        default:
          throw new Error('Unsupported format');
      }

      ImportExportService.downloadBlob(blob, filename);
    } catch (error) {
            // You could show a toast notification here
    } finally {
      setQuickExporting(null);
    }
  };

  const getOperationStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={openImportModal}
          disabled={activeImportOperations.length > 0}
        >
          <Upload className="h-4 w-4" />
          {showLabels && activeImportOperations.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {activeImportOperations.length}
            </Badge>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={
                quickExporting !== null || activeExportOperations.length > 0
              }
            >
              <Download className="h-4 w-4" />
              {showLabels && activeExportOperations.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {activeExportOperations.length}
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleQuickExport('csv')}>
              <FileText className="h-4 w-4 mr-2" />
              Exportar CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleQuickExport('xlsx')}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar Excel
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={openExportModal}>
              <Settings className="h-4 w-4 mr-2" />
              Opciones Avanzadas...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ImportModal
          isOpen={importModal.isOpen}
          onClose={closeImportModal}
          onImportComplete={(result) => {
                        // Handle import completion
          }}
        />

        <ExportModal
          isOpen={exportModal.isOpen}
          onClose={closeExportModal}
          currentFilters={filters}
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={openImportModal}
          disabled={activeImportOperations.length > 0}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {showLabels && 'Importar Clientes'}
          {activeImportOperations.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeImportOperations.length} en progreso
            </Badge>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              disabled={
                quickExporting !== null || activeExportOperations.length > 0
              }
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {showLabels && 'Exportar Clientes'}
              {activeExportOperations.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeExportOperations.length} en progreso
                </Badge>
              )}
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2 text-sm font-medium border-b">
              Exportación Rápida
            </div>
            <DropdownMenuItem
              onClick={() => handleQuickExport('csv')}
              disabled={quickExporting === 'csv'}
            >
              <FileText className="h-4 w-4 mr-2" />
              Exportar como CSV
              {quickExporting === 'csv' && (
                <div className="ml-auto">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-900" />
                </div>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleQuickExport('xlsx')}
              disabled={quickExporting === 'xlsx'}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar como Excel
              {quickExporting === 'xlsx' && (
                <div className="ml-auto">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-900" />
                </div>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleQuickExport('pdf')}
              disabled={quickExporting === 'pdf'}
            >
              <FileText className="h-4 w-4 mr-2" />
              Exportar como PDF
              {quickExporting === 'pdf' && (
                <div className="ml-auto">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-900" />
                </div>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleQuickExport('json')}
              disabled={quickExporting === 'json'}
            >
              <FileText className="h-4 w-4 mr-2" />
              Exportar como JSON
              {quickExporting === 'json' && (
                <div className="ml-auto">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-900" />
                </div>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={openExportModal}>
              <Settings className="h-4 w-4 mr-2" />
              Opciones Avanzadas...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Export Info */}
      {Object.keys(filters).length > 0 && (
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>
              Se exportarán <strong>{totalClients}</strong> clientes con los
              filtros aplicados
            </span>
          </div>
        </div>
      )}

      {/* Active Operations Status */}
      {activeOperations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Operaciones Activas</h4>
          {activeOperations.map((operation) => (
            <div
              key={operation.operation_id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
            >
              <div className="flex items-center gap-3">
                {getOperationStatusIcon(operation.status)}
                <span className="font-medium">
                  {operation.type === 'import' ? 'Importación' : 'Exportación'}
                </span>
                <span className="text-gray-500">
                  {new Date(operation.created_at).toLocaleTimeString()}
                </span>
              </div>
              <Badge
                variant={
                  operation.status === 'completed'
                    ? 'default'
                    : operation.status === 'error'
                      ? 'destructive'
                      : 'secondary'
                }
              >
                {operation.status === 'processing'
                  ? 'En progreso'
                  : operation.status === 'completed'
                    ? 'Completado'
                    : operation.status === 'error'
                      ? 'Error'
                      : operation.status}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Recent Results */}
      {(lastImportResult || lastExportResult) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Últimos Resultados</h4>

          {lastImportResult && (
            <div className="p-3 bg-green-50 rounded-lg text-sm">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">Última Importación Exitosa</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Importados:</span>
                  <div className="font-medium">
                    {lastImportResult.imported_count}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Actualizados:</span>
                  <div className="font-medium">
                    {lastImportResult.updated_count}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Errores:</span>
                  <div className="font-medium">
                    {lastImportResult.error_count}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Tiempo:</span>
                  <div className="font-medium">
                    {(lastImportResult.processing_time / 1000).toFixed(1)}s
                  </div>
                </div>
              </div>
            </div>
          )}

          {lastExportResult && (
            <div className="p-3 bg-green-50 rounded-lg text-sm">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">Última Exportación Exitosa</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{lastExportResult.filename}</div>
                  <div className="text-gray-500">
                    {lastExportResult.total_records} registros,{' '}
                    {ImportExportService.formatFileSize(
                      lastExportResult.file_size
                    )}
                  </div>
                </div>
                <Badge variant="outline">
                  {lastExportResult.format.toUpperCase()}
                </Badge>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ImportModal
        isOpen={importModal.isOpen}
        onClose={closeImportModal}
        onImportComplete={(result) => {
                    // Handle import completion - you might want to refresh the clients list
        }}
      />

      <ExportModal
        isOpen={exportModal.isOpen}
        onClose={closeExportModal}
        currentFilters={filters}
      />
    </div>
  );
}
