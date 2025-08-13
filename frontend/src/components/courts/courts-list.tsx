'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  MapPin,
  Users,
  Zap,
  Thermometer,
  Wind,
  Settings,
  Trash2,
  Edit,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LoadingState } from '@/components/ui/states/loading-state';
import { ErrorState } from '@/components/ui/states/error-state';

import { CourtsService } from '@/lib/api/services/courts.service';
import { Court } from '@/types/court';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

import { CourtForm } from './court-form';
import { CourtDetail } from './court-detail';

interface CourtsListProps {
  clubId?: number;
}

export const CourtsList = ({ clubId }: CourtsListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showNewCourtModal, setShowNewCourtModal] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: courtsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['courts', clubId, typeFilter, statusFilter],
    queryFn: () =>
      CourtsService.getCourts(clubId, {
        type: typeFilter !== 'all' ? (typeFilter as any) : undefined,
        status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
      }),
  });

  const deleteCourtMutation = useMutation({
    mutationFn: (courtId: number) => CourtsService.deleteCourt(courtId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courts'] });
      toast.success('Cancha eliminada exitosamente');
    },
    onError: () => {
      toast.error('Error al eliminar la cancha');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      courtId,
      status,
      reason,
    }: {
      courtId: number;
      status: 'active' | 'inactive' | 'maintenance';
      reason?: string;
    }) => CourtsService.setCourtStatus(courtId, { status, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courts'] });
      toast.success('Estado de la cancha actualizado');
    },
    onError: () => {
      toast.error('Error al actualizar el estado');
    },
  });

  const courts = courtsData?.results || [];

  // Filter courts based on search term
  const filteredCourts = courts.filter((court) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      court.name.toLowerCase().includes(searchLower) ||
      String(court.number).toString().includes(searchLower) ||
      court.club_name.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'inactive':
        return <XCircle className="w-4 h-4" />;
      case 'maintenance':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <XCircle className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activa';
      case 'inactive':
        return 'Inactiva';
      case 'maintenance':
        return 'Mantenimiento';
      default:
        return status;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'padel':
        return 'bg-blue-100 text-blue-800';
      case 'tennis':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDeleteCourt = (courtId: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta cancha?')) {
      deleteCourtMutation.mutate(courtId);
    }
  };

  const handleStatusChange = (
    courtId: number,
    status: 'active' | 'inactive' | 'maintenance'
  ) => {
    updateStatusMutation.mutate({ courtId, status });
  };

  const handleViewDetails = (court: Court) => {
    setSelectedCourt(court);
    setShowDetailModal(true);
  };

  if (isLoading) return <LoadingState message="Cargando canchas..." fullScreen={false} />;
  if (error) return <ErrorState message="Error al cargar las canchas" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Canchas</h1>
          <p className="text-gray-600 mt-1">Gestión de canchas del club</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>

          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>

          <Dialog open={showNewCourtModal} onOpenChange={setShowNewCourtModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nueva Cancha
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Crear Nueva Cancha</DialogTitle>
              </DialogHeader>
              <CourtForm
                clubId={clubId}
                onSuccess={() => {
                  setShowNewCourtModal(false);
                  refetch();
                }}
                onCancel={() => setShowNewCourtModal(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar canchas..."
            value={searchTerm || ''}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={typeFilter || ''} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="padel">Padel</SelectItem>
            <SelectItem value="tennis">Tenis</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter || ''} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="inactive">Inactivas</SelectItem>
            <SelectItem value="maintenance">Mantenimiento</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold">{courts.length}</p>
            </div>
            <MapPin className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Activas</p>
              <p className="text-2xl font-bold text-green-600">
                {courts.filter((c) => c.status === 'active').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Mantenimiento</p>
              <p className="text-2xl font-bold text-yellow-600">
                {courts.filter((c) => c.status === 'maintenance').length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Inactivas</p>
              <p className="text-2xl font-bold text-gray-600">
                {courts.filter((c) => c.status === 'inactive').length}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-gray-500" />
          </div>
        </Card>
      </div>

      {/* Courts Grid */}
      {filteredCourts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourts.map((court, index) => (
            <motion.div
              key={court.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {court.name}
                      </h3>
                      <Badge className={getTypeColor(court.type)}>
                        {court.type.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                      <MapPin className="w-4 h-4" />
                      {court.club_name}
                    </div>

                    <Badge className={getStatusColor(court.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(court.status)}
                        {getStatusText(court.status)}
                      </div>
                    </Badge>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleViewDetails(court)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalles
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="w-4 h-4 mr-2" />
                        Configurar
                      </DropdownMenuItem>
                      {court.status === 'active' && (
                        <DropdownMenuItem
                          onClick={() =>
                            handleStatusChange(court.id, 'maintenance')
                          }
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Marcar Mantenimiento
                        </DropdownMenuItem>
                      )}
                      {court.status === 'maintenance' && (
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(court.id, 'active')}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Activar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleDeleteCourt(court.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Court Features */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>Máx. {court.max_players} jugadores</span>
                  </div>

                  {court.has_lighting && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Zap className="w-4 h-4" />
                      <span>Iluminación</span>
                    </div>
                  )}

                  {court.has_heating && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Thermometer className="w-4 h-4" />
                      <span>Calefacción</span>
                    </div>
                  )}

                  {court.has_air_conditioning && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Wind className="w-4 h-4" />
                      <span>A/C</span>
                    </div>
                  )}
                </div>

                {/* Surface and Location */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      Superficie:{' '}
                      <span className="font-medium">{court.surface_type}</span>
                    </span>
                    <Badge variant="outline">
                      {court.indoor ? 'Interior' : 'Exterior'}
                    </Badge>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewDetails(court)}
                  >
                    Ver Detalles
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
              ? 'Sin resultados'
              : 'Sin canchas registradas'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
              ? 'No se encontraron canchas que coincidan con los filtros.'
              : 'Comienza agregando tu primera cancha al club.'}
          </p>
          {!searchTerm && typeFilter === 'all' && statusFilter === 'all' && (
            <Button onClick={() => setShowNewCourtModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Primera Cancha
            </Button>
          )}
        </Card>
      )}

      {/* Court Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalles de la Cancha</DialogTitle>
          </DialogHeader>
          {selectedCourt && (
            <CourtDetail
              courtId={selectedCourt.id}
              onClose={() => setShowDetailModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
