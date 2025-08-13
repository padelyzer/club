'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, User, Calendar, ChevronRight, Circle, CreditCard, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reservation } from '@/types/reservation';

interface AppleReservationsListProps {
  reservations: Reservation[];
  selectedDate: Date;
  onReservationClick: (reservation: Reservation) => void;
  loading?: boolean;
}

export const AppleReservationsList: React.FC<AppleReservationsListProps> = ({
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
    const dateStr = date.toLocaleDateString('es-ES', options);
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5);
  };

  const formatPrice = (price: number) => {
    return Math.round(price);
  };

  const formatDuration = (start: string, end: string) => {
    const startDate = new Date(`2000-01-01 ${start}`);
    const endDate = new Date(`2000-01-01 ${end}`);
    const diff = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}min`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}min`;
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { 
          color: 'text-green-700 bg-green-100', 
          label: 'Confirmada'
        };
      case 'pending':
        return { 
          color: 'text-orange-700 bg-orange-100', 
          label: 'Pendiente'
        };
      case 'cancelled':
        return { 
          color: 'text-red-700 bg-red-100', 
          label: 'Cancelada'
        };
      case 'completed':
        return { 
          color: 'text-blue-700 bg-blue-100', 
          label: 'Completada'
        };
      default:
        return { 
          color: 'text-gray-700 bg-gray-100', 
          label: status
        };
    }
  };

  // Sort reservations by start time
  const sortedReservations = [...reservations].sort((a, b) => {
    return a.start_time.localeCompare(b.start_time);
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gray-100 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-40 bg-gray-100 rounded-md" />
                <div className="h-4 w-28 bg-gray-100 rounded-md" />
              </div>
              <div className="h-4 w-16 bg-gray-100 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const stats = {
    total: sortedReservations.length,
    revenue: sortedReservations.reduce((sum, res) => sum + (res.total_price || 0), 0),
    pending: sortedReservations.filter(res => res.status === 'pending').length,
  };

  return (
    <div>
      {/* Enhanced Header with Apple-style design */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-3">
            {formatDate(selectedDate)}
          </h1>
          <div className="flex items-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-gray-700 font-medium">{stats.total} reservas</span>
            </div>
            {stats.pending > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-gray-700 font-medium">{stats.pending} por confirmar</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-gray-700 font-bold">${formatPrice(stats.revenue)} total</span>
            </div>
          </div>
        </div>
      </div>

      {sortedReservations.length > 0 ? (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {sortedReservations.map((reservation, index) => {
              const courtName = typeof reservation.court === 'string' 
                ? `Cancha ${reservation.court}` 
                : reservation.court?.name || `Cancha ${reservation.court}`;
              
              const statusConfig = getStatusConfig(reservation.status);
              const duration = formatDuration(reservation.start_time, reservation.end_time);

              return (
                <motion.div
                  key={reservation.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ 
                    duration: 0.2,
                    delay: index * 0.03,
                    layout: { type: "spring", stiffness: 500, damping: 50 }
                  }}
                  onClick={() => onReservationClick(reservation)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="group cursor-pointer"
                >
                  <div className="relative bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100">
                    {/* Status indicator line */}
                    {reservation.status === 'pending' && (
                      <div className="absolute left-0 top-6 bottom-6 w-1 bg-orange-400 rounded-r-full" />
                    )}

                    <div className="flex items-center justify-between gap-4">
                      {/* Apple Calendar-style Time block */}
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center w-16 h-16 bg-blue-50 rounded-2xl border border-blue-100">
                          <span className="text-lg font-bold text-blue-900 leading-none">
                            {formatTime(reservation.start_time)}
                          </span>
                          <span className="text-xs font-medium text-blue-700 mt-0.5">
                            {duration}
                          </span>
                        </div>

                        {/* Main info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-base font-medium text-gray-900">
                              {reservation.player_name || 'Sin nombre'}
                            </h3>
                            <span className={cn(
                              "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold",
                              statusConfig.color
                            )}>
                              {statusConfig.label}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" />
                              {courtName}
                            </span>
                          </div>

                          {/* Notes */}
                          {reservation.notes && (
                            <p className="mt-2 text-sm text-gray-500 line-clamp-1">
                              {reservation.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right section with action buttons */}
                      <div className="flex items-center gap-4">
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          {reservation.payment_status === 'pending' && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle payment logic here
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-colors"
                            >
                              <CreditCard className="w-3 h-3" />
                              Pagar
                            </button>
                          )}
                          {reservation.payment_status === 'paid' && reservation.status !== 'completed' && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle check-in logic here
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-lg hover:bg-green-600 transition-colors"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Check-in
                            </button>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-medium text-gray-900">
                            ${formatPrice(reservation.total_price || 0)}
                          </div>
                          {reservation.payment_status === 'pending' && (
                            <p className="text-xs text-orange-600">
                              Pago pendiente
                            </p>
                          )}
                        </div>
                        
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gray-50 rounded-2xl p-12 text-center"
        >
          <div className="max-w-sm mx-auto">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay reservas
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Todas las canchas están disponibles para este día.
            </p>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors">
              Agregar reserva
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};