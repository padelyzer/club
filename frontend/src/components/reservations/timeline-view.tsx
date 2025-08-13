import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { ReservationsService } from '@/lib/api/services/reservations.service';
import { CourtsService } from '@/lib/api/services/courts.service';
import { TimelineHeader } from './timeline-header';
import { TimelineGrid } from './timeline-grid';
import { LoadingState } from '@/components/ui/states/loading-state';
import { useStableToast } from '@/hooks/useStableToast';
import { Court } from '@/types/court';
import { Reservation } from '@/lib/api/types';

interface TimelineViewProps {
  date: Date;
}

export const TimelineView = ({ date }: TimelineViewProps) => {
  const [selectedDate, setSelectedDate] = useState(date);
  const [draggedReservation, setDraggedReservation] =
    useState<Reservation | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const toast = useStableToast();

  const { data: courts, isLoading: isLoadingCourts } = useQuery({
    queryKey: ['courts'],
    queryFn: () => CourtsService.list(),
  });

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['reservations', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: () =>
      ReservationsService.list({
        date: format(selectedDate, 'yyyy-MM-dd'),
      }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const reservation = event.active.data.current as Reservation;
    setDraggedReservation(reservation);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const reservation = active.data.current as Reservation;
      const [courtId, startTime] = over.id.toString().split('-');

      // Check availability
      const available = await ReservationsService.checkAvailability({
        club: reservation.club,
        court: courtId,
        date: format(selectedDate, 'yyyy-MM-dd'),
      });

      // Check if slot is available based on response data
      const isSlotAvailable = available.availability.some((courtAvail: any) => 
        courtAvail.court.id === courtId && 
        courtAvail.slots.some((slot: any) => 
          slot.start_time === startTime && slot.is_available
        )
      );

      if (isSlotAvailable) {
        await ReservationsService.update(reservation.id, {
          court: courtId,
          start_time: startTime,
        });
        toast.success('Reserva actualizada');
      } else {
        toast.error('Horario no disponible');
      }
    }

    setDraggedReservation(null);
  };

  const calculateEndTime = (
    newStartTime: string,
    originalEndTime: string,
    originalStartTime: string
  ): string => {
    const [startHour, startMin] = originalStartTime.split(':').map(Number);
    const [endHour, endMin] = originalEndTime.split(':').map(Number);
    const duration = endHour * 60 + endMin - (startHour * 60 + startMin);

    const [newStartHour, newStartMin] = newStartTime.split(':').map(Number);
    const newEndTotalMinutes = newStartHour * 60 + newStartMin + duration;
    const newEndHour = Math.floor(newEndTotalMinutes / 60);
    const newEndMin = newEndTotalMinutes % 60;

    return `${newEndHour.toString().padStart(2, '0')}:${newEndMin.toString().padStart(2, '0')}`;
  };

  const handlePrevDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  if (isLoading || isLoadingCourts) return <LoadingState />;

  return (
    <Card className="overflow-hidden shadow-lg border-0 bg-white dark:bg-gray-900">
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handlePrevDay}
              className="hover:bg-white/60 dark:hover:bg-gray-800/60 rounded-full"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 capitalize">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
            </h2>

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleNextDay}
              className="hover:bg-white/60 dark:hover:bg-gray-800/60 rounded-full"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleToday}
            className="bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700"
          >
            Hoy
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="relative overflow-x-auto bg-gray-50/50 dark:bg-gray-800/50" ref={timelineRef}>
          <div className="min-w-[1200px]">
            <TimelineHeader courts={courts?.results || []} />

            <TimelineGrid
              courts={courts?.results || []}
              reservations={reservations?.results || []}
              draggedReservation={draggedReservation}
            />
          </div>
        </div>
      </DndContext>
    </Card>
  );
};
