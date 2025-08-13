import { useState, useEffect } from 'react';
import { Control } from 'react-hook-form';
import { Clock, AlertCircle, Info, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCourtAvailability } from '@/lib/api/hooks/useReservations';
import { TimeSlot, CourtAvailability } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface TimeSlotPickerProps {
  control: Control<any>;
  date: string;
  clubId: string;
  courtId?: string;
  error?: string;
  onTimeSelect: (startTime: string, endTime: string, price: number, courtId: string) => void;
  onCourtSelect?: (courtId: string) => void;
}

const SLOT_DURATION_OPTIONS = [60, 90, 120]; // Duration in minutes

export const TimeSlotPicker = ({
  control,
  date,
  clubId,
  courtId,
  error,
  onTimeSelect,
  onCourtSelect,
}: TimeSlotPickerProps) => {
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(courtId || null);
  const [duration, setDuration] = useState(90); // Default 90 minutes

  const { data: availability, isLoading, error: apiError } = useCourtAvailability(
    clubId,
    date,
    courtId,
    !!clubId && !!date
  );

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  const isSlotSequenceAvailable = (
    slots: TimeSlot[],
    startTime: string,
    durationMinutes: number
  ): boolean => {
    const endTime = calculateEndTime(startTime, durationMinutes);
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    // Find the start slot
    const startSlotIndex = slots.findIndex(s => s.start_time === startTime);
    if (startSlotIndex === -1) return false;

    // Check all slots from start until we reach the end time
    let currentTime = startTime;
    let slotIndex = startSlotIndex;

    while (currentTime < endTime && slotIndex < slots.length) {
      const slot = slots[slotIndex];
      if (!slot.is_available) return false;

      // Move to next slot
      const nextTime = calculateEndTime(currentTime, 60); // Assuming 1-hour slots
      currentTime = nextTime;
      slotIndex++;
    }

    return true;
  };

  const handleTimeSelect = (slot: TimeSlot, court: CourtAvailability) => {
    if (slot.is_available && isSlotSequenceAvailable(court.slots, slot.start_time, duration)) {
      setSelectedStartTime(slot.start_time);
      setSelectedCourtId(court.court.id);
      const endTime = calculateEndTime(slot.start_time, duration);
      const totalPrice = (duration / 60) * slot.price;
      
      onTimeSelect(slot.start_time, endTime, totalPrice, court.court.id);
      onCourtSelect?.(court.court.id);
    }
  };

  const handleCourtSelect = (court: CourtAvailability) => {
    setSelectedCourtId(court.court.id);
    setSelectedStartTime(null);
    onCourtSelect?.(court.court.id);
  };

  useEffect(() => {
    if (selectedStartTime && selectedCourtId && availability) {
      const court = availability.availability.find(c => c.court.id === selectedCourtId);
      if (court) {
        const slot = court.slots.find(s => s.start_time === selectedStartTime);
        if (slot) {
          const endTime = calculateEndTime(selectedStartTime, duration);
          const totalPrice = (duration / 60) * slot.price;
          onTimeSelect(selectedStartTime, endTime, totalPrice, selectedCourtId);
        }
      }
    }
  }, [duration]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
          Cargando disponibilidad...
        </div>
      </Card>
    );
  }

  if (apiError) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="w-5 h-5" />
          <span>Error al cargar disponibilidad. Inténtalo de nuevo.</span>
        </div>
      </Card>
    );
  }

  if (!availability?.availability?.length) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-gray-500">
          <Info className="w-8 h-8 mx-auto mb-4" />
          <p>No hay canchas disponibles para esta fecha.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Duration Selection */}
      <div>
        <label className="block text-sm font-medium mb-3">Duración de la reserva</label>
        <div className="flex gap-2">
          {SLOT_DURATION_OPTIONS.map((d) => (
            <Button
              key={d}
              type="button"
              variant={duration === d ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDuration(d)}
            >
              {d === 60 ? '1h' : d === 90 ? '1.5h' : '2h'}
            </Button>
          ))}
        </div>
      </div>

      {/* Court Selection (if no specific court provided) */}
      {!courtId && availability.availability.length > 1 && (
        <div>
          <label className="block text-sm font-medium mb-3">Seleccionar cancha</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {availability.availability.map((court) => (
              <Button
                key={court.court.id}
                type="button"
                variant={selectedCourtId === court.court.id ? 'default' : 'outline'}
                className="p-4 h-auto flex flex-col items-start"
                onClick={() => handleCourtSelect(court)}
              >
                <div className="font-medium">{court.court.name}</div>
                <div className="text-sm text-gray-500">
                  ${court.court.price_per_hour}/hora
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Time Slot Selection */}
      <div>
        <label className="block text-sm font-medium mb-3">
          Horarios disponibles
          {selectedCourtId && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              - {availability.availability.find(c => c.court.id === selectedCourtId)?.court.name}
            </span>
          )}
        </label>

        {availability.availability
          .filter(court => !courtId || court.court.id === courtId)
          .filter(court => !selectedCourtId || court.court.id === selectedCourtId)
          .map((court) => (
          <Card key={court.court.id} className="p-4 mb-4">
            {!courtId && (
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">{court.court.name}</h4>
                <Badge variant="outline">
                  <DollarSign className="w-3 h-3 mr-1" />
                  ${court.court.price_per_hour}/h
                </Badge>
              </div>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {court.slots.map((slot) => {
                const isAvailable = slot.is_available && 
                  isSlotSequenceAvailable(court.slots, slot.start_time, duration);
                const isSelected = selectedStartTime === slot.start_time && 
                  selectedCourtId === court.court.id;
                const totalPrice = (duration / 60) * slot.price;

                return (
                  <motion.button
                    key={`${court.court.id}-${slot.start_time}`}
                    type="button"
                    whileHover={isAvailable ? { scale: 1.02 } : {}}
                    whileTap={isAvailable ? { scale: 0.98 } : {}}
                    className={cn(
                      'p-2 text-sm rounded-lg transition-all font-medium border-2',
                      'flex flex-col items-center justify-center min-h-[60px]',
                      isAvailable && !isSelected && [
                        'bg-white hover:bg-gray-50 border-gray-200',
                        'dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-600',
                        'hover:border-primary-300 hover:shadow-sm'
                      ],
                      isSelected && [
                        'bg-primary-500 text-white border-primary-500',
                        'shadow-md'
                      ],
                      !isAvailable && [
                        'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200',
                        'dark:bg-gray-900 dark:text-gray-600 dark:border-gray-700'
                      ]
                    )}
                    onClick={() => handleTimeSelect(slot, court)}
                    disabled={!isAvailable}
                    title={
                      !slot.is_available 
                        ? slot.reason || 'No disponible'
                        : `${slot.start_time} - $${totalPrice.toFixed(2)}`
                    }
                  >
                    <div className="font-medium">{slot.start_time}</div>
                    {isAvailable && (
                      <div className={cn(
                        'text-xs mt-1',
                        isSelected ? 'text-primary-100' : 'text-gray-500'
                      )}>
                        ${totalPrice.toFixed(0)}
                      </div>
                    )}
                    {!slot.is_available && slot.reason && (
                      <div className="text-xs text-red-400 mt-1 truncate max-w-full">
                        {slot.reason}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      {/* Selected Time Summary */}
      {selectedStartTime && selectedCourtId && (
        <Card className="p-4 bg-primary-50 dark:bg-primary-900/10 border-primary-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary-600" />
              <div>
                <div className="font-medium text-primary-900 dark:text-primary-100">
                  {selectedStartTime} - {calculateEndTime(selectedStartTime, duration)}
                </div>
                <div className="text-sm text-primary-700 dark:text-primary-300">
                  {availability?.availability.find(c => c.court.id === selectedCourtId)?.court.name}
                  {' • '}{duration === 60 ? '1 hora' : duration === 90 ? '1.5 horas' : '2 horas'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-primary-900 dark:text-primary-100">
                ${((duration / 60) * (availability?.availability.find(c => c.court.id === selectedCourtId)?.court.price_per_hour || 0)).toFixed(2)}
              </div>
              <div className="text-sm text-primary-700 dark:text-primary-300">
                Total
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};