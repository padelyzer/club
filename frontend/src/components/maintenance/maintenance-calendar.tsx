'use client';

import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isWithinInterval,
  parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Wrench,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { useMaintenanceSchedules } from '@/lib/api/hooks/useMaintenance';
import { useReservations } from '@/lib/api/hooks/useReservations';
import { cn } from '@/lib/utils';
import type { MaintenanceSchedule } from '@/lib/api/hooks/useMaintenance';
import type { Reservation } from '@/types';

interface MaintenanceCalendarProps {
  courtId?: string;
  onSelectDate: (date: Date) => void;
  onCreateMaintenance: (date: Date) => void;
  onEditMaintenance?: (maintenance: MaintenanceSchedule) => void;
}

interface ConflictInfo {
  maintenance: MaintenanceSchedule;
  conflicts: Reservation[];
}

export function MaintenanceCalendar({
  courtId,
  onSelectDate,
  onCreateMaintenance,
  onEditMaintenance,
}: MaintenanceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showConflicts, setShowConflicts] = useState<ConflictInfo | null>(null);

  const { data: maintenanceSchedules = [], isLoading } =
    useMaintenanceSchedules({
      courtId,
      startDate: format(startOfMonth(currentMonth), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(currentMonth), 'yyyy-MM-dd'),
    });

  const { data: reservations = [] } = useReservations({
    courtId,
    startDate: format(startOfMonth(currentMonth), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(currentMonth), 'yyyy-MM-dd'),
  });

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getMaintenanceForDay = (date: Date): MaintenanceSchedule[] => {
    return maintenanceSchedules.filter((schedule) => {
      const scheduleStart = new Date(schedule.startDate);
      const scheduleEnd = new Date(schedule.endDate);
      return isWithinInterval(date, { start: scheduleStart, end: scheduleEnd });
    });
  };

  const getReservationsForDay = (date: Date): Reservation[] => {
    return reservations.filter((reservation: any) => {
      const reservationDate = parseISO(reservation.date);
      return isSameDay(reservationDate, date);
    });
  };

  const checkMaintenanceConflicts = (
    maintenance: MaintenanceSchedule
  ): Reservation[] => {
    const maintenanceStart = parseISO(maintenance.startDate);
    const maintenanceEnd = parseISO(maintenance.endDate);

    return reservations.filter((reservation: any) => {
      const reservationDate = parseISO(reservation.date);

      // Check if reservation court matches maintenance court
      if (maintenance.courtId && reservation.courtId !== maintenance.courtId)
        return false;

      // Check if reservation date falls within maintenance period
      return isWithinInterval(reservationDate, {
        start: maintenanceStart,
        end: maintenanceEnd,
      });
    });
  };

  const getStatusIcon = (status: MaintenanceSchedule['status']) => {
    switch (status) {
      case 'scheduled':
        return <Wrench className="h-3 w-3" aria-hidden="true" />;
      case 'in_progress':
        return <AlertCircle className="h-3 w-3" aria-hidden="true" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3" aria-hidden="true" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: MaintenanceSchedule['type']) => {
    switch (type) {
      case 'routine':
        return 'bg-blue-500';
      case 'repair':
        return 'bg-orange-500';
      case 'improvement':
        return 'bg-green-500';
      case 'emergency':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onSelectDate(date);
  };

  const handleMaintenanceClick = (
    e: React.MouseEvent,
    maintenance: MaintenanceSchedule
  ) => {
    e.stopPropagation();
    const conflicts = checkMaintenanceConflicts(maintenance);
    if (conflicts.length > 0) {
      setShowConflicts({ maintenance, conflicts });
    } else if (onEditMaintenance) {
      onEditMaintenance(maintenance);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  if (isLoading) {
    return (
      <Card
        className="p-6"
        role="region"
        aria-busy="true"
        aria-label="Cargando calendario de mantenimiento"
      >
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
        <span className="sr-only">Cargando calendario de mantenimiento...</span>
      </Card>
    );
  }

  return (
    <>
      <Card
        className="p-6"
        role="region"
        aria-label="Calendario de mantenimiento"
      >
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-xl font-semibold capitalize"
            id="calendar-title"
            aria-live="polite"
          >
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousMonth}
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
              aria-label="Ir a hoy"
            >
              Hoy
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2" role="row">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(
            (day, index) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-gray-500 py-2"
                role="columnheader"
                aria-label={
                  [
                    'Domingo',
                    'Lunes',
                    'Martes',
                    'Miércoles',
                    'Jueves',
                    'Viernes',
                    'Sábado',
                  ][index]
                }
              >
                {day}
              </div>
            )
          )}
        </div>

        <div
          className="grid grid-cols-7 gap-1"
          role="grid"
          aria-labelledby="calendar-title"
        >
          {days.map((day) => {
            const maintenanceItems = getMaintenanceForDay(day);
            const dayReservations = getReservationsForDay(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const hasConflicts = maintenanceItems.some(
              (m) => checkMaintenanceConflicts(m).length > 0
            );

            return (
              <div
                key={day.toString()}
                className={cn(
                  'relative min-h-[80px] p-2 border rounded-lg cursor-pointer',
                  'transition-colors hover:bg-gray-50 dark:hover:bg-gray-800',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
                  isSelected && 'ring-2 ring-primary',
                  isToday && 'bg-blue-50 dark:bg-blue-900/20',
                  !isCurrentMonth && 'opacity-50'
                )}
                onClick={() => handleDateClick(day)}
                role="gridcell"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleDateClick(day);
                  }
                }}
                aria-label={`${format(day, 'd MMMM yyyy', { locale: es })}${maintenanceItems.length > 0 ? `, ${maintenanceItems.length} mantenimientos programados` : ''}${dayReservations.length > 0 ? `, ${dayReservations.length} reservas` : ''}`}
                aria-selected={isSelected}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={cn('text-sm', isToday && 'font-bold')}>
                    {format(day, 'd')}
                  </span>
                  <div className="flex items-center gap-1">
                    {hasConflicts && (
                      <Tooltip content="Hay conflictos con reservas existentes">
                        <AlertTriangle
                          className="h-3 w-3 text-red-500"
                          aria-hidden="true"
                        />
                      </Tooltip>
                    )}
                    {isSameMonth(day, currentMonth) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateMaintenance(day);
                        }}
                        aria-label={`Agregar mantenimiento el ${format(day, 'd MMMM', { locale: es })}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  {maintenanceItems.slice(0, 2).map((item) => {
                    const conflicts = checkMaintenanceConflicts(item);
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'text-xs p-1 rounded flex items-center gap-1 cursor-pointer',
                          'hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-white',
                          getTypeColor(item.type),
                          'text-white'
                        )}
                        onClick={(e) => handleMaintenanceClick(e, item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleMaintenanceClick(e as any, item);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Mantenimiento: ${item.title}${conflicts.length > 0 ? ', tiene conflictos' : ''}`}
                      >
                        {getStatusIcon(item.status)}
                        <span className="truncate flex-1">{item.title}</span>
                        {conflicts.length > 0 && (
                          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                  {maintenanceItems.length > 2 && (
                    <div
                      className="text-xs text-gray-500"
                      aria-label={`${maintenanceItems.length - 2} mantenimientos más`}
                    >
                      +{maintenanceItems.length - 2} más
                    </div>
                  )}
                  {dayReservations.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Users className="h-3 w-3" aria-hidden="true" />
                      <span>{dayReservations.length} reservas</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="mt-4 flex flex-wrap gap-2"
          role="list"
          aria-label="Leyenda de tipos de mantenimiento"
        >
          <div className="flex items-center gap-2 text-sm" role="listitem">
            <div
              className="w-4 h-4 bg-blue-500 rounded"
              aria-hidden="true"
            ></div>
            <span>Rutina</span>
          </div>
          <div className="flex items-center gap-2 text-sm" role="listitem">
            <div
              className="w-4 h-4 bg-orange-500 rounded"
              aria-hidden="true"
            ></div>
            <span>Reparación</span>
          </div>
          <div className="flex items-center gap-2 text-sm" role="listitem">
            <div
              className="w-4 h-4 bg-green-500 rounded"
              aria-hidden="true"
            ></div>
            <span>Mejora</span>
          </div>
          <div className="flex items-center gap-2 text-sm" role="listitem">
            <div
              className="w-4 h-4 bg-red-500 rounded"
              aria-hidden="true"
            ></div>
            <span>Emergencia</span>
          </div>
        </div>
      </Card>

      {/* Conflict Details Modal */}
      {showConflicts && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="conflict-title"
        >
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h3
                id="conflict-title"
                className="text-xl font-semibold mb-4 flex items-center gap-2"
              >
                <AlertTriangle
                  className="h-5 w-5 text-red-500"
                  aria-hidden="true"
                />
                Conflictos con Reservas Existentes
              </h3>
              <p className="text-gray-600 mb-4">
                El mantenimiento &quot;{showConflicts.maintenance.title}&quot; tiene
                conflictos con las siguientes reservas:
              </p>
              <div
                className="space-y-2 mb-4"
                role="list"
                aria-label="Lista de reservas en conflicto"
              >
                {showConflicts.conflicts.map((reservation) => (
                  <Card key={reservation.id} className="p-3" role="listitem">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{reservation.clientName}</p>
                        <p className="text-sm text-gray-600">
                          {format(parseISO(reservation.date), 'd MMMM yyyy', {
                            locale: es,
                          })}{' '}
                          •{reservation.startTime} - {reservation.endTime}
                        </p>
                      </div>
                      <Badge variant="outline">{reservation.status}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowConflicts(null)}
                  autoFocus
                >
                  Cerrar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    // TODO: Implement conflict resolution
                    setShowConflicts(null);
                  }}
                >
                  Resolver Conflictos
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
