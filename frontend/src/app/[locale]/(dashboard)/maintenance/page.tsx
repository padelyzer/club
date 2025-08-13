'use client';

import { useState } from 'react';
import { Plus, Calendar, List, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MaintenanceCalendar } from '@/components/maintenance/maintenance-calendar';
import { MaintenanceList } from '@/components/maintenance/maintenance-list';
import { MaintenanceHistory } from '@/components/maintenance/maintenance-history';
import { MaintenanceForm } from '@/components/maintenance/maintenance-form';
import { useMaintenanceNotifications } from '@/lib/api/hooks/useMaintenance';
import { Badge } from '@/components/ui/badge';

type ViewMode = 'calendar' | 'list' | 'history';

export default function MaintenancePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedCourtId, setSelectedCourtId] = useState<string>('');

  const { data: notifications } = useMaintenanceNotifications();

  const handleCreateMaintenance = (date?: Date) => {
    if (date) {
      setSelectedDate(date);
    }
    setIsFormOpen(true);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Mantenimiento de Canchas</h1>
          <p className="text-gray-600">
            Gestiona el mantenimiento y cuidado de las instalaciones
          </p>
        </div>

        <Button onClick={() => handleCreateMaintenance()}>
          <Plus className="h-4 w-4 mr-2" />
          Programar Mantenimiento
        </Button>
      </div>

      {/* Notifications */}
      {notifications &&
        (notifications.upcoming.length > 0 ||
          notifications.overdue.length > 0) && (
          <Card className="p-4 mb-6 bg-yellow-50 border-yellow-200">
            <div className="space-y-2">
              {notifications.overdue.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">
                    {notifications.overdue.length} vencidos
                  </Badge>
                  <span className="text-sm text-gray-600">
                    Hay mantenimientos pendientes que requieren atención
                  </span>
                </div>
              )}
              {notifications.upcoming.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="warning">
                    {notifications.upcoming.length} próximos
                  </Badge>
                  <span className="text-sm text-gray-600">
                    Mantenimientos programados para los próximos 7 días
                  </span>
                </div>
              )}
            </div>
          </Card>
        )}

      {/* View Mode Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={viewMode === 'calendar' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('calendar')}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Calendario
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('list')}
        >
          <List className="h-4 w-4 mr-2" />
          Lista
        </Button>
        <Button
          variant={viewMode === 'history' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('history')}
        >
          <History className="h-4 w-4 mr-2" />
          Historial
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {viewMode === 'calendar' && (
          <MaintenanceCalendar
            courtId={selectedCourtId}
            onSelectDate={setSelectedDate}
            onCreateMaintenance={handleCreateMaintenance}
          />
        )}

        {viewMode === 'list' && (
          <div className="space-y-6">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Filtros</h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm">
                  Todos
                </Button>
                <Button variant="outline" size="sm">
                  Programados
                </Button>
                <Button variant="outline" size="sm">
                  En progreso
                </Button>
                <Button variant="outline" size="sm">
                  Completados
                </Button>
              </div>
            </Card>

            <MaintenanceList />
          </div>
        )}

        {viewMode === 'history' && selectedCourtId && (
          <MaintenanceHistory courtId={selectedCourtId} />
        )}

        {viewMode === 'history' && !selectedCourtId && (
          <Card className="p-8 text-center">
            <p className="text-gray-500">
              Selecciona una cancha para ver su historial de mantenimiento
            </p>
          </Card>
        )}
      </div>

      {/* Maintenance Form Modal */}
      <MaintenanceForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedDate(null);
        }}
        {...(selectedDate && { initialDate: selectedDate })}
      />
    </div>
  );
}
