'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
// import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ClientsService } from '@/lib/api/services/clients.service';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface ImportClientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportClientsModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportClientsModalProps) {
  // const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    imported: number;
    errors: Array<{ row: number; error: string }>;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    // Check file type
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      toast.error(
        'Tipo de archivo no válido. Por favor, selecciona un archivo CSV o Excel.'
      );
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. El tamaño máximo es 5MB.');
      return;
    }

    setSelectedFile(file);
    setImportResults(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const result = await ClientsService.bulkImport(selectedFile);

      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResults(result);

      if (result.imported > 0) {
        toast.success(`Se importaron ${result.imported} clientes exitosamente`);
        if (result.errors.length === 0) {
          setTimeout(() => {
            onSuccess();
            handleClose();
          }, 1500);
        }
      } else {
        toast.error('No se importaron clientes');
      }
    } catch (error) {
            toast.error('Error al importar clientes');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setImportResults(null);
    setImportProgress(0);
    onClose();
  };

  const downloadTemplate = () => {
    const csvContent =
      'first_name,last_name,email,phone,address,city,notes\n' +
      'Juan,Pérez,juan@example.com,+34 600123456,Calle Mayor 1,Madrid,Cliente VIP\n' +
      'María,García,maria@example.com,+34 600234567,Plaza España 2,Barcelona,';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_clientes.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Plantilla descargada exitosamente');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Clientes</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Puedes importar clientes desde un archivo CSV o Excel. Asegúrate
              de que el archivo tenga las columnas correctas.
            </AlertDescription>
          </Alert>

          {/* Template Download */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div>
              <h4 className="font-medium">Descargar plantilla</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Descarga una plantilla con el formato correcto para importar
                clientes
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Plantilla CSV
            </Button>
          </div>

          {/* File Upload Area */}
          <div
            className={cn(
              'relative rounded-lg border-2 border-dashed p-8 text-center transition-colors',
              isDragging
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                : 'border-gray-300 dark:border-gray-700',
              selectedFile && 'bg-gray-50 dark:bg-gray-800'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-4">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Eliminar archivo
                </Button>
              </div>
            ) : (
              <>
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Arrastra un archivo aquí o haz clic para seleccionar
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4"
                >
                  Seleccionar archivo
                </Button>
              </>
            )}
          </div>

          {/* Progress */}
          {isImporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importando clientes...</span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress || ''} />
            </div>
          )}

          {/* Import Results */}
          {importResults && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  {`${importResults.imported} clientes importados exitosamente`}
                </AlertDescription>
              </Alert>

              {importResults.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-600 dark:text-red-400">
                    {`${importResults.errors.length} errores encontrados`}
                  </h4>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
                    {importResults.errors.map((error, index) => (
                      <div
                        key={index}
                        className="text-sm text-red-700 dark:text-red-300"
                      >
                        {`Fila ${error.row}: ${error.error}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={!selectedFile || isImporting}
              className={cn(
                'min-w-[100px]',
                importResults?.imported &&
                  importResults.errors.length === 0 &&
                  'bg-green-600 hover:bg-green-700'
              )}
            >
              {isImporting ? (
                <span className="flex items-center">
                  <motion.div
                    className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                  Importando...
                </span>
              ) : importResults ? (
                'Cerrar'
              ) : (
                'Importar'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
