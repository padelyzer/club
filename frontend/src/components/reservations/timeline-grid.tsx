import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { ReservationCard } from './reservation-card';
import { motion } from 'framer-motion';
import { Court } from '@/types/court';
import { Reservation } from '@/lib/api/types';

interface TimelineGridProps {
  courts: Court[];
  reservations: Reservation[];
  draggedReservation: Reservation | null;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8 AM to 10 PM
const SLOT_HEIGHT = 60; // pixels per hour
const SLOT_WIDTH = 150; // pixels per court

export const TimelineGrid = ({
  courts,
  reservations,
  draggedReservation,
}: TimelineGridProps) => {
  const reservationsByCourtAndTime = useMemo(() => {
    const map = new Map<string, Reservation>();

    reservations?.forEach((reservation) => {
      // Handle both string and object court references
      const courtId = typeof reservation.court === 'string' ? reservation.court : reservation.court?.id;
      const key = `${courtId}-${reservation.start_time}`;
      map.set(key, reservation);
    });

    return map;
  }, [reservations]);

  return (
    <div className="relative">
      {/* Time labels */}
      <div className="absolute left-0 top-0 w-20 bg-white dark:bg-gray-900 z-10 shadow-sm">
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="h-[60px] border-b border-gray-200 dark:border-gray-700 flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="text-center">
              <div className="text-sm">{hour}:00</div>
            </div>
          </div>
        ))}
      </div>

      {/* Courts grid */}
      <div className="ml-20 flex">
        {courts?.map((court) => (
          <div
            key={court.id}
            className="flex-shrink-0"
            style={{ width: SLOT_WIDTH }}
          >
            {HOURS.map((hour) => {
              const slotId = `${court.id}-${hour.toString().padStart(2, '0')}:00`;
              const reservation = reservationsByCourtAndTime.get(slotId);

              return (
                <TimeSlot
                  key={slotId}
                  slotId={slotId}
                  court={court}
                  hour={hour}
                  reservation={reservation}
                  draggedReservation={draggedReservation}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Current time indicator */}
      <CurrentTimeIndicator />
    </div>
  );
};

interface TimeSlotProps {
  slotId: string;
  court: Court;
  hour: number;
  reservation?: Reservation;
  draggedReservation: Reservation | null;
}

const TimeSlot = ({
  slotId,
  court,
  hour,
  reservation,
  draggedReservation,
}: TimeSlotProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: slotId,
    data: { court, hour },
  });

  const isAvailable = !reservation && !isOver;
  const isDraggingOver = isOver && draggedReservation;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative h-[60px] border-b border-r border-gray-200 dark:border-gray-700 transition-all duration-200',
        isAvailable && 'hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-700',
        isDraggingOver && 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 shadow-inner',
        reservation && 'cursor-not-allowed bg-white dark:bg-gray-900',
        !reservation && 'cursor-pointer'
      )}
    >
      {reservation && (
        <ReservationCard
          reservation={reservation}
          courtWidth={SLOT_WIDTH}
          hourHeight={SLOT_HEIGHT}
        />
      )}
    </div>
  );
};

const CurrentTimeIndicator = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  if (currentHour < 8 || currentHour >= 22) return null;

  const topPosition =
    (currentHour - 8) * SLOT_HEIGHT + (currentMinute * SLOT_HEIGHT) / 60;

  return (
    <motion.div
      className="absolute left-0 right-0 h-1 bg-gradient-to-r from-red-400 to-red-600 z-20 pointer-events-none shadow-lg"
      style={{ top: topPosition }}
      animate={{ opacity: [1, 0.7, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <div className="absolute -left-3 -top-2 w-5 h-5 bg-red-500 rounded-full shadow-lg border-2 border-white dark:border-gray-900" />
      <div className="absolute -right-20 -top-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full shadow-lg font-medium">
        Ahora
      </div>
    </motion.div>
  );
};
