import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  MapPin,
  User,
  DollarSign,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ReservationsService } from '@/lib/api/services/reservations.service';
import { LoadingState } from '@/components/ui/states/loading-state';
import { toast } from '@/lib/toast';
import { Reservation } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui';
import { useReservationStore } from '@/store/reservations';

export const ReservationsList = () => {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const { openModal } = useUIStore();
  const { setSelectedReservation } = useReservationStore();

  const { data, isLoading } = useQuery({
    queryKey: ['reservations', 'list', page],
    queryFn: () =>
      ReservationsService.list({
        page,
        page_size: 10,
        ordering: '-date,-start_time',
      }),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      ReservationsService.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Reserva cancelada');
    },
    onError: () => {
      toast.error('Error al cancelar la reserva');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => ReservationsService.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Reserva confirmada');
    },
    onError: () => {
      toast.error('Error al confirmar la reserva');
    },
  });

  const handleEdit = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    openModal('edit-reservation');
  };

  const handleCancel = (reservation: Reservation) => {
    if (confirm('¿Estás seguro de cancelar esta reserva?')) {
      cancelMutation.mutate({ id: reservation.id });
    }
  };

  const handleConfirm = (reservation: Reservation) => {
    confirmMutation.mutate(reservation.id);
  };

  const getStatusColor = (status: Reservation['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
    }
  };

  const getPaymentStatusColor = (status: Reservation['payment_status']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'refunded':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (isLoading) return <LoadingState />;

  const reservations = data?.results || [];

  return (
    <div className="space-y-4">
      {reservations.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No hay reservas disponibles
          </p>
        </Card>
      ) : (
        <>
          {reservations.map((reservation, index) => (
            <motion.div
              key={reservation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {reservation.client.first_name}{' '}
                          {reservation.client.last_name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {format(
                            new Date(reservation.date),
                            "EEEE, d 'de' MMMM 'de' yyyy",
                            { locale: es }
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={cn(
                            'border',
                            getStatusColor(reservation.status)
                          )}
                        >
                          {reservation.status === 'confirmed' && 'Confirmada'}
                          {reservation.status === 'pending' && 'Pendiente'}
                          {reservation.status === 'cancelled' && 'Cancelada'}
                          {reservation.status === 'completed' && 'Completada'}
                        </Badge>
                        <Badge
                          className={getPaymentStatusColor(
                            reservation.payment_status
                          )}
                        >
                          {reservation.payment_status === 'paid' && 'Pagado'}
                          {reservation.payment_status === 'pending' &&
                            'Pago pendiente'}
                          {reservation.payment_status === 'refunded' &&
                            'Reembolsado'}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>
                          {reservation.start_time} - {reservation.end_time}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4" />
                        <span>{reservation.court.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <User className="w-4 h-4" />
                        <span>{reservation.client.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <DollarSign className="w-4 h-4" />
                        <span>${reservation.total_amount}</span>
                      </div>
                    </div>

                    {reservation.notes && (
                      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 italic">
                        Nota: {reservation.notes}
                      </p>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="ml-4">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(reservation)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>

                      {reservation.status === 'pending' && (
                        <DropdownMenuItem
                          onClick={() => handleConfirm(reservation)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirmar
                        </DropdownMenuItem>
                      )}

                      {reservation.status !== 'cancelled' &&
                        reservation.status !== 'completed' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleCancel(reservation)}
                              className="text-red-600 dark:text-red-400"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancelar
                            </DropdownMenuItem>
                          </>
                        )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            </motion.div>
          ))}

          {/* Pagination */}
          {data && data.count > 10 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando {(page - 1) * 10 + 1} -{' '}
                {Math.min(page * 10, data.count)} de {data.count} reservas
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={!data.previous}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={!data.next}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
