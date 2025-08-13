'use client';

import React, { useEffect } from 'react';
import { useReservationStore } from '@/store/reservations';
import { useWebSocketSubscription } from '@/hooks/useWebSocket';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Wifi } from 'lucide-react';

/**
 * Example component showing how to use WebSocket integration
 * for real-time reservation updates
 */
export const RealTimeReservationList: React.FC = () => {
  const {
    reservations,
    getFilteredReservations,
    lastWebSocketUpdate,
    pendingUpdates,
  } = useReservationStore();

  const filteredReservations = getFilteredReservations();

  // Subscribe to specific reservation updates for this component
  useWebSocketSubscription(
    ['reservation:created', 'reservation:updated', 'reservation:cancelled'],
    (message) => {
          }
  );

  return (
    <div className="space-y-4">
      {/* Real-time indicator */}
      {lastWebSocketUpdate && (
        <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-green-700 dark:text-green-400">
            <Wifi className="h-4 w-4" />
            <span>Live updates active</span>
          </div>
          <span className="text-xs text-green-600 dark:text-green-500">
            Last update: {format(new Date(lastWebSocketUpdate), 'HH:mm:ss')}
          </span>
        </div>
      )}

      {/* Reservation list */}
      <div className="grid gap-4">
        {filteredReservations.map((reservation) => {
          const isPending = pendingUpdates.has(reservation.id);

          return (
            <Card
              key={reservation.id}
              className={cn(
                'p-4 transition-all duration-300',
                isPending && 'opacity-60',
                // Highlight recently updated items
                lastWebSocketUpdate &&
                  new Date(reservation.updatedAt).getTime() >
                    new Date(lastWebSocketUpdate).getTime() - 5000 &&
                  'ring-2 ring-blue-500 animate-pulse-once'
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    Court {reservation.court.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {format(
                      new Date(`${reservation.date} ${reservation.startTime}`),
                      'PPp'
                    )}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    {reservation.players.map((player) => (
                      <span
                        key={player.id}
                        className="text-xs text-gray-500 dark:text-gray-400"
                      >
                        {player.firstName} {player.lastName}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-2">
                  <Badge
                    variant={
                      reservation.status === 'confirmed'
                        ? 'default'
                        : reservation.status === 'pending'
                          ? 'secondary'
                          : reservation.status === 'cancelled'
                            ? 'destructive'
                            : 'outline'
                    }
                  >
                    {reservation.status}
                  </Badge>

                  {isPending && (
                    <Badge variant="outline" className="text-xs">
                      <span className="animate-pulse">Updating...</span>
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredReservations.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No reservations found
        </div>
      )}
    </div>
  );
};

// Utility function for className concatenation
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
