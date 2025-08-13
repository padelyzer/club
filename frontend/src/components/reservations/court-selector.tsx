import { Control, Controller } from 'react-hook-form';
import { MapPin, Info, Clock, DollarSign, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { CourtsService } from '@/lib/api/services/courts.service';
import { useCourtAvailability } from '@/lib/api/hooks/useReservations';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Court } from '@/lib/api/types';

interface CourtSelectorProps {
  control: Control<any>;
  clubId: string;
  date: string;
  error?: string;
  onCourtSelect?: (courtId: string, court: Court) => void;
  showAvailability?: boolean;
}

export const CourtSelector = ({ 
  control, 
  clubId, 
  date, 
  error, 
  onCourtSelect, 
  showAvailability = false 
}: CourtSelectorProps) => {
  const { data: courts, isLoading } = useQuery({
    queryKey: ['courts', clubId],
    queryFn: () => CourtsService.list({ club: clubId }),
    enabled: !!clubId,
  });

  const { data: availability } = useCourtAvailability(
    clubId,
    date,
    undefined,
    showAvailability && !!clubId && !!date
  );

  const getCourtTypeLabel = (type: Court['court_type']) => {
    const labels = {
      indoor: 'Interior',
      outdoor: 'Exterior',
      covered: 'Cubierta',
    };
    return labels[type] || type;
  };

  const getSurfaceLabel = (surface: Court['surface']) => {
    const labels = {
      artificial_grass: 'Césped artificial',
      concrete: 'Hormigón',
      synthetic: 'Sintético',
    };
    return labels[surface] || surface;
  };

  const getCourtAvailability = (courtId: string) => {
    if (!availability) return null;
    return availability.availability.find(a => a.court.id === courtId);
  };

  const getAvailableSlots = (courtId: string) => {
    const courtAvailability = getCourtAvailability(courtId);
    if (!courtAvailability) return 0;
    return courtAvailability.slots.filter(slot => slot.is_available).length;
  };

  return (
    <Controller
      name="court_id"
      control={control}
      render={({ field }) => (
        <div>
          <label className="block text-sm font-medium mb-2">Pista</label>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Cargando pistas...
            </div>
          ) : courts?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay pistas disponibles
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {courts?.map((court: any) => (
                <motion.div
                  key={court.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className={cn(
                      'p-4 cursor-pointer transition-all border-2',
                      field.value === court.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600',
                      !court.is_active && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={() => {
                      if (court.is_active) {
                        field.onChange(court.id);
                        onCourtSelect?.(court.id, court);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                        {court.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        {showAvailability && (
                          <Badge 
                            variant={getAvailableSlots(court.id) > 0 ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {getAvailableSlots(court.id)} slots
                          </Badge>
                        )}
                        {field.value === court.id && (
                          <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>
                          {getCourtTypeLabel(court.court_type)} • {getSurfaceLabel(court.surface)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span className="font-medium">${court.hourly_rate}/hora</span>
                      </div>

                      {showAvailability && getCourtAvailability(court.id) && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {getAvailableSlots(court.id) > 0 
                              ? `${getAvailableSlots(court.id)} horarios disponibles`
                              : 'Sin disponibilidad'
                            }
                          </span>
                        </div>
                      )}
                    </div>

                    {!court.is_active && (
                      <div className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400 mt-2">
                        <AlertCircle className="w-3 h-3" />
                        <span>Pista no disponible</span>
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
      )}
    />
  );
};
