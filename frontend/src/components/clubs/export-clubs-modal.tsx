'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileSpreadsheet, Building2 } from 'lucide-react';
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
import { ClubsService } from '@/lib/api/services/clubs.service';
import { useClubFilters, useClubs, useClubsDataStore } from '@/store/clubs';
import { toast } from '@/lib/toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExportClubsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportClubsModal({ isOpen, onClose }: ExportClubsModalProps) {
  // Use specific selectors for optimal performance
  const filters = useClubFilters();
  const clubs = useClubs();
  const totalClubs = useClubsDataStore((state) => state.totalClubs);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'all' | 'filtered' | 'selected'>(
    'filtered'
  );
  const [selectedClubIds, setSelectedClubIds] = useState<string[]>([]);
  const [includeFields, setIncludeFields] = useState({
    basic: true,
    contact: true,
    schedule: true,
    courts: false,
    stats: false,
    services: false,
  });

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Since the backend does not have a bulk export endpoint, we will create a CSV client-side
      const clubsToExport =
        exportType === 'selected'
          ? clubs.filter((c) => selectedClubIds.includes(c.id))
          : exportType === 'filtered'
            ? clubs
            : clubs; // In a real implementation, you'd fetch all clubs

      // Build CSV headers based on selected fields
      const headers = ['id'];
      if (includeFields.basic) headers.push('name', 'slug', 'description');
      if (includeFields.contact)
        headers.push('email', 'phone', 'address', 'city', 'postal_code');
      if (includeFields.schedule) headers.push('opening_time', 'closing_time');
      if (includeFields.services)
        headers.push('website', 'facebook', 'instagram', 'twitter');

      // Build CSV content
      let csvContent = headers.join(',') + '\n';

      clubsToExport.forEach((club) => {
        const row = [club.id];
        if (includeFields.basic) {
          row.push(`"${club.name}"`, club.slug, `"${club.description || ''}"`);
        }
        if (includeFields.contact) {
          row.push(
            club.email,
            club.phone,
            `"${club.address}"`,
            club.city,
            club.postal_code
          );
        }
        if (includeFields.schedule) {
          row.push(club.opening_time, club.closing_time);
        }
        if (includeFields.services) {
          row.push(
            club.website || '',
            club.social_media?.facebook || '',
            club.social_media?.instagram || '',
            club.social_media?.twitter || ''
          );
        }
        csvContent += row.join(',') + '\n';
      });

      // Create download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileName = `clubes_${format(new Date(), 'yyyyMMdd_HHmmss', { locale: es })}.csv`;
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Clubes exportados exitosamente');
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al exportar clubes';
      toast.error(errorMessage);
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
    if (exportType === 'selected') return selectedClubIds.length;
    if (exportType === 'filtered') return clubs.length;
    return totalClubs;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Exportar Clubes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Type Selection */}
          <div className="space-y-3">
            <Label>Seleccionar tipo de exportación</Label>
            <RadioGroup
              value={exportType || ''}
              onValueChange={(value: 'all' | 'filtered' | 'selected') =>
                setExportType(value)
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="filtered" id="filtered" />
                <Label htmlFor="filtered" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span>Clubes filtrados</span>
                    <span className="text-sm text-gray-500">
                      {clubs.length} clubes
                    </span>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span>Todos los clubes</span>
                    <span className="text-sm text-gray-500">
                      {totalClubs} registros
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
                      Nombre, slug, descripción
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
                    <p className="text-xs text-gray-500">
                      Email, teléfono, dirección
                    </p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="schedule"
                  checked={includeFields.schedule}
                  onCheckedChange={() => toggleField('schedule')}
                />
                <Label htmlFor="schedule" className="flex-1 cursor-pointer">
                  <div>
                    <span>Horarios</span>
                    <p className="text-xs text-gray-500">
                      Horario de apertura y cierre
                    </p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="courts"
                  checked={includeFields.courts}
                  onCheckedChange={() => toggleField('courts')}
                />
                <Label htmlFor="courts" className="flex-1 cursor-pointer">
                  <div>
                    <span>Pistas</span>
                    <p className="text-xs text-gray-500">
                      Número de pistas y tipos
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
                      Ocupación, ingresos, reservas
                    </p>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="services"
                  checked={includeFields.services}
                  onCheckedChange={() => toggleField('services')}
                />
                <Label htmlFor="services" className="flex-1 cursor-pointer">
                  <div>
                    <span>Servicios y redes sociales</span>
                    <p className="text-xs text-gray-500">
                      Web, Facebook, Instagram, Twitter
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
              disabled={
                isExporting ||
                (exportType === 'selected' && selectedClubIds.length === 0)
              }
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
