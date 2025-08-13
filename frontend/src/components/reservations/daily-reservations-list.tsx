'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, User, DollarSign, CheckCircle, AlertCircle, XCircle, Calendar, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reservation } from '@/types/reservation';
import { Button } from '@/components/ui/professional/Button';

interface DailyReservationsListProps {
  reservations: Reservation[];
  selectedDate: Date;
  onReservationClick: (reservation: Reservation) => void;
  loading?: boolean;
}

export const DailyReservationsList: React.FC<DailyReservationsListProps> = ({
  reservations,
  selectedDate,
  onReservationClick,
  loading = false,
}) => {
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    const dateStr = date.toLocaleDateString('es-ES', options);
    // Capitalize first letter
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5);
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    const diffMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    
    if (diffMinutes < 60) {
      return `${diffMinutes} min`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
    }
  };

  const getTimeBlockStyle = (startTime: string) => {
    const hour = parseInt(startTime.split(':')[0]);
    
    // Premium gradient combinations with multiple color stops
    if (hour >= 6 && hour < 9) {
      // Early morning - Aurora gradient
      return {
        gradient: 'bg-gradient-to-br from-violet-600 via-purple-500 to-pink-500',
        border: 'border-purple-600/20',
        shadow: 'shadow-lg shadow-purple-500/25',
        icon: '🌅',
        pattern: 'bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))]'
      };
    } else if (hour >= 9 && hour < 12) {
      // Morning - Ocean gradient
      return {
        gradient: 'bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-400',
        border: 'border-blue-600/20',
        shadow: 'shadow-lg shadow-blue-500/25',
        icon: '☀️',
        pattern: 'bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))]'
      };
    } else if (hour >= 12 && hour < 15) {
      // Midday - Tropical gradient
      return {
        gradient: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500',
        border: 'border-teal-600/20',
        shadow: 'shadow-lg shadow-teal-500/25',
        icon: '🌞',
        pattern: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))]'
      };
    } else if (hour >= 15 && hour < 18) {
      // Afternoon - Sunset gradient
      return {
        gradient: 'bg-gradient-to-br from-orange-500 via-red-500 to-pink-500',
        border: 'border-orange-600/20',
        shadow: 'shadow-lg shadow-orange-500/25',
        icon: '🌇',
        pattern: 'bg-[conic-gradient(at_bottom_left,_var(--tw-gradient-stops))]'
      };
    } else if (hour >= 18 && hour < 21) {
      // Evening - Twilight gradient
      return {
        gradient: 'bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500',
        border: 'border-pink-600/20',
        shadow: 'shadow-lg shadow-pink-500/25',
        icon: '🌆',
        pattern: 'bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))]'
      };
    } else {
      // Night - Midnight gradient
      return {
        gradient: 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600',
        border: 'border-indigo-600/20',
        shadow: 'shadow-lg shadow-indigo-500/25',
        icon: '🌙',
        pattern: 'bg-[conic-gradient(at_center,_var(--tw-gradient-stops))]'
      };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'confirmed':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          text: 'Confirmada',
          bgColor: 'bg-green-50',
          iconColor: 'text-green-600',
          dotColor: 'bg-green-500',
        };
      case 'pending':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          text: 'Pendiente',
          bgColor: 'bg-amber-50',
          iconColor: 'text-amber-600',
          dotColor: 'bg-amber-500',
        };
      case 'cancelled':
        return {
          icon: <XCircle className="w-5 h-5" />,
          text: 'Cancelada',
          bgColor: 'bg-red-50',
          iconColor: 'text-red-600',
          dotColor: 'bg-red-500',
        };
      case 'completed':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          text: 'Completada',
          bgColor: 'bg-blue-50',
          iconColor: 'text-blue-600',
          dotColor: 'bg-blue-500',
        };
      default:
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          text: status,
          bgColor: 'bg-gray-50',
          iconColor: 'text-gray-600',
          dotColor: 'bg-gray-500',
        };
    }
  };

  // Sort reservations by start time
  const sortedReservations = [...reservations].sort((a, b) => {
    return a.start_time.localeCompare(b.start_time);
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <div className="h-10 w-96 bg-gray-200 rounded-lg animate-pulse mb-2" />
          <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gray-200 rounded-xl" />
              <div className="flex-1 space-y-3">
                <div className="h-5 w-48 bg-gray-200 rounded" />
                <div className="h-4 w-64 bg-gray-200 rounded" />
                <div className="h-4 w-32 bg-gray-200 rounded" />
              </div>
              <div className="h-8 w-24 bg-gray-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {formatDate(selectedDate)}
        </h2>
        <p className="text-base text-gray-500">
          {sortedReservations.length} {sortedReservations.length === 1 ? 'reserva' : 'reservas'} programadas
        </p>
      </div>

      {/* Reservations List */}
      {sortedReservations.length > 0 ? (
        <div className="space-y-4">
          <AnimatePresence>
            {sortedReservations.map((reservation, index) => {
              const statusConfig = getStatusConfig(reservation.status);
              const timeStyle = getTimeBlockStyle(reservation.start_time);
              const courtName = typeof reservation.court === 'string' 
                ? `Cancha ${reservation.court}` 
                : reservation.court?.name || 'Sin cancha';

              return (
                <motion.div
                  key={reservation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  onClick={() => onReservationClick(reservation)}
                  className="group cursor-pointer"
                >
                  <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group">
                    <div className="flex items-stretch">
                      {/* Time Block - Premium Design */}
                      <div className={cn(
                        "relative px-6 py-6 flex flex-col justify-center items-center min-w-[160px] border-r overflow-hidden",
                        timeStyle.gradient,
                        timeStyle.border,
                        timeStyle.shadow,
                        "group-hover:scale-[1.02] transition-transform duration-200"
                      )}>
                        {/* Decorative pattern overlay */}
                        <div className="absolute inset-0 opacity-20 mix-blend-overlay">
                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
                          <div className="absolute bottom-0 left-0 w-16 h-16 bg-black/10 rounded-full blur-xl" />
                        </div>
                        
                        {/* Time icon */}
                        <div className="absolute top-2 right-2 text-2xl opacity-60">
                          {timeStyle.icon}
                        </div>
                        
                        {/* Time display */}
                        <div className="relative z-10 text-center">
                          <div className="text-2xl font-bold text-white drop-shadow-lg">
                            {formatTime(reservation.start_time)}
                          </div>
                          <div className="text-xs text-white/60 uppercase tracking-wider mt-1">
                            hasta
                          </div>
                          <div className="text-lg font-semibold text-white/90 drop-shadow">
                            {formatTime(reservation.end_time)}
                          </div>
                        </div>
                        
                        {/* Duration indicator */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/20 backdrop-blur-sm rounded-full">
                          <span className="text-[10px] text-white/80 font-medium">
                            {calculateDuration(reservation.start_time, reservation.end_time)}
                          </span>
                        </div>
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 p-6 bg-gradient-to-br from-gray-50/50 to-white">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* Client Name - Larger and more prominent */}
                            <div className="mb-4">
                              <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-gray-800 transition-colors">
                                {reservation.player_name || 'Sin cliente'}
                              </h3>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-gray-100 rounded-lg">
                                    <MapPin className="w-4 h-4 text-gray-600" />
                                  </div>
                                  <span className="text-base font-medium text-gray-700">{courtName}</span>
                                </div>
                              </div>
                            </div>

                            {/* Status and Price Row */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                {/* Enhanced Status Badge */}
                                <div className={cn(
                                  "relative inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-sm font-semibold shadow-sm",
                                  statusConfig.bgColor,
                                  "ring-1 ring-inset",
                                  statusConfig.iconColor === 'text-green-600' && 'ring-green-600/20',
                                  statusConfig.iconColor === 'text-amber-600' && 'ring-amber-600/20',
                                  statusConfig.iconColor === 'text-red-600' && 'ring-red-600/20',
                                  statusConfig.iconColor === 'text-blue-600' && 'ring-blue-600/20'
                                )}>
                                  <div className={cn(
                                    "w-2.5 h-2.5 rounded-full animate-pulse",
                                    statusConfig.dotColor
                                  )} />
                                  <span className={statusConfig.iconColor}>{statusConfig.text}</span>
                                </div>
                              </div>
                              
                              {/* Enhanced Price Display */}
                              <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-sm border border-gray-100">
                                <DollarSign className="w-5 h-5 text-green-600" />
                                <span className="font-bold text-2xl text-gray-900">
                                  {reservation.total_price || 0}
                                </span>
                                <span className="text-sm text-gray-500">.00</span>
                              </div>
                            </div>

                            {/* Notes with better styling */}
                            {reservation.notes && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200"
                              >
                                <p className="text-sm text-gray-700 leading-relaxed">
                                  <span className="font-semibold text-gray-800">📝 Notas:</span> {reservation.notes}
                                </p>
                              </motion.div>
                            )}
                          </div>

                          {/* Action Area */}
                          <div className="ml-6 flex flex-col items-end gap-2">
                            {reservation.status === 'pending' && (
                              <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={cn(
                                  "px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm",
                                  "bg-gradient-to-r from-amber-400 to-orange-400 text-white",
                                  "hover:from-amber-500 hover:to-orange-500",
                                  "hover:shadow-md"
                                )}
                              >
                                Requiere Atención
                              </motion.div>
                            )}
                            <motion.div
                              whileHover={{ x: 5 }}
                              className="p-2 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-all"
                            >
                              <ChevronRight className="w-5 h-5 text-gray-600" />
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              No hay reservas para este día
            </h3>
            <p className="text-gray-600 mb-6">
              Selecciona otro día en el calendario o crea una nueva reserva para comenzar
            </p>
            <Button 
              size="md"
              className="mx-auto"
              onClick={(e) => {
                e.stopPropagation();
                // This would trigger the new reservation modal
              }}
            >
              Nueva Reserva
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};