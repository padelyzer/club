import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Clock, User, DollarSign } from 'lucide-react';
import { Reservation } from '@/lib/api/types';

interface ReservationCardProps {
  reservation: Reservation;
  courtWidth: number;
  hourHeight: number;
}

export const ReservationCard = ({
  reservation,
  courtWidth,
  hourHeight,
}: ReservationCardProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: reservation.id,
      data: { current: reservation },
    });

  // Calculate duration in minutes
  const [startHour, startMin] = reservation.start_time.split(':').map(Number);
  const [endHour, endMin] = reservation.end_time.split(':').map(Number);
  const durationMinutes = endHour * 60 + endMin - (startHour * 60 + startMin);

  const style = {
    transform: CSS.Translate.toString(transform),
    height: `${(durationMinutes / 60) * hourHeight - 4}px`,
    width: `${courtWidth - 8}px`,
  };

  const statusColors = {
    confirmed:
      'bg-gradient-to-br from-green-100 to-green-200 border-green-400 text-green-900 dark:from-green-900/30 dark:to-green-800/30 dark:border-green-500 dark:text-green-100 shadow-green-200/50 dark:shadow-green-900/50',
    pending:
      'bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-400 text-yellow-900 dark:from-yellow-900/30 dark:to-yellow-800/30 dark:border-yellow-500 dark:text-yellow-100 shadow-yellow-200/50 dark:shadow-yellow-900/50',
    cancelled:
      'bg-gradient-to-br from-red-100 to-red-200 border-red-400 text-red-900 dark:from-red-900/30 dark:to-red-800/30 dark:border-red-500 dark:text-red-100 shadow-red-200/50 dark:shadow-red-900/50',
    completed:
      'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-400 text-gray-900 dark:from-gray-700/30 dark:to-gray-600/30 dark:border-gray-500 dark:text-gray-100 shadow-gray-200/50 dark:shadow-gray-700/50',
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={cn(
        'absolute top-1 left-1 rounded-lg border-2 p-3 cursor-move',
        'shadow-lg hover:shadow-xl transition-all duration-200 backdrop-blur-sm',
        statusColors[reservation.status],
        isDragging && 'opacity-60 z-50 scale-105'
      )}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      {...listeners}
      {...attributes}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-1">
          <p className="font-medium text-sm truncate">
            {reservation.player_name || `${reservation.client?.first_name || ''} ${reservation.client?.last_name || ''}`.trim() || 'Cliente'}
          </p>
          <span className="text-xs px-2 py-1 rounded-full bg-white/70 dark:bg-black/40 font-semibold shadow-sm">
            {reservation.status === 'confirmed'
              ? '✓'
              : reservation.status === 'pending'
                ? '⏳'
                : reservation.status === 'cancelled'
                  ? '✗'
                  : '✓'}
          </span>
        </div>

        <div className="space-y-1 text-xs opacity-80">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>
              {reservation.start_time} - {reservation.end_time}
            </span>
          </div>

          {(reservation.total_price || reservation.total_amount) > 0 && (
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              <span>${reservation.total_price || reservation.total_amount}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
