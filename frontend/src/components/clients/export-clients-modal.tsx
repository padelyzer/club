'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileSpreadsheet, Filter, Calendar } from 'lucide-react';
// import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClientsService } from '@/lib/api/services/clients.service';
import { useClientsStore } from '@/store/clientsStore';
import { toast } from '@/lib/toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExportClientsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportClientsModal({
  isOpen,
  onClose,
}: ExportClientsModalProps) {
  // const { t } = useTranslation();
  const { filters, totalCount } = useClientsStore();
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'all' | 'filtered'>('filtered');
  const [includeFields, setIncludeFields] = useState({
    basic: true,
    contact: true,
    address: true,
    stats: false,
    reservations: false,
  });

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Prepare filters based on export type
      const exportFilters = exportType === 'filtered' ? filters : {};

      // Add field selection to filters
      const fieldsToInclude = Object.entries(includeFields)
        .filter(([_, included]) => included)
        .map(([field]) => field);

      const blob = await ClientsService.exportToCSV({
        ...exportFilters,
        fields: fieldsToInclude.join(','),
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileName = `clientes_${format(new Date(), 'yyyyMMdd_HHmmss', { locale: es })}.csv`;
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Clientes exportados exitosamente');
      onClose();
    } catch (error) {
            toast.error('Error al exportar clientes');
    } finally {
      setIsExporting(false);
    }
  };

  const toggleField = (field: keyof typeof includeFields) => {
    setIncludeFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const getExportCount = () => {
    if (exportType === 'all') return totalCount;
    // If filtered, return the current filtered count
    return totalCount; // This should be the filtered count from the store
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Clientes</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Type Selection */}
          <div className="space-y-3">
            <Label>Seleccionar tipo de exportación</Label>
            <RadioGroup
              value={exportType || ''}
              onValueChange={(value: 'all' | 'filtered') =>
                setExportType(value)
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="filtered" id="filtered" />
                <Label htmlFor="filtered" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span>Clientes filtrados</span>
                    <span className="text-sm text-gray-500">
                      {filters.search || Object.keys(filters).length > 0
                        ? 'Con filtros activos'
                        : 'Sin filtros'}
                    </span>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span>Todos los clientes</span>
                    <span className="text-sm text-gray-500">
                      {`${totalCount} registros`}
                    </span>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Field Selection */}
          <div className="space-y-3">
            <Label>Seleccionar campos a exportar</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="basic"
                  checked={includeFields.basic}
                  onCheckedChange={() => toggleField('basic')}
                  disabled
                />
                <Label htmlFor="basic" className="flex-1 cursor-pointer">
                  <div>
                    <span>Información básica</span>
                    <p className="text-xs text-gray-500">
                      Nombre, apellido, email
                    </p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="contact"
                  checked={includeFields.contact}
                  onCheckedChange={() => toggleField('contact')}
                />
                <Label htmlFor="contact" className="flex-1 cursor-pointer">
                  <div>
                    <span>Información de contacto</span>
                    <p className="text-xs text-gray-500">Teléfono, email</p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="address"
                  checked={includeFields.address}
                  onCheckedChange={() => toggleField('address')}
                />
                <Label htmlFor="address" className="flex-1 cursor-pointer">
                  <div>
                    <span>Dirección</span>
                    <p className="text-xs text-gray-500">
                      Dirección completa, ciudad
                    </p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="stats"
                  checked={includeFields.stats}
                  onCheckedChange={() => toggleField('stats')}
                />
                <Label htmlFor="stats" className="flex-1 cursor-pointer">
                  <div>
                    <span>Estadísticas</span>
                    <p className="text-xs text-gray-500">
                      Reservas totales, gasto promedio
                    </p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reservations"
                  checked={includeFields.reservations}
                  onCheckedChange={() => toggleField('reservations')}
                />
                <Label htmlFor="reservations" className="flex-1 cursor-pointer">
                  <div>
                    <span>Historial de reservas</span>
                    <p className="text-xs text-gray-500">
                      Últimas reservas del cliente
                    </p>
                  </div>
                </Label>
              </div>
            </div>
          </div>

          {/* Export Summary */}
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
            <h4 className="font-medium mb-2">Resumen de exportación</h4>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center justify-between">
                <span>Registros a exportar:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {getExportCount()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Formato:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  CSV
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Codificación:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  UTF-8
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="min-w-[100px]"
            >
              {isExporting ? (
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
                  Exportando...
                </span>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
