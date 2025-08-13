'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  User,
  Circle
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  getDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/professional/Card';
import { Button } from '@/components/ui/professional/Button';
import { useQuery } from '@tanstack/react-query';
import { ReservationsService } from '@/lib/api/services/reservations.service';
import { useUIStore } from '@/store/ui';
import { Reservation } from '@/types/reservation';

export const ModernCalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { openModal } = useUIStore();

  const { data: reservationsData, isLoading } = useQuery({
    queryKey: ['reservations', format(currentDate, 'yyyy-MM')],
    queryFn: () =>
      ReservationsService.list({
        start_date: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
        end_date: format(endOfMonth(currentDate), 'yyyy-MM-dd'),
        page_size: 500,
      }),
  });

  const reservations = reservationsData?.results || [];

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const handlePrevious = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNext = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    if (!isSameMonth(date, currentDate)) {
      setCurrentDate(date);
    }
  };

  const getReservationsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return reservations.filter(res => res.date === dateStr);
  };

  const getDayColor = (date: Date) => {
    const dayOfWeek = getDay(date);
    const colors = [
      'from-purple-500 to-purple-600', // Sunday
      'from-blue-500 to-blue-600',     // Monday
      'from-teal-500 to-teal-600',     // Tuesday
      'from-green-500 to-green-600',   // Wednesday
      'from-orange-500 to-orange-600', // Thursday
      'from-pink-500 to-pink-600',     // Friday
      'from-indigo-500 to-indigo-600', // Saturday
    ];
    return colors[dayOfWeek];
  };

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900 capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </h2>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleToday}
            className="ml-4"
          >
            Hoy
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePrevious}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </motion.button>
        </div>
      </div>
    );
  };

  const renderDaysOfWeek = () => {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    return (
      <div className="grid grid-cols-7 gap-2 mb-2">
        {days.map(day => (
          <div
            key={day}
            className="text-center text-sm font-semibold text-gray-600 py-2"
          >
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCalendarDays = () => {
    const days = [];
    let day = calendarStart;

    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }

    return (
      <div className="grid grid-cols-7 gap-2">
        <AnimatePresence mode="popLayout">
          {days.map((day, index) => {
            const dayReservations = getReservationsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isCurrentDay = isToday(day);

            return (
              <motion.div
                key={day.toISOString()}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: index * 0.01 }}
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleDateClick(day)}
                  className={cn(
                    "relative w-full aspect-square rounded-xl p-2 transition-all",
                    "flex flex-col items-center justify-start gap-1",
                    "hover:shadow-md",
                    isCurrentMonth ? 'bg-white' : 'bg-gray-50',
                    isSelected && 'ring-2 ring-[#007AFF] ring-offset-2',
                    isCurrentDay && !isSelected && 'ring-2 ring-gray-300'
                  )}
                >
                  {/* Date Number */}
                  <div className={cn(
                    "text-sm font-semibold",
                    isCurrentMonth ? 'text-gray-900' : 'text-gray-400',
                    isCurrentDay && 'text-[#007AFF]'
                  )}>
                    {format(day, 'd')}
                  </div>

                  {/* Reservations */}
                  {dayReservations.length > 0 && (
                    <div className="flex flex-col gap-0.5 w-full">
                      {dayReservations.slice(0, 3).map((reservation, idx) => {
                        const startHour = parseInt(reservation.start_time.split(':')[0]);
                        const bgClass = getDayColor(day);
                        
                        return (
                          <motion.div
                            key={reservation.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={cn(
                              "w-full px-1.5 py-0.5 rounded text-[10px] font-medium text-white",
                              "bg-gradient-to-r",
                              bgClass
                            )}
                          >
                            {format(new Date(`2000-01-01 ${reservation.start_time}`), 'HH:mm')}
                          </motion.div>
                        );
                      })}
                      {dayReservations.length > 3 && (
                        <div className="text-[10px] text-gray-500 text-center">
                          +{dayReservations.length - 3} más
                        </div>
                      )}
                    </div>
                  )}

                  {/* Empty State */}
                  {dayReservations.length === 0 && isCurrentMonth && (
                    <div className="flex-1 flex items-center justify-center">
                      <Circle className="w-1 h-1 text-gray-300" />
                    </div>
                  )}
                </motion.button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  };

  const renderSelectedDateInfo = () => {
    if (!selectedDate) return null;

    const dayReservations = getReservationsForDate(selectedDate);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6"
      >
        <Card variant="glass" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
            </h3>
            <Button
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => openModal('new-reservation', { date: selectedDate })}
            >
              Nueva Reserva
            </Button>
          </div>

          {dayReservations.length > 0 ? (
            <div className="space-y-2">
              {dayReservations.map((reservation) => {
                const startHour = parseInt(reservation.start_time.split(':')[0]);
                const bgClass = getDayColor(selectedDate);

                return (
                  <motion.div
                    key={reservation.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold",
                      "bg-gradient-to-br",
                      bgClass
                    )}>
                      {format(new Date(`2000-01-01 ${reservation.start_time}`), 'HH:mm')}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-900">
                          {reservation.player_name || 'Sin cliente'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-3 h-3" />
                        <span>
                          {typeof reservation.court === 'string' 
                            ? `Cancha ${reservation.court}` 
                            : reservation.court?.name || 'Sin cancha'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        ${reservation.total_price || 0}
                      </div>
                      <div className="text-xs text-gray-500">
                        {reservation.duration || 60} min
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No hay reservas para este día</p>
            </div>
          )}
        </Card>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 w-64 bg-gray-200 rounded-lg mb-6" />
        <div className="grid grid-cols-7 gap-2">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="aspect-square bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {renderHeader()}
      <Card variant="glass" padding="lg">
        {renderDaysOfWeek()}
        {renderCalendarDays()}
      </Card>
      {renderSelectedDateInfo()}
    </div>
  );
};