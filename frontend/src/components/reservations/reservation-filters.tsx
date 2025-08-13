import { useState } from 'react';
import { Filter, Calendar, MapPin, User, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useReservationStore } from '@/store/reservations';
import { useQuery } from '@tanstack/react-query';
import { CourtsService } from '@/lib/api/services/courts.service';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export const ReservationFilters = () => {
  const [showFilters, setShowFilters] = useState(false);
  const { filters, setFilters, resetFilters } = useReservationStore();

  const { data: courts } = useQuery({
    queryKey: ['courts'],
    queryFn: () => CourtsService.list(),
  });

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setFilters({
      dateRange: {
        ...filters.dateRange,
        [field]: value,
      },
    });
  };

  const handleCourtToggle = (courtId: string) => {
    const newCourts = filters.courts.includes(courtId)
      ? filters.courts.filter((id) => id !== courtId)
      : [...filters.courts, courtId];

    setFilters({ courts: newCourts });
  };

  const handleStatusToggle = (status: any) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];

    setFilters({ status: newStatus });
  };

  const activeFiltersCount =
    filters.courts.length +
    (filters.status.length !== 2 ? 1 : 0) +
    (filters.dateRange.start !== format(new Date(), 'yyyy-MM-dd') ||
    filters.dateRange.end !==
      format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
      ? 1
      : 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="relative"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge variant="default" className="ml-2">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="w-4 h-4 mr-2" />
            Limpiar filtros
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-4 space-y-4">
              {/* Date Range Filter */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Calendar className="w-4 h-4" />
                  Rango de fechas
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={filters.dateRange.start || ''}
                    onChange={(e) =>
                      handleDateRangeChange('start', e.target.value)
                    }
                    className="text-sm"
                  />
                  <Input
                    type="date"
                    value={filters.dateRange.end || ''}
                    onChange={(e) =>
                      handleDateRangeChange('end', e.target.value)
                    }
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Courts Filter */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <MapPin className="w-4 h-4" />
                  Pistas
                </label>
                <div className="flex flex-wrap gap-2">
                  {courts?.map((court: any) => (
                    <Badge
                      key={court.id}
                      variant={
                        filters.courts.includes(court.id)
                          ? 'default'
                          : 'outline'
                      }
                      className="cursor-pointer"
                      onClick={() => handleCourtToggle(court.id)}
                    >
                      {court.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <User className="w-4 h-4" />
                  Estado
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      value: 'confirmed',
                      label: 'Confirmada',
                      color: 'bg-green-100 text-green-800',
                    },
                    {
                      value: 'pending',
                      label: 'Pendiente',
                      color: 'bg-yellow-100 text-yellow-800',
                    },
                    {
                      value: 'cancelled',
                      label: 'Cancelada',
                      color: 'bg-red-100 text-red-800',
                    },
                    {
                      value: 'completed',
                      label: 'Completada',
                      color: 'bg-gray-100 text-gray-800',
                    },
                  ].map((status) => (
                    <Badge
                      key={status.value}
                      variant={
                        filters.status.includes(status.value as any)
                          ? 'default'
                          : 'outline'
                      }
                      className={`cursor-pointer ${filters.status.includes(status.value as any) ? '' : status.color}`}
                      onClick={() => handleStatusToggle(status.value)}
                    >
                      {status.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
