'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { History, Calendar, User, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMaintenanceHistory } from '@/lib/api/hooks/useMaintenance';
import type { MaintenanceSchedule } from '@/lib/api/hooks/useMaintenance';

interface MaintenanceHistoryProps {
  courtId: string;
}

export function MaintenanceHistory({ courtId }: MaintenanceHistoryProps) {
  const { data: history = [], isLoading } = useMaintenanceHistory(courtId);

  const getTypeColor = (type: MaintenanceSchedule['type']) => {
    switch (type) {
      case 'routine':
        return 'bg-blue-100 text-blue-700';
      case 'repair':
        return 'bg-orange-100 text-orange-700';
      case 'improvement':
        return 'bg-green-100 text-green-700';
      case 'emergency':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeLabel = (type: MaintenanceSchedule['type']) => {
    switch (type) {
      case 'routine':
        return 'Rutina';
      case 'repair':
        return 'Reparación';
      case 'improvement':
        return 'Mejora';
      case 'emergency':
        return 'Emergencia';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-12 w-12 bg-gray-100 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="p-8 text-center">
        <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No hay historial de mantenimiento</p>
      </Card>
    );
  }

  // Group history by year
  const groupedHistory = history.reduce(
    (groups, item) => {
      const year = new Date(item.startDate).getFullYear();
      if (!groups[year]) {
        groups[year] = [];
      }
      groups[year].push(item);
      return groups;
    },
    {} as Record<number, MaintenanceSchedule[]>
  );

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
        <History className="h-5 w-5" />
        Historial de Mantenimiento
      </h3>

      <div className="space-y-8">
        {Object.entries(groupedHistory)
          .sort(([a], [b]) => Number(b) - Number(a))
          .map(([year, items]) => (
            <div key={year}>
              <h4 className="text-sm font-semibold text-gray-500 mb-4">
                {year}
              </h4>

              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                <div className="space-y-6">
                  {items.map((item, index) => (
                    <div key={item.id} className="relative flex gap-4">
                      <div
                        className={`
                        w-12 h-12 rounded-full flex items-center justify-center
                        ${item.status === 'completed' ? 'bg-green-100' : 'bg-gray-100'}
                        z-10
                      `}
                      >
                        <Calendar className="h-5 w-5 text-gray-600" />
                      </div>

                      <div className="flex-1 pb-6">
                        <Card className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium">{item.title}</h5>
                            <Badge className={getTypeColor(item.type)}>
                              {getTypeLabel(item.type)}
                            </Badge>
                          </div>

                          {item.description && (
                            <p className="text-sm text-gray-600 mb-3">
                              {item.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {format(
                                  new Date(item.startDate),
                                  'dd MMM yyyy',
                                  { locale: es }
                                )}
                                {' - '}
                                {format(new Date(item.endDate), 'dd MMM yyyy', {
                                  locale: es,
                                })}
                              </span>
                            </div>

                            {item.assignedTo && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{item.assignedTo}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              <span>
                                {item.status === 'completed'
                                  ? 'Completado'
                                  : item.status === 'cancelled'
                                    ? 'Cancelado'
                                    : 'En progreso'}
                              </span>
                            </div>
                          </div>
                        </Card>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
      </div>
    </Card>
  );
}
