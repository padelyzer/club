'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  Upload, 
  FileText, 
  FileSpreadsheet,
  FileImage,
  Database,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  Calendar,
  Users,
  Target,
  DollarSign,
  Settings,
  Eye,
  RefreshCw,
  Archive,
  Share2
} from 'lucide-react';
import { Card } from '@/components/ui/professional/Card';
import { Button } from '@/components/ui/professional/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useClubExport, useClubImport } from '@/lib/api/hooks/useClubs';
import { useToast } from '@/hooks/use-toast';

interface ClubDataExportImportProps {
  clubId: string;
}

interface ExportOptions {
  format: 'excel' | 'csv' | 'json' | 'pdf';
  includeData: string[];
  dateRange: {
    start: string;
    end: string;
  };
  includeImages: boolean;
  includeReports: boolean;
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: Array<{ row: number; field: string; error: string }>;
  warnings: Array<{ row: number; field: string; warning: string }>;
  summary: {
    members: number;
    reservations: number;
    courts: number;
    staff: number;
  };
}

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  format: 'excel' | 'csv' | 'json' | 'pdf';
  icon: any;
  size: string;
  includes: string[];
  color: string;
}

const EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: 'complete',
    name: 'Exportación Completa',
    description: 'Todos los datos del club incluyendo históricos',
    format: 'excel',
    icon: Database,
    size: '~5-15MB',
    includes: ['Miembros', 'Reservas', 'Canchas', 'Personal', 'Finanzas', 'Configuración'],
    color: 'blue'
  },
  {
    id: 'members',
    name: 'Base de Datos de Miembros',
    description: 'Información completa de todos los miembros',
    format: 'csv',
    icon: Users,
    size: '~500KB-2MB',
    includes: ['Datos personales', 'Membresías', 'Historial de pagos', 'Estadísticas'],
    color: 'green'
  },
  {
    id: 'reservations',
    name: 'Historial de Reservas',
    description: 'Todas las reservas con detalles financieros',
    format: 'excel',
    icon: Calendar,
    size: '~1-5MB',
    includes: ['Reservas', 'Pagos', 'Cancelaciones', 'Estadísticas de uso'],
    color: 'purple'
  },
  {
    id: 'financial',
    name: 'Reporte Financiero',
    description: 'Análisis financiero completo para contabilidad',
    format: 'pdf',
    icon: DollarSign,
    size: '~2-8MB',
    includes: ['Ingresos', 'Gastos', 'Gráficos', 'Análisis de rentabilidad'],
    color: 'amber'
  },
  {
    id: 'courts',
    name: 'Configuración de Canchas',
    description: 'Configuración técnica y datos de las canchas',
    format: 'json',
    icon: Target,
    size: '~50-200KB',
    includes: ['Configuración', 'Precios', 'Horarios', 'Mantenimiento'],
    color: 'red'
  },
  {
    id: 'backup',
    name: 'Respaldo del Sistema',
    description: 'Respaldo completo para migración o restauración',
    format: 'json',
    icon: Archive,
    size: '~10-50MB',
    includes: ['Configuración completa', 'Datos estructurados', 'Metadatos'],
    color: 'gray'
  }
];

const IMPORT_TYPES = [
  {
    id: 'members',
    name: 'Miembros',
    description: 'Importar base de datos de miembros',
    icon: Users,
    formats: ['csv', 'excel'],
    sampleFields: ['nombre', 'email', 'telefono', 'fecha_nacimiento', 'tipo_membresia']
  },
  {
    id: 'reservations',
    name: 'Reservas',
    description: 'Importar historial de reservas',
    icon: Calendar,
    formats: ['csv', 'excel'],
    sampleFields: ['fecha', 'hora_inicio', 'hora_fin', 'cancha', 'cliente', 'precio']
  },
  {
    id: 'courts',
    name: 'Canchas',
    description: 'Configuración de canchas',
    icon: Target,
    formats: ['csv', 'excel', 'json'],
    sampleFields: ['nombre', 'tipo', 'precio_hora', 'ubicacion', 'equipamiento']
  },
  {
    id: 'staff',
    name: 'Personal',
    description: 'Base de datos del personal',
    icon: Users,
    formats: ['csv', 'excel'],
    sampleFields: ['nombre', 'email', 'rol', 'fecha_ingreso', 'salario']
  }
];

const ClubDataExportImport: React.FC<ClubDataExportImportProps> = ({ clubId }) => {
  const { toast } = useToast();
  const exportMutation = useClubExport();
  const importMutation = useClubImport();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState('export');
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate>(EXPORT_TEMPLATES[0]);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'excel',
    includeData: ['members', 'reservations', 'courts'],
    dateRange: {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    includeImages: false,
    includeReports: true
  });

  const [selectedImportType, setSelectedImportType] = useState(IMPORT_TYPES[0]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleExport = async (template: ExportTemplate) => {
    setIsExporting(true);
    
    try {
      const blob = await exportMutation.mutateAsync({
        clubId,
        format: template.format
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.${template.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Exportación Exitosa",
        description: `${template.name} descargado correctamente.`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error en Exportación",
        description: "No se pudo completar la exportación. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast({
        title: "Archivo Requerido",
        description: "Por favor selecciona un archivo para importar.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await importMutation.mutateAsync({
        clubId,
        file: importFile,
        type: selectedImportType.id
      });

      clearInterval(progressInterval);
      setImportProgress(100);
      
      // Mock result for demo
      const mockResult: ImportResult = {
        success: true,
        imported: 125,
        errors: [
          { row: 15, field: 'email', error: 'Formato de email inválido' },
          { row: 32, field: 'telefono', error: 'Número de teléfono requerido' }
        ],
        warnings: [
          { row: 8, field: 'fecha_nacimiento', warning: 'Fecha futura detectada' },
          { row: 21, field: 'membresia', warning: 'Tipo de membresía no reconocido, usando default' }
        ],
        summary: {
          members: selectedImportType.id === 'members' ? 120 : 0,
          reservations: selectedImportType.id === 'reservations' ? 89 : 0,
          courts: selectedImportType.id === 'courts' ? 5 : 0,
          staff: selectedImportType.id === 'staff' ? 8 : 0
        }
      };

      setImportResult(mockResult);

      toast({
        title: "Importación Completada",
        description: `${mockResult.imported} registros importados exitosamente.`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error en Importación",
        description: "No se pudo completar la importación. Verifica el formato del archivo.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResult(null);
      setImportProgress(0);
    }
  };

  const downloadSampleTemplate = (type: typeof IMPORT_TYPES[0]) => {
    const csvContent = [
      type.sampleFields.join(','),
      type.sampleFields.map(() => 'ejemplo_dato').join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantilla-${type.id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderExportTab = () => (
    <div className="space-y-6">
      {/* Template Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXPORT_TEMPLATES.map((template) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            className="cursor-pointer"
            onClick={() => setSelectedTemplate(template)}
          >
            <Card 
              variant="glass" 
              padding="lg"
              className={`transition-all duration-200 ${
                selectedTemplate.id === template.id 
                  ? 'ring-2 ring-blue-300 bg-blue-50/50' 
                  : 'hover:shadow-lg'
              }`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 rounded-xl ${
                  template.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                  template.color === 'green' ? 'bg-green-100 text-green-600' :
                  template.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                  template.color === 'amber' ? 'bg-amber-100 text-amber-600' :
                  template.color === 'red' ? 'bg-red-100 text-red-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  <template.icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {template.format.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Tamaño estimado:</span>
                      <span className="font-medium">{template.size}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {template.includes.slice(0, 3).map((item) => (
                        <span key={item} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                          {item}
                        </span>
                      ))}
                      {template.includes.length > 3 && (
                        <span className="px-2 py-1 bg-gray-200 rounded text-xs text-gray-500">
                          +{template.includes.length - 3} más
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExport(template);
                }}
                disabled={isExporting}
                leftIcon={isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                className="w-full"
                variant={selectedTemplate.id === template.id ? 'default' : 'secondary'}
              >
                {isExporting ? 'Exportando...' : 'Exportar'}
              </Button>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Custom Export Options */}
      <Card variant="glass" padding="lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          Exportación Personalizada
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Formato</label>
            <Select 
              value={exportOptions.format} 
              onValueChange={(value: any) => setExportOptions(prev => ({ ...prev, format: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
                <SelectItem value="json">JSON (.json)</SelectItem>
                <SelectItem value="pdf">PDF (.pdf)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Fecha Inicio</label>
            <input
              type="date"
              value={exportOptions.dateRange.start}
              onChange={(e) => setExportOptions(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, start: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Fecha Fin</label>
            <input
              type="date"
              value={exportOptions.dateRange.end}
              onChange={(e) => setExportOptions(prev => ({
                ...prev,
                dateRange: { ...prev.dateRange, end: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div className="flex items-center justify-center">
            <Button
              onClick={() => {
                const customTemplate: ExportTemplate = {
                  id: 'custom',
                  name: 'Exportación Personalizada',
                  description: 'Configuración personalizada',
                  format: exportOptions.format,
                  icon: FileText,
                  size: 'Variable',
                  includes: exportOptions.includeData,
                  color: 'blue'
                };
                handleExport(customTemplate);
              }}
              disabled={isExporting}
              leftIcon={isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            >
              {isExporting ? 'Exportando...' : 'Exportar'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderImportTab = () => (
    <div className="space-y-6">
      {/* Import Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {IMPORT_TYPES.map((type) => (
          <motion.button
            key={type.id}
            onClick={() => setSelectedImportType(type)}
            className={`p-4 rounded-lg text-left transition-all duration-200 border-2 ${
              selectedImportType.id === type.id
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                selectedImportType.id === type.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              }`}>
                <type.icon className="w-5 h-5" />
              </div>
              
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">{type.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{type.description}</p>
                
                <div className="flex flex-wrap gap-1 mb-2">
                  {type.formats.map((format) => (
                    <Badge key={format} variant="secondary" className="text-xs">
                      {format.toUpperCase()}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-gray-500">Campos:</span>
                  {type.sampleFields.slice(0, 3).map((field) => (
                    <span key={field} className="text-xs text-gray-600 bg-gray-100 px-1 rounded">
                      {field}
                    </span>
                  ))}
                  {type.sampleFields.length > 3 && (
                    <span className="text-xs text-gray-500">+{type.sampleFields.length - 3} más</span>
                  )}
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* File Upload */}
      <Card variant="glass" padding="lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-green-600" />
          Subir Archivo - {selectedImportType.name}
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept={selectedImportType.formats.map(f => f === 'excel' ? '.xlsx,.xls' : `.${f}`).join(',')}
              className="hidden"
            />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<Upload className="w-4 h-4" />}
              variant="secondary"
            >
              Seleccionar Archivo
            </Button>
            
            <Button
              onClick={() => downloadSampleTemplate(selectedImportType)}
              leftIcon={<Download className="w-4 h-4" />}
              variant="secondary"
            >
              Descargar Plantilla
            </Button>
          </div>

          {importFile && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <p className="font-medium text-blue-900">{importFile.name}</p>
                <p className="text-sm text-blue-700">
                  {(importFile.size / 1024).toFixed(1)} KB • Modificado {new Date(importFile.lastModified).toLocaleDateString()}
                </p>
              </div>
              <Button
                onClick={() => setImportFile(null)}
                variant="secondary"
                size="sm"
                leftIcon={<X className="w-3 h-3" />}
              >
                Remover
              </Button>
            </div>
          )}

          {importFile && !isImporting && !importResult && (
            <div className="flex justify-center">
              <Button
                onClick={handleImport}
                leftIcon={<Upload className="w-4 h-4" />}
                className="bg-green-600 hover:bg-green-700"
              >
                Importar {selectedImportType.name}
              </Button>
            </div>
          )}

          {isImporting && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Procesando archivo...</span>
                <span className="font-medium text-gray-900">{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="w-full" />
            </div>
          )}

          {importResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {importResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <h4 className="font-medium text-gray-900">
                  {importResult.success ? 'Importación Exitosa' : 'Importación con Errores'}
                </h4>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{importResult.imported}</p>
                  <p className="text-sm text-green-700">Importados</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{importResult.errors.length}</p>
                  <p className="text-sm text-red-700">Errores</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">{importResult.warnings.length}</p>
                  <p className="text-sm text-amber-700">Advertencias</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {Object.values(importResult.summary).reduce((a, b) => a + b, 0)}
                  </p>
                  <p className="text-sm text-blue-700">Total Registros</p>
                </div>
              </div>

              {(importResult.errors.length > 0 || importResult.warnings.length > 0) && (
                <div className="space-y-2">
                  <Button
                    onClick={() => setShowPreview(!showPreview)}
                    variant="secondary"
                    size="sm"
                    rightIcon={showPreview ? <X className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  >
                    {showPreview ? 'Ocultar' : 'Ver'} Detalles
                  </Button>

                  <AnimatePresence>
                    {showPreview && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3"
                      >
                        {importResult.errors.length > 0 && (
                          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                            <h5 className="font-medium text-red-900 mb-2">Errores encontrados:</h5>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {importResult.errors.map((error, index) => (
                                <p key={index} className="text-sm text-red-700">
                                  Fila {error.row}, Campo "{error.field}": {error.error}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {importResult.warnings.length > 0 && (
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <h5 className="font-medium text-amber-900 mb-2">Advertencias:</h5>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {importResult.warnings.map((warning, index) => (
                                <p key={index} className="text-sm text-amber-700">
                                  Fila {warning.row}, Campo "{warning.field}": {warning.warning}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Import Guidelines */}
      <Card variant="glass" padding="lg" className="border-blue-200 bg-blue-50/50">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Guías para Importación</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Descarga la plantilla correspondiente para ver el formato correcto</li>
              <li>• Los campos marcados como requeridos no pueden estar vacíos</li>
              <li>• Las fechas deben estar en formato YYYY-MM-DD</li>
              <li>• Los emails deben ser válidos y únicos</li>
              <li>• El archivo no debe exceder 10MB de tamaño</li>
              <li>• Máximo 10,000 registros por importación</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Share2 className="w-6 h-6 text-blue-600" />
            Exportar e Importar Datos
          </h2>
          <p className="text-gray-600">
            Gestiona la exportación e importación de datos del club
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar Datos
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Importar Datos
          </TabsTrigger>
        </TabsList>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <TabsContent value="export">
            {renderExportTab()}
          </TabsContent>

          <TabsContent value="import">
            {renderImportTab()}
          </TabsContent>
        </motion.div>
      </Tabs>
    </div>
  );
};

export default ClubDataExportImport;