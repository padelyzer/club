'use client';

import { motion } from 'framer-motion';
import { 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Settings,
  MapPin,
  DollarSign,
  Zap,
  Flame,
  Home
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Court } from '@/types/court';
import { useDeleteCourt, useToggleCourtMaintenance } from '@/lib/api/hooks/useCourts';

interface CourtCardProps {
  court: Court;
  onEdit: (court: Court) => void;
  index?: number;
}

export function CourtCard({ court, onEdit, index = 0 }: CourtCardProps) {
  const deleteCourtMutation = useDeleteCourt();
  const toggleMaintenanceMutation = useToggleCourtMaintenance();

  const handleDelete = async () => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar la cancha ${court.name}?`)) {
      deleteCourtMutation.mutate(court.id);
    }
  };

  const handleToggleMaintenance = () => {
    const reason = court.is_maintenance 
      ? 'Finalizar mantenimiento'
      : window.prompt('Razón del mantenimiento:') || '';
    
    if (court.is_maintenance || reason) {
      toggleMaintenanceMutation.mutate({ id: court.id, reason });
    }
  };

  const getStatusConfig = () => {
    if (court.is_maintenance) {
      return {
        label: 'Mantenimiento',
        color: 'bg-orange-100 text-orange-700',
        gradient: 'from-orange-500 to-orange-600'
      };
    }
    if (!court.is_active) {
      return {
        label: 'Inactiva',
        color: 'bg-gray-100 text-gray-700',
        gradient: 'from-gray-400 to-gray-500'
      };
    }
    return {
      label: 'Disponible',
      color: 'bg-green-100 text-green-700',
      gradient: 'from-green-500 to-green-600'
    };
  };

  const statusConfig = getStatusConfig();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-gray-100 transition-all duration-200">
        {/* Apple-style Header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${statusConfig.gradient} flex items-center justify-center`}>
                <Home className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">{court.name}</h3>
                <p className="text-sm text-gray-500">Cancha #{String(court.number)}</p>
              </div>
            </div>
            
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Surface Type */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 font-medium">Superficie</span>
            <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
              {court.surface_type_display}
            </span>
          </div>

          {/* Features */}
          <div>
            <span className="text-sm text-gray-600 font-medium block mb-3">
              Características
            </span>
            <div className="flex flex-wrap gap-2">
              {court.has_lighting && (
                <div className="flex items-center gap-1.5 text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-medium">
                  <Zap className="w-3.5 h-3.5" />
                  Luz
                </div>
              )}
              {court.has_heating && (
                <div className="flex items-center gap-1.5 text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-medium">
                  <Flame className="w-3.5 h-3.5" />
                  Calefacción
                </div>
              )}
              {court.has_roof && (
                <div className="flex items-center gap-1.5 text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg font-medium">
                  <Home className="w-3.5 h-3.5" />
                  Techo
                </div>
              )}
              {!court.has_lighting && !court.has_heating && !court.has_roof && (
                <span className="text-xs text-gray-500 italic">Sin características especiales</span>
              )}
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-green-100 flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5 text-green-600" />
              </div>
              <span className="text-sm text-gray-600 font-medium">Precio por hora</span>
            </div>
            <span className="font-semibold text-lg text-gray-900">
              ${parseFloat(court.price_per_hour).toFixed(2)}
            </span>
          </div>

          {/* Maintenance Notes */}
          {court.is_maintenance && court.maintenance_notes && (
            <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
              <p className="text-xs text-orange-700">
                <strong className="font-semibold">Mantenimiento:</strong> {court.maintenance_notes}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 bg-white border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
              onClick={() => {/* Navigate to reservations */}}
            >
              <MapPin className="w-3.5 h-3.5 mr-1.5" />
              Ver Reservas
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100">
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => onEdit(court)}
                  className="cursor-pointer"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleToggleMaintenance}
                  className="cursor-pointer"
                  disabled={toggleMaintenanceMutation.isPending}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {court.is_maintenance ? 'Finalizar' : 'Mantenimiento'}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                  disabled={deleteCourtMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </motion.div>
  );
}