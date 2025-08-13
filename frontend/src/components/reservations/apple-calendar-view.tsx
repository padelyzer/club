'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  Clock,
  CreditCard,
  CheckCircle,
  User,
  MapPin,
  TrendingUp,
  DollarSign,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reservation } from '@/types/reservation';
import { Court } from '@/types/court';
import { CourtsService } from '@/lib/api/services/courts.service';
import { ReservationsService } from '@/lib/api/services/reservations.service';
import { useUIStore } from '@/store/ui';

interface AppleCalendarViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  reservations: Reservation[];
  onReservationClick: (reservation: Reservation) => void;
  loading?: boolean;
}

type CalendarView = 'week' | 'month';

interface DayOccupancy {
  date: string;
  occupancyPercentage: number;
  totalSlots: number;
  bookedSlots: number;
  revenue: number;
  pendingPayments: number;
  reservations: Reservation[];
}

interface HourlyOccupancy {
  hour: string;
  occupancyPercentage: number;
  availableCourts: number;
  totalCourts: number;
  reservations: Reservation[];
}

export const AppleCalendarView: React.FC<AppleCalendarViewProps> = ({
  selectedDate,
  onDateChange,
  reservations,
  onReservationClick,
  loading = false,
}) => {
  const [view, setView] = useState<CalendarView>('month');
  const [courts, setCourts] = useState<Court[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(true);
  const { openModal } = useUIStore();

  // Operating hours from 8:00 to 22:00 (14 hours)
  const operatingHours = 14;
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 8; hour <= 21; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  // Load courts
  useEffect(() => {
    const loadCourts = async () => {
      try {
        setLoadingCourts(true);
        const response = await CourtsService.list({ 
          is_active: true,
          page_size: 20 
        });
        setCourts(response.results);
      } catch (error) {
                setCourts([]);
      } finally {
        setLoadingCourts(false);
      }
    };

    loadCourts();
  }, []);

  // Get week dates
  const getWeekDates = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);
      week.push(currentDate);
    }
    return week;
  };

  // Get week dates - memoized to ensure consistent hook ordering
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  // Navigation functions
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
    onDateChange(newDate);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1));
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  // Format functions
  const formatDate = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) return 'Hoy';
    
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    };
    return date.toLocaleDateString('es-ES', options);
  };

  const formatWeekRange = () => {
    const start = weekDates[0];
    const end = weekDates[6];
    const startMonth = start.toLocaleDateString('es-ES', { month: 'long' });
    const endMonth = end.toLocaleDateString('es-ES', { month: 'long' });
    
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} - ${end.getDate()} de ${startMonth} ${start.getFullYear()}`;
    } else {
      return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth} ${start.getFullYear()}`;
    }
  };

  const formatMonthYear = () => {
    return selectedDate.toLocaleDateString('es-ES', { 
      month: 'long', 
      year: 'numeric' 
    });
  };


  // Calculate occupancy for a specific date
  const calculateDayOccupancy = (date: Date): DayOccupancy => {
    const dateStr = date.toISOString().split('T')[0];
    const dayReservations = reservations.filter(r => r.date === dateStr);
    
    // Calculate total slots and booked slots
    const totalSlots = courts.length * operatingHours;
    let bookedSlots = 0;
    
    dayReservations.forEach(reservation => {
      const startHour = parseInt(reservation.start_time.split(':')[0]);
      const endHour = parseInt(reservation.end_time.split(':')[0]);
      const duration = endHour - startHour;
      bookedSlots += duration;
    });
    
    const occupancyPercentage = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;
    const revenue = dayReservations.reduce((sum, r) => sum + (r.total_price || 0), 0);
    const pendingPayments = dayReservations.filter(r => r.payment_status === 'pending').length;
    
    return {
      date: dateStr,
      occupancyPercentage,
      totalSlots,
      bookedSlots,
      revenue,
      pendingPayments,
      reservations: dayReservations
    };
  };

  // Calculate hourly occupancy for week view
  const calculateHourlyOccupancy = (hour: string, date: Date): HourlyOccupancy => {
    const dateStr = date.toISOString().split('T')[0];
    const hourInt = parseInt(hour.split(':')[0]);
    
    const hourReservations = reservations.filter(r => {
      const startHour = parseInt(r.start_time.split(':')[0]);
      const endHour = parseInt(r.end_time.split(':')[0]);
      return r.date === dateStr && hourInt >= startHour && hourInt < endHour;
    });
    
    const totalCourts = courts.length;
    const bookedCourts = hourReservations.length; // Assuming 1 reservation per court per hour
    const availableCourts = totalCourts - bookedCourts;
    const occupancyPercentage = totalCourts > 0 ? (bookedCourts / totalCourts) * 100 : 0;
    
    return {
      hour,
      occupancyPercentage,
      availableCourts,
      totalCourts,
      reservations: hourReservations
    };
  };

  // Get occupancy color based on percentage
  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-red-500';
    if (percentage >= 50) return 'bg-orange-500';
    if (percentage >= 25) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Get month calendar dates
  const getMonthDates = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    const endDate = new Date(lastDay);
    
    // Get start of week for first day
    const firstDayOfWeek = firstDay.getDay();
    const daysFromMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    startDate.setDate(firstDay.getDate() - daysFromMonday);
    
    // Get end of week for last day
    const lastDayOfWeek = lastDay.getDay();
    const daysToSunday = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
    endDate.setDate(lastDay.getDate() + daysToSunday);
    
    const dates = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  const monthDates = useMemo(() => getMonthDates(), [selectedDate]);


  // Handle day click in month view
  const handleDayClick = (date: Date) => {
    if (view === 'month') {
      // Switch to week view for the clicked date
      setView('week');
      onDateChange(date);
    }
  };

  // Handle slot click in week view
  const handleSlotClick = (time: string, date: Date) => {
    // Create new reservation
    openModal('new-reservation');
  };

  // Calculate overall stats
  const currentPeriodStats = useMemo(() => {
    const isMonthView = view === 'month';
    let periodReservations;
    
    if (isMonthView) {
      const month = selectedDate.getMonth();
      const year = selectedDate.getFullYear();
      periodReservations = reservations.filter(reservation => {
        const reservationDate = new Date(reservation.date);
        return reservationDate.getMonth() === month && reservationDate.getFullYear() === year;
      });
    } else {
      const weekStart = weekDates[0];
      const weekEnd = weekDates[6];
      periodReservations = reservations.filter(reservation => {
        const reservationDate = new Date(reservation.date);
        return reservationDate >= weekStart && reservationDate <= weekEnd;
      });
    }

    const totalSlots = isMonthView 
      ? courts.length * operatingHours * new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate()
      : courts.length * operatingHours * 7;
    
    let bookedSlots = 0;
    periodReservations.forEach(reservation => {
      const startHour = parseInt(reservation.start_time.split(':')[0]);
      const endHour = parseInt(reservation.end_time.split(':')[0]);
      const duration = endHour - startHour;
      bookedSlots += duration;
    });
    
    const avgOccupancy = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;
    const revenue = periodReservations.reduce((sum, res) => sum + (res.total_price || 0), 0);
    const pending = periodReservations.filter(res => res.payment_status === 'pending').length;
    
    // Find busiest time slots
    const hourlyStats: Record<string, number> = {};
    periodReservations.forEach(reservation => {
      const startHour = parseInt(reservation.start_time.split(':')[0]);
      const endHour = parseInt(reservation.end_time.split(':')[0]);
      for (let h = startHour; h < endHour; h++) {
        const hourKey = `${h.toString().padStart(2, '0')}:00`;
        hourlyStats[hourKey] = (hourlyStats[hourKey] || 0) + 1;
      }
    });
    
    const busiestHours = Object.entries(hourlyStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => hour);

    return {
      total: periodReservations.length,
      revenue,
      avgOccupancy,
      pending,
      busiestHours
    };
  }, [reservations, selectedDate, view, courts, weekDates, operatingHours]);

  // Early return for loading state - after all hooks are called
  if (loadingCourts) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded-md mb-6" />
          <div className="grid grid-cols-8 gap-4">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="h-96 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Stats Summary */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-lg font-bold text-gray-900">${Math.round(currentPeriodStats.revenue)}</div>
                <div className="text-xs text-gray-600">Ingresos {view === 'month' ? 'del mes' : 'de la semana'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-lg font-bold text-gray-900">{Math.round(currentPeriodStats.avgOccupancy)}%</div>
                <div className="text-xs text-gray-600">Ocupación promedio</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-600" />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {currentPeriodStats.busiestHours.slice(0, 2).join(', ')}
                </div>
                <div className="text-xs text-gray-600">Horarios más ocupados</div>
              </div>
            </div>
          </div>
          {currentPeriodStats.pending > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 rounded-lg">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-orange-800">{currentPeriodStats.pending} pagos pendientes</span>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between">
          {/* Left: Navigation */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => view === 'month' ? navigateMonth('prev') : navigateWeek('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => view === 'month' ? navigateMonth('next') : navigateWeek('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Hoy
            </button>
            
            <h2 className="text-lg font-semibold text-gray-900">
              {view === 'week' ? formatWeekRange() : formatMonthYear()}
            </h2>
          </div>

          {/* Right: View Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {(['week', 'month'] as CalendarView[]).map((viewType) => (
                <button
                  key={viewType}
                  onClick={() => setView(viewType)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-all capitalize",
                    view === viewType 
                      ? "bg-white text-gray-900 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  {viewType === 'week' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="relative">
        {/* Month View - Heatmap */}
        {view === 'month' && (
          <div className="p-6">
            {/* Month header */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Month grid */}
            <div className="grid grid-cols-7 gap-2">
              {monthDates.map((date) => {
                const dayOccupancy = calculateDayOccupancy(date);
                const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
                const isToday = date.toDateString() === new Date().toDateString();
                
                return (
                  <motion.div
                    key={date.toISOString()}
                    onClick={() => handleDayClick(date)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "aspect-square p-3 rounded-xl cursor-pointer transition-all relative group",
                      isCurrentMonth ? "opacity-100" : "opacity-40",
                      isToday && "ring-2 ring-blue-500",
                      dayOccupancy.occupancyPercentage === 0 ? "bg-gray-100 hover:bg-gray-200" : 
                      dayOccupancy.occupancyPercentage < 25 ? "bg-green-100 hover:bg-green-200" :
                      dayOccupancy.occupancyPercentage < 50 ? "bg-yellow-100 hover:bg-yellow-200" :
                      dayOccupancy.occupancyPercentage < 75 ? "bg-orange-100 hover:bg-orange-200" :
                      "bg-red-100 hover:bg-red-200"
                    )}
                  >
                    {/* Day number */}
                    <div className={cn(
                      "text-lg font-semibold mb-1",
                      isToday ? "text-blue-600" : "text-gray-900"
                    )}>
                      {date.getDate()}
                    </div>
                    
                    {/* Occupancy indicator */}
                    {isCurrentMonth && dayOccupancy.totalSlots > 0 && (
                      <div className="text-xs space-y-1">
                        <div className={cn(
                          "w-full h-1.5 rounded-full",
                          getOccupancyColor(dayOccupancy.occupancyPercentage)
                        )} />
                        <div className="text-gray-600 font-medium">
                          {dayOccupancy.bookedSlots}/{dayOccupancy.totalSlots}
                        </div>
                      </div>
                    )}
                    
                    {/* Hover tooltip */}
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      <div>Ocupación: {Math.round(dayOccupancy.occupancyPercentage)}%</div>
                      <div>Ingresos: ${Math.round(dayOccupancy.revenue)}</div>
                      {dayOccupancy.pendingPayments > 0 && (
                        <div className="text-orange-300">{dayOccupancy.pendingPayments} pagos pendientes</div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="mt-6 flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full" />
                <span className="text-gray-600">0-25% ocupación</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full" />
                <span className="text-gray-600">25-50% ocupación</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded-full" />
                <span className="text-gray-600">50-75% ocupación</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full" />
                <span className="text-gray-600">75-100% ocupación</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Week View - Simplified Hourly */}
        {view === 'week' && (
          <div className="p-6">
            {/* Week header */}
            <div className="grid grid-cols-8 gap-4 mb-4">
              <div className="text-sm font-medium text-gray-500 text-center py-2">Hora</div>
              {weekDates.map((date) => (
                <div key={date.toISOString()} className="text-center">
                  <div className="text-xs font-medium text-gray-600 uppercase mb-1">
                    {date.toLocaleDateString('es-ES', { weekday: 'short' })}
                  </div>
                  <div className={cn(
                    "text-lg font-semibold",
                    date.toDateString() === new Date().toDateString() 
                      ? "text-blue-600" 
                      : "text-gray-900"
                  )}>
                    {date.getDate()}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Hourly grid */}
            <div className="space-y-2">
              {timeSlots.map((time) => (
                <div key={time} className="grid grid-cols-8 gap-4 items-center">
                  <div className="text-sm font-medium text-gray-500 text-center py-3">
                    {time}
                  </div>
                  {weekDates.map((date) => {
                    const hourlyOccupancy = calculateHourlyOccupancy(time, date);
                    
                    return (
                      <motion.div
                        key={`${date.toISOString()}-${time}`}
                        onClick={() => handleSlotClick(time, date)}
                        whileHover={{ scale: 1.02 }}
                        className={cn(
                          "p-3 rounded-lg cursor-pointer transition-all group relative",
                          hourlyOccupancy.occupancyPercentage === 0 ? "bg-gray-50 hover:bg-gray-100" :
                          hourlyOccupancy.occupancyPercentage < 50 ? "bg-green-50 hover:bg-green-100" :
                          hourlyOccupancy.occupancyPercentage < 75 ? "bg-orange-50 hover:bg-orange-100" :
                          "bg-red-50 hover:bg-red-100"
                        )}
                      >
                        {/* Occupancy bar */}
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className={cn(
                                "h-2 rounded-full transition-all",
                                getOccupancyColor(hourlyOccupancy.occupancyPercentage)
                              )}
                              style={{ width: `${Math.min(hourlyOccupancy.occupancyPercentage, 100)}%` }}
                            />
                          </div>
                        </div>
                        
                        {/* Available courts */}
                        <div className="text-xs text-gray-600 font-medium">
                          {hourlyOccupancy.availableCourts}/{hourlyOccupancy.totalCourts} disponibles
                        </div>
                        
                        {/* Add reservation indicator */}
                        <div className="opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center justify-center transition-opacity">
                          <Plus className="w-4 h-4 text-blue-500" />
                        </div>
                        
                        {/* Tooltip */}
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {Math.round(hourlyOccupancy.occupancyPercentage)}% ocupado
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Loading overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <div className="flex items-center gap-2 text-gray-600">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
              <span className="text-sm font-medium">Cargando datos...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};