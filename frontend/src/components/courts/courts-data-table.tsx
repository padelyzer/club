'use client';

import { useState } from 'react';
import { 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Settings, 
  Search,
  Plus,
  Filter
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

import { useCourts, useDeleteCourt, useToggleCourtMaintenance } from '@/lib/api/hooks/useCourts';
import { Court } from '@/types/court';
import { EmptyState } from '@/components/ui/EmptyState';

interface CourtsDataTableProps {
  clubId?: number;
  onEditCourt: (court: Court) => void;
  onCreateCourt: () => void;
}

export function CourtsDataTable({ 
  clubId, 
  onEditCourt, 
  onCreateCourt 
}: CourtsDataTableProps) {
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<string>('all');
  
  // Build query parameters
  const queryParams = {
    ...(clubId && { club: clubId }),
    ...(search && { search }),
    ...(isActiveFilter !== 'all' && { is_active: isActiveFilter === 'true' }),
  };

  const { data, isLoading, error } = useCourts(queryParams);
  const deleteCourtMutation = useDeleteCourt();
  const toggleMaintenanceMutation = useToggleCourtMaintenance();

  const handleDelete = async (court: Court) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar la cancha ${court.name}?`)) {
      deleteCourtMutation.mutate(court.id);
    }
  };

  const handleToggleMaintenance = (court: Court) => {
    const reason = court.is_maintenance 
      ? 'Finalizar mantenimiento'
      : window.prompt('Razón del mantenimiento:') || '';
    
    if (court.is_maintenance || reason) {
      toggleMaintenanceMutation.mutate({ id: court.id, reason });
    }
  };

  const getStatusBadge = (court: Court) => {
    if (court.is_maintenance) {
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Mantenimiento</span>;
    }
    if (!court.is_active) {
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Inactiva</span>;
    }
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Disponible</span>;
  };

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 font-medium">
          Error al cargar las canchas: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Removed header since it&apos;s now in the parent component */}

      {/* Apple-style Filters */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar canchas..."
                value={search || ''}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-10 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-all"
              />
            </div>
          </div>
          
          <Select value={isActiveFilter || ''} onValueChange={setIsActiveFilter}>
            <SelectTrigger className="w-48 h-10 bg-white border-gray-200 rounded-lg">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="true">Activas</SelectItem>
              <SelectItem value="false">Inactivas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Apple-style Data Table */}
      <div className="overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto"></div>
            <p className="mt-3 text-gray-600 font-medium">Cargando canchas...</p>
          </div>
        ) : !data?.results.length ? (
          <div className="p-12">
            <EmptyState
              icon={Settings as any}
              title="No hay canchas"
              description="No se encontraron canchas con los filtros aplicados."
              action={
                <Button 
                  onClick={onCreateCourt}
                  className="h-10 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primera Cancha
                </Button>
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-100">
                <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-600">Cancha</TableHead>
                <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-600">Superficie</TableHead>
                <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-600">Características</TableHead>
                <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-600">Estado</TableHead>
                <TableHead className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-600">Precio/Hora</TableHead>
                <TableHead className="px-6 py-4 w-20">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100">
              {data.results.map((court: any) => (
                <TableRow key={court.id} className="hover:bg-gray-50 transition-colors">
                  <TableCell className="px-6 py-4">
                    <div>
                      <div className="font-semibold text-gray-900">{court.name}</div>
                      <div className="text-sm text-gray-500">
                        Cancha #{String(court.number)}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
                      {court.surface_type_display}
                    </span>
                  </TableCell>
                  
                  <TableCell className="px-6 py-4">
                    <div className="flex gap-1 flex-wrap">
                      {court.has_lighting && (
                        <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-700">Luz</span>
                      )}
                      {court.has_heating && (
                        <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700">Calefacción</span>
                      )}
                      {court.has_roof && (
                        <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">Techo</span>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell className="px-6 py-4">
                    {getStatusBadge(court)}
                  </TableCell>
                  
                  <TableCell className="px-6 py-4">
                    <span className="font-semibold text-gray-900">
                      ${parseFloat(court.price_per_hour).toFixed(2)}
                    </span>
                  </TableCell>
                  
                  <TableCell className="px-6 py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100">
                          <MoreHorizontal className="w-4 h-4 text-gray-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => onEditCourt(court)}
                          className="cursor-pointer"
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleToggleMaintenance(court)}
                          className="cursor-pointer"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          {court.is_maintenance ? 'Finalizar' : 'Mantenimiento'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(court)}
                          className="cursor-pointer text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Apple-style Pagination */}
      {data && data.count > 10 && (
        <div className="flex justify-between items-center border-t border-gray-100 bg-gray-50 px-6 py-4">
          <p className="text-sm text-gray-600 font-medium">
            Mostrando {data.results.length} de {data.count} canchas
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!data.previous}
              className="h-8 px-3 bg-white border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg disabled:opacity-50"
            >
              Anterior
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!data.next}
              className="h-8 px-3 bg-white border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg disabled:opacity-50"
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}