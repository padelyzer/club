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
  Home,
  Clock,
  TrendingUp,
  Calendar,
  Users
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Court } from '@/types/court';
import { useDeleteCourt, useToggleCourtMaintenance } from '@/lib/api/hooks/useCourts';

interface AppleCourtCardProps {
  court: Court;
  onEdit: (court: Court) => void;
  index?: number;
}

export function AppleCourtCard({ court, onEdit, index = 0 }: AppleCourtCardProps) {
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
        gradient: 'from-orange-500 to-orange-600',
        icon: Settings
      };
    }
    if (!court.is_active) {
      return {
        label: 'Inactiva',
        color: 'bg-gray-100 text-gray-700',
        gradient: 'from-gray-400 to-gray-500',
        icon: Home
      };
    }
    return {
      label: 'Disponible',
      color: 'bg-green-100 text-green-700',
      gradient: 'from-green-500 to-green-600',
      icon: Home
    };
  };

  const statusConfig = getStatusConfig();

  // Mock data for visual enhancement
  const occupancyRate = Math.floor(Math.random() * 40) + 60; // 60-100%
  const dailyReservations = Math.floor(Math.random() * 8) + 4; // 4-12

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg border border-gray-100 transition-all duration-300">
        {/* Visual Header with Gradient */}
        <div className={`h-32 bg-gradient-to-br ${statusConfig.gradient} relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-4 right-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/90 backdrop-blur-sm ${
              court.is_maintenance ? 'text-orange-700' :
              !court.is_active ? 'text-gray-700' :
              'text-green-700'
            }`}>
              {statusConfig.label}
            </span>
          </div>
          <div className="absolute bottom-4 left-4 text-white">
            <h3 className="text-xl font-bold">{court.name}</h3>
            <p className="text-sm opacity-90">Cancha #{String(court.number)}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-600">{occupancyRate}%</span>
              </div>
              <p className="text-xs text-gray-600">Ocupación hoy</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <Calendar className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-green-600">{dailyReservations}</span>
              </div>
              <p className="text-xs text-gray-600">Reservas hoy</p>
            </div>
          </div>

          {/* Surface and Price */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Home className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Superficie</p>
                  <p className="text-sm font-semibold text-gray-900">{court.surface_type_display}</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {court.has_roof ? 'Cubierta' : 'Descubierta'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-transparent rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Precio por hora</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${parseFloat(court.price_per_hour).toFixed(0)}
                  </p>
                </div>
              </div>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
          </div>

          {/* Features */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Características</p>
            <div className="flex flex-wrap gap-2">
              {court.has_lighting && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                  <Zap className="w-3 h-3" />
                  Iluminación
                </div>
              )}
              {court.has_heating && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium">
                  <Flame className="w-3 h-3" />
                  Calefacción
                </div>
              )}
              {court.has_roof && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">
                  <Home className="w-3 h-3" />
                  Techada
                </div>
              )}
              {!court.has_lighting && !court.has_heating && !court.has_roof && (
                <span className="text-xs text-gray-400 italic">Sin características especiales</span>
              )}
            </div>
          </div>

          {/* Maintenance Notes */}
          {court.is_maintenance && court.maintenance_notes && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <Settings className="w-4 h-4 text-orange-600 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-orange-700">En mantenimiento</p>
                  <p className="text-xs text-orange-600 mt-1">{court.maintenance_notes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 bg-white hover:bg-gray-50 text-gray-700 rounded-xl transition-colors font-medium"
              onClick={() => {/* Navigate to reservations */}}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Ver Reservas
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-9 w-9 p-0 rounded-xl hover:bg-gray-100"
                >
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem 
                  onClick={() => onEdit(court)}
                  className="cursor-pointer rounded-lg"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleToggleMaintenance}
                  className="cursor-pointer rounded-lg"
                  disabled={toggleMaintenanceMutation.isPending}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {court.is_maintenance ? 'Finalizar mantenimiento' : 'Poner en mantenimiento'}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="cursor-pointer text-red-600 focus:text-red-600 rounded-lg"
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