'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users,
  UserPlus,
  Check,
  X,
  Clock,
  Mail,
  Phone,
  Calendar,
  Search,
  Filter,
  Download,
  AlertCircle,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LoadingState } from '@/components/ui/states/loading-state';
import { ErrorState } from '@/components/ui/states/error-state';

import { LeaguesService } from '@/lib/api/services/leagues.service';
import { LeagueRegistration } from '@/types/league';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

interface LeagueRegistrationsProps {
  leagueId: number;
}

export const LeagueRegistrations = ({ leagueId }: LeagueRegistrationsProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: registrations,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['league-registrations', leagueId, statusFilter],
    queryFn: () =>
      LeaguesService.getRegistrations(leagueId, {
        status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
      }),
    enabled: !!leagueId,
  });

  const approveMutation = useMutation({
    mutationFn: (registrationId: number) =>
      LeaguesService.approveRegistration(leagueId, registrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['league-registrations', leagueId],
      });
      toast.success('Inscripción aprobada exitosamente');
    },
    onError: () => {
      toast.error('Error al aprobar la inscripción');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({
      registrationId,
      reason,
    }: {
      registrationId: number;
      reason?: string;
    }) => LeaguesService.rejectRegistration(leagueId, registrationId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['league-registrations', leagueId],
      });
      toast.success('Inscripción rechazada');
    },
    onError: () => {
      toast.error('Error al rechazar la inscripción');
    },
  });

  if (isLoading) return <LoadingState message="Cargando inscripciones..." fullScreen={false} />;
  if (error) return <ErrorState message="Error al cargar las inscripciones" />;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'approved':
        return 'Aprobada';
      case 'rejected':
        return 'Rechazada';
      case 'withdrawn':
        return 'Retirada';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <Check className="w-4 h-4" />;
      case 'rejected':
        return <X className="w-4 h-4" />;
      case 'withdrawn':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getPaymentStatusColor = (status?: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter registrations based on search term
  const filteredRegistrations =
    registrations?.filter((registration) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        registration.player_name.toLowerCase().includes(searchLower) ||
        registration.player_email.toLowerCase().includes(searchLower) ||
        registration.team_name?.toLowerCase().includes(searchLower)
      );
    }) || [];

  const handleApprove = (registrationId: number) => {
    approveMutation.mutate(registrationId);
  };

  const handleReject = (registrationId: number, reason?: string) => {
    rejectMutation.mutate({ registrationId, reason });
  };

  const pendingCount =
    registrations?.filter((r) => r.status === 'pending').length || 0;
  const approvedCount =
    registrations?.filter((r) => r.status === 'approved').length || 0;

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-green-500" />
            Inscripciones
          </h2>
          <p className="text-gray-600 mt-1">
            Gestión de inscripciones de jugadores
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-yellow-50">
              {pendingCount} pendientes
            </Badge>
            <Badge variant="outline" className="bg-green-50">
              {approvedCount} aprobadas
            </Badge>
          </div>

          <Dialog
            open={showRegistrationModal}
            onOpenChange={setShowRegistrationModal}
          >
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Nueva Inscripción
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva Inscripción</DialogTitle>
              </DialogHeader>
              <RegistrationForm
                leagueId={leagueId}
                onClose={() => setShowRegistrationModal(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por nombre, email o equipo..."
            value={searchTerm || ''}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter || ''} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="approved">Aprobadas</SelectItem>
            <SelectItem value="rejected">Rechazadas</SelectItem>
            <SelectItem value="withdrawn">Retiradas</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Registrations Table */}
      {filteredRegistrations.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Jugador/Equipo</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.map((registration, index) => (
                  <motion.tr
                    key={registration.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group hover:bg-gray-50 transition-colors"
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">
                          {registration.player_name}
                        </div>
                        {registration.team_name && (
                          <div className="text-sm text-gray-500">
                            Equipo: {registration.team_name}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="w-3 h-3 text-gray-400" />
                          {registration.player_email}
                        </div>
                        {registration.player_phone && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {registration.player_phone}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {registration.category ? (
                        <Badge variant="outline">{registration.category}</Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">
                          Sin categoría
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge className={getStatusColor(registration.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(registration.status)}
                          {getStatusText(registration.status)}
                        </div>
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {registration.payment_status ? (
                        <Badge
                          className={getPaymentStatusColor(
                            registration.payment_status
                          )}
                        >
                          {registration.payment_status === 'paid'
                            ? 'Pagado'
                            : registration.payment_status === 'pending'
                              ? 'Pendiente'
                              : 'Reembolsado'}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">N/A</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="w-3 h-3" />
                        {format(
                          new Date(registration.registration_date),
                          'd MMM yyyy',
                          { locale: es }
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {registration.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleApprove(registration.id)}
                              disabled={approveMutation.isPending}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleReject(registration.id)}
                              disabled={rejectMutation.isPending}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}

                        {registration.status === 'approved' && (
                          <Badge
                            variant="outline"
                            className="text-green-600 border-green-200"
                          >
                            Activo
                          </Badge>
                        )}

                        {registration.status === 'rejected' &&
                          registration.rejected_reason && (
                            <div
                              className="text-xs text-red-600 max-w-24 truncate"
                              title={registration.rejected_reason}
                            >
                              {registration.rejected_reason}
                            </div>
                          )}
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {searchTerm || statusFilter !== 'all'
              ? 'Sin resultados'
              : 'Sin inscripciones'}
          </h3>
          <p className="text-gray-500">
            {searchTerm || statusFilter !== 'all'
              ? 'No se encontraron inscripciones que coincidan con los filtros.'
              : 'Aún no hay inscripciones para esta liga.'}
          </p>
        </Card>
      )}
    </div>
  );
};

// Registration Form Component
const RegistrationForm = ({
  leagueId,
  onClose,
}: {
  leagueId: number;
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState({
    player_name: '',
    player_email: '',
    player_phone: '',
    team_name: '',
    category: '',
    notes: '',
  });

  const queryClient = useQueryClient();

  const registerMutation = useMutation({
    mutationFn: (data: any) => LeaguesService.registerPlayer(leagueId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['league-registrations', leagueId],
      });
      toast.success('Inscripción creada exitosamente');
      onClose();
    },
    onError: () => {
      toast.error('Error al crear la inscripción');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Nombre del Jugador *
          </label>
          <Input
            value={formData.player_name || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, player_name: e.target.value }))
            }
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email *</label>
          <Input
            type="email"
            value={formData.player_email || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, player_email: e.target.value }))
            }
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Teléfono</label>
          <Input
            value={formData.player_phone || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, player_phone: e.target.value }))
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Nombre del Equipo
          </label>
          <Input
            value={formData.team_name || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, team_name: e.target.value }))
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Categoría</label>
          <Select
            value={formData.category || ''}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, category: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="principiante">Principiante</SelectItem>
              <SelectItem value="intermedio">Intermedio</SelectItem>
              <SelectItem value="avanzado">Avanzado</SelectItem>
              <SelectItem value="experto">Experto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Notas</label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={3}
          value={formData.notes || ''}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, notes: e.target.value }))
          }
          placeholder="Información adicional..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? 'Guardando...' : 'Crear Inscripción'}
        </Button>
      </div>
    </form>
  );
};
