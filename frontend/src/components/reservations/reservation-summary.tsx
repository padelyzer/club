import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Calendar, Clock, MapPin, User, DollarSign } from 'lucide-react';
import { ClientsService } from '@/lib/api/services/clients.service';
import { CourtsService } from '@/lib/api/services/courts.service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReservationSummaryProps {
  clientId: string;
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export const ReservationSummary = ({
  clientId,
  courtId,
  date,
  startTime,
  endTime,
}: ReservationSummaryProps) => {
  const { data: client } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => ClientsService.get(clientId),
    enabled: !!clientId,
  });

  const { data: court } = useQuery({
    queryKey: ['court', courtId],
    queryFn: () => CourtsService.get(courtId),
    enabled: !!courtId,
  });

  const calculateDuration = (start: string, end: string): number => {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    return endHour * 60 + endMin - (startHour * 60 + startMin);
  };

  const calculatePrice = (
    hourlyRate: number,
    durationMinutes: number
  ): number => {
    return (hourlyRate * durationMinutes) / 60;
  };

  const duration = calculateDuration(startTime, endTime);
  const price = court ? calculatePrice(court.hourly_rate, duration) : 0;

  return (
    <Card className="p-6 bg-gray-50 dark:bg-gray-800">
      <h3 className="font-semibold text-lg mb-4">Resumen de la Reserva</h3>

      <div className="space-y-3">
        {client && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="font-medium">
                {client.first_name} {client.last_name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {client.email}
              </p>
            </div>
          </div>
        )}

        {court && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium">{court.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {court.court_type === 'indoor' && 'Interior'}
                {court.court_type === 'outdoor' && 'Exterior'}
                {court.court_type === 'covered' && 'Cubierta'}
                {' • '}
                {court.surface === 'artificial_grass' && 'Césped artificial'}
                {court.surface === 'concrete' && 'Hormigón'}
                {court.surface === 'synthetic' && 'Sintético'}
              </p>
            </div>
          </div>
        )}

        {date && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium">
                {format(new Date(date), "EEEE, d 'de' MMMM 'de' yyyy", {
                  locale: es,
                })}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {startTime} - {endTime} ({duration / 60}h{' '}
                {duration % 60 > 0 && `${duration % 60}min`})
              </p>
            </div>
          </div>
        )}

        <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total a pagar
                </p>
                <p className="font-semibold text-lg">${price.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
