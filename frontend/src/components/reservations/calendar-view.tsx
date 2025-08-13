import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
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
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { ReservationsService } from '@/lib/api/services/reservations.service';
import { CourtsService } from '@/lib/api/services/courts.service';
import { useUIStore } from '@/store/ui';
import { Badge } from '@/components/ui/badge';
import { Court } from '@/lib/api/types';

type ViewMode = 'month' | 'week' | 'day';

export const CalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { openModal } = useUIStore();

  const { data: reservations } = useQuery({
    queryKey: ['reservations', format(currentDate, 'yyyy-MM')],
    queryFn: () =>
      ReservationsService.list({
        start_date: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
        end_date: format(endOfMonth(currentDate), 'yyyy-MM-dd'),
      }),
  });

  // Calculate week dates for week view
  const weekStart = viewMode === 'week' ? startOfWeek(currentDate, { weekStartsOn: 1 }) : null;
  const weekEnd = viewMode === 'week' ? endOfWeek(currentDate, { weekStartsOn: 1 }) : null;

  // Get reservations for the week
  const { data: weekReservations } = useQuery({
    queryKey: [
      'reservations',
      weekStart ? format(weekStart, 'yyyy-MM-dd') : '',
      weekEnd ? format(weekEnd, 'yyyy-MM-dd') : '',
    ],
    queryFn: () =>
      ReservationsService.list({
        start_date: format(weekStart!, 'yyyy-MM-dd'),
        end_date: format(weekEnd!, 'yyyy-MM-dd'),
      }),
    enabled: viewMode === 'week' && !!weekStart && !!weekEnd,
  });

  // Get all courts
  const { data: courts } = useQuery({
    queryKey: ['courts'],
    queryFn: () => CourtsService.list(),
    enabled: viewMode === 'week',
  });

  const handlePrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    if (viewMode === 'month') {
      setViewMode('day');
      setCurrentDate(date);
    }
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const dateFormat = 'd';
    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, dateFormat);
        const dayReservations =
          reservations?.results.filter(
            (r) => r.date === format(day, 'yyyy-MM-dd')
          ) || [];

        days.push(
          <div
            key={day.toISOString()}
            className={cn(
              'relative p-2 h-24 border-r border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors',
              !isSameMonth(day, monthStart) &&
                'bg-gray-50 dark:bg-gray-900 text-gray-400',
              isToday(day) && 'bg-primary-50 dark:bg-primary-900/20',
              selectedDate &&
                isSameDay(day, selectedDate) &&
                'bg-primary-100 dark:bg-primary-900/40',
              'hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
            onClick={() => handleDateClick(day)}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={cn(
                  'text-sm font-medium',
                  isToday(day) && 'text-primary-600 dark:text-primary-400'
                )}
              >
                {formattedDate}
              </span>
              {dayReservations.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {dayReservations.length}
                </Badge>
              )}
            </div>
            <div className="space-y-1 overflow-hidden">
              {dayReservations.slice(0, 2).map((reservation) => (
                <motion.div
                  key={reservation.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-xs p-1 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 truncate"
                >
                  {reservation.start_time} - {reservation.client.first_name}
                </motion.div>
              ))}
              {dayReservations.length > 2 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  +{dayReservations.length - 2} más
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toISOString()}>
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div>
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
            <div
              key={day}
              className="p-2 text-center font-medium text-sm text-gray-700 dark:text-gray-300"
            >
              {day}
            </div>
          ))}
        </div>
        {rows}
      </div>
    );
  };

  const renderWeekView = () => {
    if (!weekStart || !weekEnd) return null;

    // Generate days of the week
    const days = [];
    let day = weekStart;
    while (day <= weekEnd) {
      days.push(new Date(day));
      day = addDays(day, 1);
    }

    // Generate time slots (8:00 - 22:00)
    const timeSlots = [];
    for (let hour = 8; hour < 22; hour++) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    const getReservationForSlot = (court: Court, date: Date, time: string) => {
      return weekReservations?.results.find(
        (r) =>
          r.court.id === court.id &&
          r.date === format(date, 'yyyy-MM-dd') &&
          r.start_time <= time &&
          r.end_time > time
      );
    };

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header with days */}
          <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-0 border-b border-gray-200 dark:border-gray-700">
            <div className="p-2 font-medium text-sm text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
              Pista / Día
            </div>
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  'p-2 text-center border-r border-gray-200 dark:border-gray-700',
                  isToday(day) && 'bg-primary-50 dark:bg-primary-900/20'
                )}
              >
                <div className="font-medium text-sm text-gray-700 dark:text-gray-300">
                  {format(day, 'EEE', { locale: es })}
                </div>
                <div
                  className={cn(
                    'text-lg',
                    isToday(day)
                      ? 'text-primary-600 dark:text-primary-400 font-semibold'
                      : 'text-gray-900 dark:text-gray-100'
                  )}
                >
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Court rows */}
          {courts?.map((court: any) => (
            <div
              key={court.id}
              className="grid grid-cols-[100px_repeat(7,1fr)] gap-0 border-b border-gray-200 dark:border-gray-700"
            >
              <div className="p-2 font-medium text-sm text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                {court.name}
              </div>
              {days.map((day) => (
                <div
                  key={`${court.id}-${day.toISOString()}`}
                  className="relative border-r border-gray-200 dark:border-gray-700 min-h-[400px] p-1"
                >
                  <div className="space-y-1">
                    {timeSlots.map((time) => {
                      const reservation = getReservationForSlot(
                        court,
                        day,
                        time
                      );
                      const isFirstSlot =
                        reservation && reservation.start_time === time;

                      if (!reservation) {
                        return (
                          <div
                            key={time}
                            className="h-6 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                            onClick={() => {
                              setSelectedDate(day);
                              openModal('new-reservation');
                            }}
                          />
                        );
                      }

                      if (isFirstSlot) {
                        const startHour = parseInt(
                          reservation.start_time.split(':')[0]
                        );
                        const endHour = parseInt(
                          reservation.end_time.split(':')[0]
                        );
                        const duration = endHour - startHour;

                        return (
                          <motion.div
                            key={time}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={cn(
                              'absolute left-1 right-1 p-2 rounded-md text-xs cursor-pointer',
                              'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300',
                              'hover:shadow-md transition-shadow'
                            )}
                            style={{
                              top: `${(startHour - 8) * 24 + 4}px`,
                              height: `${duration * 24 - 8}px`,
                            }}
                            onClick={() => handleDateClick(day)}
                          >
                            <div className="font-medium truncate">
                              {reservation.client.first_name}{' '}
                              {reservation.client.last_name}
                            </div>
                            <div className="text-xs opacity-75">
                              {reservation.start_time} - {reservation.end_time}
                            </div>
                          </motion.div>
                        );
                      }

                      return null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Time scale overlay */}
          <div className="absolute left-0 top-[72px] w-[100px] pointer-events-none">
            {timeSlots.map((time, index) => (
              <div
                key={time}
                className="h-6 text-xs text-gray-500 dark:text-gray-400 text-right pr-2"
                style={{
                  position: 'absolute',
                  top: `${index * 24}px`,
                  right: 0,
                }}
              >
                {time}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayReservations =
      reservations?.results.filter(
        (r) => r.date === format(currentDate, 'yyyy-MM-dd')
      ) || [];

    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">
          {format(currentDate, "EEEE, d 'de' MMMM", { locale: es })}
        </h3>
        <div className="space-y-2">
          {dayReservations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay reservas para este día
            </div>
          ) : (
            dayReservations.map((reservation) => (
              <motion.div
                key={reservation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {reservation.client.first_name}{' '}
                      {reservation.client.last_name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {reservation.start_time} - {reservation.end_time} •{' '}
                      {reservation.court.name}
                    </p>
                  </div>
                  <Badge
                    variant={
                      reservation.status === 'confirmed'
                        ? 'default'
                        : reservation.status === 'pending'
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {reservation.status === 'confirmed' && 'Confirmada'}
                    {reservation.status === 'pending' && 'Pendiente'}
                    {reservation.status === 'cancelled' && 'Cancelada'}
                  </Badge>
                </div>
              </motion.div>
            ))
          )}
        </div>
        <Button
          className="mt-4 w-full"
          onClick={() => openModal('new-reservation')}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Reserva
        </Button>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handlePrevious}>
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <h2 className="text-lg font-semibold">
              {viewMode === 'month' &&
                format(currentDate, "MMMM 'de' yyyy", { locale: es })}
              {viewMode === 'week' &&
                `Semana del ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd', { locale: es })} de ${format(currentDate, 'MMMM', { locale: es })}`}
              {viewMode === 'day' &&
                format(currentDate, "d 'de' MMMM 'de' yyyy", { locale: es })}
            </h2>

            <Button variant="ghost" size="icon" onClick={handleNext}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleToday}>
              Hoy
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
              >
                Mes
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('week')}
              >
                Semana
              </Button>
              <Button
                variant={viewMode === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('day')}
              >
                Día
              </Button>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        key={viewMode}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </motion.div>
    </Card>
  );
};
