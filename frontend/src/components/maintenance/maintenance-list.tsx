'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  Edit,
  Trash,
  CheckCircle,
  AlertCircle,
  Wrench,
  PlayCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  useMaintenanceSchedules,
  useDeleteMaintenance,
  useUpdateMaintenance,
} from '@/lib/api/hooks/useMaintenance';
import { MaintenanceForm } from './maintenance-form';
import { toast } from '@/lib/toast';
import type { MaintenanceSchedule } from '@/lib/api/hooks/useMaintenance';

interface MaintenanceListProps {
  courtId?: string;
  status?: MaintenanceSchedule['status'];
}

export function MaintenanceList({ courtId, status }: MaintenanceListProps) {
  const [selectedMaintenance, setSelectedMaintenance] =
    useState<MaintenanceSchedule | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: maintenanceSchedules = [], isLoading } =
    useMaintenanceSchedules({ courtId, status });
  const deleteMutation = useDeleteMaintenance();
  const updateMutation = useUpdateMaintenance(selectedMaintenance?.id || '');

  const handleEdit = (maintenance: MaintenanceSchedule) => {
    setSelectedMaintenance(maintenance);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este mantenimiento?')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Mantenimiento eliminado correctamente');
      } catch (error) {
        toast.error('Error al eliminar el mantenimiento');
      }
    }
  };

  const handleStatusChange = async (
    maintenance: MaintenanceSchedule,
    newStatus: MaintenanceSchedule['status']
  ) => {
    try {
      await updateMutation.mutateAsync({ status: newStatus });
      toast.success('Estado actualizado correctamente');
    } catch (error) {
      toast.error('Error al actualizar el estado');
    }
  };

  const getStatusBadge = (status: MaintenanceSchedule['status']) => {
    switch (status) {
      case 'scheduled':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Programado
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="warning">
            <PlayCircle className="h-3 w-3 mr-1" />
            En progreso
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="success">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completado
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Cancelado
          </Badge>
        );
    }
  };

  const getTypeBadge = (type: MaintenanceSchedule['type']) => {
    const colors = {
      routine: 'bg-blue-100 text-blue-700',
      repair: 'bg-orange-100 text-orange-700',
      improvement: 'bg-green-100 text-green-700',
      emergency: 'bg-red-100 text-red-700',
    };

    const labels = {
      routine: 'Rutina',
      repair: 'Reparación',
      improvement: 'Mejora',
      emergency: 'Emergencia',
    };

    return (
      <Badge className={colors[type]}>
        <Wrench className="h-3 w-3 mr-1" />
        {labels[type]}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-100 rounded w-2/3"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (maintenanceSchedules.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No hay mantenimientos programados</p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {maintenanceSchedules.map((maintenance) => (
          <Card key={maintenance.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg">{maintenance.title}</h3>
                  {getStatusBadge(maintenance.status)}
                  {getTypeBadge(maintenance.type)}
                </div>

                {maintenance.description && (
                  <p className="text-gray-600 mb-3">
                    {maintenance.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(maintenance.startDate), 'dd/MM/yyyy', {
                        locale: es,
                      })}
                      {' - '}
                      {format(new Date(maintenance.endDate), 'dd/MM/yyyy', {
                        locale: es,
                      })}
                    </span>
                  </div>

                  {maintenance.assignedTo && (
                    <div className="flex items-center gap-1">
                      <span>Asignado a: {maintenance.assignedTo}</span>
                    </div>
                  )}

                  {maintenance.recurrence && (
                    <Badge variant="outline">
                      Recurrente:{' '}
                      {maintenance.recurrence.frequency === 'daily' && 'Diario'}
                      {maintenance.recurrence.frequency === 'weekly' &&
                        'Semanal'}
                      {maintenance.recurrence.frequency === 'monthly' &&
                        'Mensual'}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 ml-4">
                {maintenance.status === 'scheduled' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleStatusChange(maintenance, 'in_progress')
                    }
                    aria-label="Iniciar mantenimiento"
                  >
                    <PlayCircle className="h-4 w-4" />
                  </Button>
                )}

                {maintenance.status === 'in_progress' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange(maintenance, 'completed')}
                    aria-label="Completar mantenimiento"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(maintenance)}
                  aria-label="Editar mantenimiento"
                >
                  <Edit className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(maintenance.id)}
                  aria-label="Eliminar mantenimiento"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {isFormOpen && (
        <MaintenanceForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedMaintenance(null);
          }}
          maintenance={selectedMaintenance || undefined}
        />
      )}
    </>
  );
}
