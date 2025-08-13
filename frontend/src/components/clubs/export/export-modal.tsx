'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, FileText, Table, FileSpreadsheet, 
  FileImage, Code, X, Settings, CheckCircle,
  AlertCircle, Calendar, Filter, Eye, Sparkles,
  Clock, Users, Star, MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClubUI } from '@/types/club-unified';
import { CustomList } from '@/lib/stores/favorites-store';
import DataExporter, { ExportFormat, ExportOptions, ExportData } from '@/lib/export/data-exporter';

/**
 * Advanced Export Modal
 * Comprehensive data export with multiple formats and options
 */

interface ExportModalProps {
  clubs: ClubUI[];
  favorites: string[];
  customLists: CustomList[];
  onClose: () => void;
  className?: string;
}

const exportFormats: Array<{
  format: ExportFormat;
  name: string;
  description: string;
  icon: any;
  fileExtension: string;
  recommended?: boolean;
}> = [
  {
    format: 'json',
    name: 'JSON',
    description: 'Formato estructurado para desarrolladores',
    icon: Code,
    fileExtension: 'json',
    recommended: true
  },
  {
    format: 'csv',
    name: 'CSV',
    description: 'Compatible con Excel y hojas de cálculo',
    icon: Table,
    fileExtension: 'csv'
  },
  {
    format: 'xlsx',
    name: 'Excel',
    description: 'Archivo nativo de Microsoft Excel',
    icon: FileSpreadsheet,
    fileExtension: 'xlsx'
  },
  {
    format: 'pdf',
    name: 'PDF',
    description: 'Documento listo para imprimir',
    icon: FileText,
    fileExtension: 'pdf'
  },
  {
    format: 'xml',
    name: 'XML',
    description: 'Formato estructurado estándar',
    icon: FileImage,
    fileExtension: 'xml'
  }
];

export const ExportModal: React.FC<ExportModalProps> = ({
  clubs,
  favorites,
  customLists,
  onClose,
  className
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    includeMetadata: true,
    includeStats: true,
    includeImages: false,
    customFields: []
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const exporter = DataExporter.getInstance();

  // Calculate export stats
  const exportStats = useMemo(() => {
    let totalSize = clubs.length;
    
    if (exportOptions.includeMetadata) {
      totalSize += favorites.length + customLists.length;
    }
    
    return {
      totalClubs: clubs.length,
      totalFavorites: favorites.length,
      totalLists: customLists.length,
      estimatedSize: totalSize * 1024 // Rough estimate
    };
  }, [clubs.length, favorites.length, customLists.length, exportOptions.includeMetadata]);

  // Prepare export data
  const prepareExportData = (): ExportData => {
    return {
      clubs,
      favorites,
      customLists,
      metadata: {
        exportDate: new Date(),
        totalClubs: clubs.length,
        totalFavorites: favorites.length,
        totalLists: customLists.length,
        exportedBy: 'Padelyzer User',
        version: '1.0.0'
      }
    };
  };

  // Handle format change
  const handleFormatChange = (format: ExportFormat) => {
    setSelectedFormat(format);
    setExportOptions(prev => ({ ...prev, format }));
    setShowPreview(false);
    setPreviewData('');
  };

  // Handle option change
  const handleOptionChange = <K extends keyof ExportOptions>(
    key: K,
    value: ExportOptions[K]
  ) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
    setShowPreview(false);
    setPreviewData('');
  };

  // Generate preview
  const generatePreview = async () => {
    try {
      const template = exporter.generateExportTemplate(clubs.slice(0, 2), selectedFormat);
      setPreviewData(template);
      setShowPreview(true);
    } catch (error) {
      setExportError('Error al generar vista previa');
    }
  };

  // Perform export
  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    
    try {
      const exportData = prepareExportData();
      
      // Validate data
      const validation = exporter.validateExportData(exportData);
      if (!validation.isValid) {
        throw new Error(`Datos inválidos: ${validation.errors.join(', ')}`);
      }

      // Export data
      const blob = await exporter.exportData(exportData, exportOptions);
      
      // Download file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `padelyzer-clubes-${new Date().toISOString().split('T')[0]}.${exportFormats.find(f => f.format === selectedFormat)?.fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setExportError(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const selectedFormatInfo = exportFormats.find(f => f.format === selectedFormat);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4",
        className
      )}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Exportar Datos
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Descarga tus datos en el formato que prefieras
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-88px)]">
          {/* Left Panel - Format Selection */}
          <div className="w-80 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            {/* Export Stats */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Resumen de Exportación
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Clubes</span>
                  <span className="font-medium">{exportStats.totalClubs}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Favoritos</span>
                  <span className="font-medium">{exportStats.totalFavorites}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Listas</span>
                  <span className="font-medium">{exportStats.totalLists}</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-gray-600 dark:text-gray-400">Tamaño estimado</span>
                  <span className="font-medium">{formatFileSize(exportStats.estimatedSize)}</span>
                </div>
              </div>
            </div>

            {/* Format Selection */}
            <div className="p-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Formato de Exportación
              </h3>
              <div className="space-y-3">
                {exportFormats.map((format) => {
                  const Icon = format.icon;
                  return (
                    <motion.button
                      key={format.format}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleFormatChange(format.format)}
                      className={cn(
                        "w-full flex items-start gap-3 p-4 rounded-xl text-left transition-all duration-200",
                        selectedFormat === format.format
                          ? "bg-indigo-100 dark:bg-indigo-900/30 border-2 border-indigo-300 dark:border-indigo-700"
                          : "bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700"
                      )}
                    >
                      <Icon className={cn(
                        "w-5 h-5 flex-shrink-0 mt-0.5",
                        selectedFormat === format.format
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-gray-400"
                      )} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-medium",
                            selectedFormat === format.format
                              ? "text-indigo-700 dark:text-indigo-300"
                              : "text-gray-900 dark:text-white"
                          )}>
                            {format.name}
                          </span>
                          {format.recommended && (
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                              Recomendado
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {format.description}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Panel - Options and Preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Options */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Opciones de Exportación
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Content Options */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Contenido a Incluir
                  </h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeStats}
                        onChange={(e) => handleOptionChange('includeStats', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium">Estadísticas</span>
                      </div>
                    </label>
                    
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeMetadata}
                        onChange={(e) => handleOptionChange('includeMetadata', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">Metadatos y fechas</span>
                      </div>
                    </label>
                    
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeImages}
                        onChange={(e) => handleOptionChange('includeImages', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex items-center gap-2">
                        <FileImage className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-medium">URLs de imágenes</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Format Info */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Información del Formato
                  </h4>
                  {selectedFormatInfo && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <selectedFormatInfo.icon className="w-5 h-5 text-indigo-600" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedFormatInfo.name}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedFormatInfo.description}
                      </p>
                      <div className="mt-3 text-xs text-gray-500">
                        <div>Extensión: .{selectedFormatInfo.fileExtension}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview Button */}
              <div className="mt-6 flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={generatePreview}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Vista Previa
                </motion.button>
              </div>
            </div>

            {/* Preview/Status */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Success Message */}
              <AnimatePresence>
                {exportSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center gap-3"
                  >
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                    <div>
                      <div className="font-medium text-green-700 dark:text-green-300">
                        ¡Exportación completada!
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-400">
                        El archivo se ha descargado correctamente
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error Message */}
              <AnimatePresence>
                {exportError && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center gap-3"
                  >
                    <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    <div>
                      <div className="font-medium text-red-700 dark:text-red-300">
                        Error en la exportación
                      </div>
                      <div className="text-sm text-red-600 dark:text-red-400">
                        {exportError}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Preview */}
              {showPreview && previewData && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Vista Previa ({selectedFormatInfo?.name})
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 overflow-x-auto">
                    <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {previewData}
                    </pre>
                  </div>
                </div>
              )}

              {!showPreview && !exportSuccess && !exportError && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Listo para exportar
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Configura las opciones y haz clic en "Vista Previa" para ver una muestra
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {exportStats.totalClubs} clubes serán exportados
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleExport}
                  disabled={isExporting}
                  className={cn(
                    "px-6 py-2 rounded-xl font-medium text-white transition-all duration-200 flex items-center gap-2",
                    isExporting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-green-500 to-blue-600 hover:shadow-lg shadow-green-500/25"
                  )}
                >
                  {isExporting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  {isExporting ? 'Exportando...' : 'Descargar'}
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};