'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reservation } from '@/types/reservation';

interface ModernReservationsListProps {
  reservations: Reservation[];
  selectedDate: Date;
  onReservationClick: (reservation: Reservation) => void;
  loading?: boolean;
}

export const ModernReservationsList: React.FC<ModernReservationsListProps> = ({
  reservations,
  selectedDate,
  onReservationClick,
  loading = false,
}) => {
  const formatDate = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) return 'Hoy';
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) return 'Mañana';
    
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    };
    return date.toLocaleDateString('es-ES', options);
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5);
  };

  const formatTimeRange = (start: string, end: string) => {
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  // Sort reservations by start time
  const sortedReservations = [...reservations].sort((a, b) => {
    return a.start_time.localeCompare(b.start_time);
  });

  // Group reservations by time slots for better visual organization
  const groupedReservations = sortedReservations.reduce((groups, reservation) => {
    const hour = parseInt(reservation.start_time.split(':')[0]);
    const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    
    if (!groups[period]) groups[period] = [];
    groups[period].push(reservation);
    return groups;
  }, {} as Record<string, Reservation[]>);

  const periodLabels = {
    morning: 'Mañana',
    afternoon: 'Tarde',
    evening: 'Noche'
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-gray-100 rounded-lg mb-6" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-50 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalRevenue = sortedReservations.reduce((sum, res) => sum + (res.total_price || 0), 0);

  return (
    <div>
      {/* Minimal Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-light text-gray-900 mb-1">
          {formatDate(selectedDate)}
        </h1>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <span>{sortedReservations.length} reservas</span>
          <span>·</span>
          <span>${totalRevenue} total</span>
        </div>
      </div>

      {sortedReservations.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedReservations).map(([period, periodReservations]) => (
            <div key={period}>
              {/* Period header */}
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                {periodLabels[period as keyof typeof periodLabels]}
              </h3>

              {/* Reservations for this period */}
              <div className="space-y-2">
                <AnimatePresence>
                  {periodReservations.map((reservation, index) => {
                    const courtName = typeof reservation.court === 'string' 
                      ? `Cancha ${reservation.court}` 
                      : reservation.court?.name || 'Sin cancha';
                    
                    const isPending = reservation.status === 'pending';
                    const isCancelled = reservation.status === 'cancelled';

                    return (
                      <motion.div
                        key={reservation.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.15, delay: index * 0.02 }}
                        onClick={() => onReservationClick(reservation)}
                        className="group cursor-pointer"
                      >
                        <div className={cn(
                          "relative bg-white rounded-xl p-5 transition-all duration-200",
                          "hover:shadow-lg hover:-translate-y-0.5",
                          "border border-gray-100",
                          isPending && "border-l-4 border-l-amber-400",
                          isCancelled && "opacity-50"
                        )}>
                          <div className="flex items-center justify-between">
                            {/* Left section - Time and Main Info */}
                            <div className="flex items-center gap-6">
                              {/* Time */}
                              <div className="text-center min-w-[80px]">
                                <div className="text-2xl font-light text-gray-900">
                                  {formatTime(reservation.start_time)}
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  {formatTime(reservation.end_time)}
                                </div>
                              </div>

                              {/* Divider */}
                              <div className="h-12 w-px bg-gray-100" />

                              {/* Main content */}
                              <div>
                                <h3 className="text-base font-medium text-gray-900 mb-1">
                                  {reservation.player_name || 'Sin nombre'}
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  <span className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {courtName}
                                  </span>
                                  {reservation.player_count > 1 && (
                                    <>
                                      <span>·</span>
                                      <span>{reservation.player_count} personas</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right section - Price and Actions */}
                            <div className="flex items-center gap-6">
                              {/* Price */}
                              <div className="text-right">
                                <div className="text-lg font-light text-gray-900">
                                  ${reservation.total_price || 0}
                                </div>
                                {isPending && (
                                  <div className="text-xs text-amber-600 font-medium mt-0.5">
                                    Pendiente
                                  </div>
                                )}
                              </div>

                              {/* Action button */}
                              <button className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-50 transition-all">
                                <MoreVertical className="w-4 h-4 text-gray-400" />
                              </button>
                            </div>
                          </div>

                          {/* Notes - Very subtle */}
                          {reservation.notes && (
                            <div className="mt-3 pt-3 border-t border-gray-50">
                              <p className="text-xs text-gray-400 line-clamp-1">
                                {reservation.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4">
            <Clock className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-light text-gray-600 mb-2">
            No hay reservas para este día
          </h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            Las canchas están disponibles. Es un buen momento para programar nuevas actividades.
          </p>
        </motion.div>
      )}
    </div>
  );
};