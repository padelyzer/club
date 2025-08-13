'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, User, DollarSign, MoreHorizontal, ChevronRight, Sparkles, Trophy, Calendar, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reservation } from '@/types/reservation';

interface AppleStyleReservationsListProps {
  reservations: Reservation[];
  selectedDate: Date;
  onReservationClick: (reservation: Reservation) => void;
  loading?: boolean;
}

export const AppleStyleReservationsList: React.FC<AppleStyleReservationsListProps> = ({
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
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5);
  };

  const getTimeAccentColor = (timeStr: string) => {
    const hour = parseInt(timeStr.split(':')[0]);
    
    if (hour >= 6 && hour < 9) {
      return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    } else if (hour >= 9 && hour < 12) {
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    } else if (hour >= 12 && hour < 15) {
      return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' };
    } else if (hour >= 15 && hour < 18) {
      return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
    } else if (hour >= 18 && hour < 21) {
      return { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' };
    } else {
      return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' };
    }
  };

  const getCourtAccentColor = (courtName: string) => {
    // Generate consistent color based on court name
    const colors = [
      { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'bg-emerald-100' },
      { bg: 'bg-sky-50', text: 'text-sky-700', icon: 'bg-sky-100' },
      { bg: 'bg-violet-50', text: 'text-violet-700', icon: 'bg-violet-100' },
      { bg: 'bg-rose-50', text: 'text-rose-700', icon: 'bg-rose-100' },
    ];
    
    const index = courtName.charCodeAt(courtName.length - 1) % colors.length;
    return colors[index];
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'confirmed':
        return {
          dot: 'bg-green-500',
          bg: 'bg-green-50',
          text: 'text-green-700',
          label: 'Confirmada',
          icon: '✓'
        };
      case 'pending':
        return {
          dot: 'bg-amber-500',
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          label: 'Pendiente',
          icon: '⏳'
        };
      case 'cancelled':
        return {
          dot: 'bg-red-500',
          bg: 'bg-red-50',
          text: 'text-red-700',
          label: 'Cancelada',
          icon: '✕'
        };
      case 'completed':
        return {
          dot: 'bg-blue-500',
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          label: 'Completada',
          icon: '★'
        };
      default:
        return {
          dot: 'bg-gray-400',
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          label: status,
          icon: '•'
        };
    }
  };

  const isPrimeTime = (timeStr: string) => {
    const hour = parseInt(timeStr.split(':')[0]);
    return (hour >= 18 && hour <= 21) || (hour >= 10 && hour <= 12);
  };

  const isRecurring = (reservation: Reservation) => {
    // Mock function - check if reservation is recurring
    return reservation.id % 3 === 0;
  };

  // Sort reservations by start time
  const sortedReservations = [...reservations].sort((a, b) => {
    return a.start_time.localeCompare(b.start_time);
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white/60 backdrop-blur-xl rounded-2xl p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-48 bg-gray-200 rounded-lg" />
                <div className="h-4 w-32 bg-gray-200 rounded-lg" />
              </div>
              <div className="h-4 w-4 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Calculate stats for the day
  const totalRevenue = sortedReservations.reduce((sum, res) => sum + (res.total_price || 0), 0);
  const pendingCount = sortedReservations.filter(res => res.status === 'pending').length;
  const confirmedCount = sortedReservations.filter(res => res.status === 'confirmed').length;

  return (
    <div className="space-y-4">
      {/* Enhanced Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {formatDate(selectedDate)}
            </h2>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {sortedReservations.length} reservas
                </span>
              </div>
              
              {pendingCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-sm font-medium text-amber-700">
                    {pendingCount} pendientes
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm font-medium text-green-700">
                  ${totalRevenue} ingresos
                </span>
              </div>
            </div>
          </div>
          
          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Trophy className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Reservations List */}
      {sortedReservations.length > 0 ? (
        <div className="space-y-2">
          <AnimatePresence>
            {sortedReservations.map((reservation, index) => {
              const courtName = typeof reservation.court === 'string' 
                ? `Cancha ${reservation.court}` 
                : reservation.court?.name || 'Sin cancha';
              
              const timeAccent = getTimeAccentColor(reservation.start_time);
              const courtAccent = getCourtAccentColor(courtName);
              const statusConfig = getStatusConfig(reservation.status);
              const isPrime = isPrimeTime(reservation.start_time);
              const recurring = isRecurring(reservation);

              return (
                <motion.div
                  key={reservation.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  onClick={() => onReservationClick(reservation)}
                  className="group cursor-pointer"
                >
                  <div className="relative bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden">
                    {/* Accent stripe */}
                    <div className={cn(
                      "absolute top-0 left-0 right-0 h-1",
                      timeAccent.bg.replace('50', '400')
                    )} />
                    <div className="flex items-center gap-4 p-4">
                      {/* Time Badge with accent */}
                      <div className={cn(
                        "relative flex flex-col items-center justify-center min-w-[72px] px-4 py-3 rounded-xl border transition-colors",
                        timeAccent.bg,
                        timeAccent.border,
                        "group-hover:scale-105 transition-transform duration-200"
                      )}>
                        {isPrime && (
                          <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-500" />
                        )}
                        <span className={cn("text-base font-bold", timeAccent.text)}>
                          {formatTime(reservation.start_time)}
                        </span>
                        <div className="w-8 h-px bg-current opacity-20 my-0.5" />
                        <span className={cn("text-sm font-medium", timeAccent.text)}>
                          {formatTime(reservation.end_time)}
                        </span>
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {reservation.player_name || 'Sin cliente'}
                              </h3>
                              {recurring && (
                                <div className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Recurrente
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                              {/* Court badge with accent */}
                              <div className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg",
                                courtAccent.bg
                              )}>
                                <div className={cn(
                                  "w-6 h-6 rounded-md flex items-center justify-center",
                                  courtAccent.icon
                                )}>
                                  <MapPin className={cn("w-3.5 h-3.5", courtAccent.text)} />
                                </div>
                                <span className={cn("text-sm font-medium", courtAccent.text)}>
                                  {courtName}
                                </span>
                              </div>
                              
                              {/* Price with emphasis */}
                              {reservation.total_price && (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-4 h-4 text-green-600" />
                                  <span className="text-lg font-bold text-gray-900">
                                    {reservation.total_price}
                                  </span>
                                </div>
                              )}
                              
                              {/* Player count if available */}
                              {reservation.player_count > 1 && (
                                <div className="flex items-center gap-1.5 text-gray-600">
                                  <Users className="w-4 h-4" />
                                  <span className="text-sm font-medium">{reservation.player_count} jugadores</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Status and Actions */}
                          <div className="flex flex-col items-end gap-2">
                            <div className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
                              statusConfig.bg,
                              statusConfig.text
                            )}>
                              <span className="text-base">{statusConfig.icon}</span>
                              <span>{statusConfig.label}</span>
                            </div>
                            
                            {reservation.status === 'pending' && (
                              <motion.div
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-bold rounded-full shadow-sm"
                              >
                                Requiere atención
                              </motion.div>
                            )}
                          </div>
                        </div>

                        {/* Notes with better visibility */}
                        {reservation.notes && (
                          <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-600 line-clamp-2">
                              💬 {reservation.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Hover action hint */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-12 text-center border border-blue-100"
        >
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Calendar className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Día libre de reservas
            </h3>
            <p className="text-base text-gray-600 mb-6">
              ¡Excelente oportunidad! Este día está completamente disponible para nuevas reservas.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => {/* Trigger new reservation */}}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                Crear Primera Reserva
              </button>
              <button 
                className="px-6 py-3 bg-white text-gray-700 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Ver Otro Día
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};