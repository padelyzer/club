'use client';

import React, { useState, useMemo } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MoreHorizontal,
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  Clock,
  Play,
  Square,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Copy,
  UserCheck,
  CalendarDays,
} from 'lucide-react';
import { ClassSession, ClassFilters } from '@/types/class';
import {
  useClassSessions,
  useCancelClassSession,
  useStartClassSession,
  useCompleteClassSession,
} from '@/lib/api/hooks/useClasses';
import { classUtils } from '@/lib/api/classes';
import { cn } from '@/lib/utils';

interface ClassesDataTableProps {
  filters?: ClassFilters;
  onFiltersChange?: (filters: ClassFilters) => void;
  onCreateClick?: () => void;
  onViewClick?: (session: ClassSession) => void;
  onEditClick?: (session: ClassSession) => void;
  onDeleteClick?: (session: ClassSession) => void;
  onDuplicateClick?: (session: ClassSession) => void;
  onManageEnrollmentsClick?: (session: ClassSession) => void;
  onAttendanceClick?: (session: ClassSession) => void;
  className?: string;
}

export function ClassesDataTable({
  filters = {},
  onFiltersChange,
  onCreateClick,
  onViewClick,
  onEditClick,
  onDeleteClick,
  onDuplicateClick,
  onManageEnrollmentsClick,
  onAttendanceClick,
  className,
}: ClassesDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // API hooks
  const { data: sessionsData, isLoading } = useClassSessions(filters);
  const cancelSession = useCancelClassSession();
  const startSession = useStartClassSession();
  const completeSession = useCompleteClassSession();

  const sessions = sessionsData?.results || [];

  // Status badge rendering
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { label: 'Programada', variant: 'secondary' as const, icon: Calendar },
      confirmed: { label: 'Confirmada', variant: 'default' as const, icon: CheckCircle },
      in_progress: { label: 'En Progreso', variant: 'warning' as const, icon: Play },
      completed: { label: 'Completada', variant: 'success' as const, icon: CheckCircle },
      cancelled: { label: 'Cancelada', variant: 'destructive' as const, icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Get enrollment status
  const getEnrollmentStatus = (session: ClassSession) => {
    const status = classUtils.getEnrollmentStatus(session);
    const availableSpots = classUtils.getAvailableSpots(session);

    const statusConfig = {
      available: {
        label: `${availableSpots} disponibles`,
        variant: 'success' as const,
        className: 'text-green-700',
      },
      full: {
        label: 'Llena',
        variant: 'warning' as const,
        className: 'text-orange-700',
      },
      waitlist: {
        label: 'Lista de espera',
        variant: 'secondary' as const,
        className: 'text-blue-700',
      },
      closed: {
        label: 'Cerrada',
        variant: 'destructive' as const,
        className: 'text-red-700',
      },
    };

    const config = statusConfig[status] || statusConfig.available;

    return (
      <div className={cn('text-sm font-medium', config.className)}>
        {config.label}
      </div>
    );
  };

  // Define columns
  const columns: ColumnDef<ClassSession>[] = useMemo(
    () => [
      {
        accessorKey: 'schedule.name',
        header: 'Nombre de la Clase',
        cell: ({ row }) => {
          const session = row.original;
          return (
            <div className="min-w-[200px]">
              <div className="font-medium">{session.schedule.name}</div>
              <div className="text-sm text-muted-foreground">
                {session.schedule.class_type.display_name} • {session.schedule.level.display_name}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'instructor.user.first_name',
        header: 'Instructor',
        cell: ({ row }) => {
          const instructor = row.original.instructor;
          return (
            <div className="flex items-center gap-2">
              {instructor.photo_url && (
                <img
                  src={instructor.photo_url}
                  alt={`${instructor.user.first_name} ${instructor.user.last_name}`}
                  className="h-8 w-8 rounded-full object-cover"
                />
              )}
              <div>
                <div className="font-medium">
                  {instructor.user.first_name} {instructor.user.last_name}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <span>⭐ {instructor.rating.toFixed(1)}</span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'scheduled_datetime',
        header: 'Fecha y Hora',
        cell: ({ getValue }) => {
          const dateTime = getValue() as string;
          return (
            <div className="min-w-[140px]">
              <div className="font-medium">
                {format(new Date(dateTime), 'dd MMM yyyy', { locale: es })}
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {classUtils.formatClassTime(dateTime)}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'duration_minutes',
        header: 'Duración',
        cell: ({ getValue }) => {
          const duration = getValue() as number;
          return (
            <div className="text-sm">
              {Math.floor(duration / 60)}h {duration % 60}m
            </div>
          );
        },
      },
      {
        accessorKey: 'enrolled_count',
        header: 'Inscripciones',
        cell: ({ row }) => {
          const session = row.original;
          return (
            <div className="text-center">
              <div className="font-medium flex items-center gap-1 justify-center">
                <Users className="h-4 w-4" />
                {session.enrolled_count}/{session.max_participants}
              </div>
              {getEnrollmentStatus(session)}
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ getValue }) => getStatusBadge(getValue() as string),
      },
      {
        accessorKey: 'court.name',
        header: 'Ubicación',
        cell: ({ row }) => {
          const session = row.original;
          return (
            <div className="text-sm">
              {session.court?.name || session.location || 'Sin especificar'}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Acciones',
        cell: ({ row }) => {
          const session = row.original;

          const handleStatusChange = async (newStatus: string) => {
            try {
              switch (newStatus) {
                case 'in_progress':
                  await startSession.mutateAsync(session.id);
                  break;
                case 'completed':
                  await completeSession.mutateAsync(session.id);
                  break;
                case 'cancelled':
                  await cancelSession.mutateAsync({ 
                    id: session.id, 
                    reason: 'Cancelada desde la tabla de clases' 
                  });
                  break;
              }
            } catch (error) {
                          }
          };

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => onViewClick?.(session)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Detalles
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEditClick?.(session)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicateClick?.(session)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onManageEnrollmentsClick?.(session)}>
                  <Users className="mr-2 h-4 w-4" />
                  Gestionar Inscripciones
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAttendanceClick?.(session)}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Asistencia
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {session.status === 'scheduled' && (
                  <DropdownMenuItem onClick={() => handleStatusChange('in_progress')}>
                    <Play className="mr-2 h-4 w-4" />
                    Iniciar Clase
                  </DropdownMenuItem>
                )}
                {session.status === 'in_progress' && (
                  <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Completar Clase
                  </DropdownMenuItem>
                )}
                {session.status !== 'completed' && session.status !== 'cancelled' && (
                  <DropdownMenuItem 
                    onClick={() => handleStatusChange('cancelled')}
                    className="text-red-600"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancelar Clase
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDeleteClick?.(session)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [onViewClick, onEditClick, onDeleteClick, onDuplicateClick, onManageEnrollmentsClick, onAttendanceClick, cancelSession, startSession, completeSession]
  );

  // Initialize table
  const table = useReactTable({
    data: sessions,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  // Handle filter changes
  const handleFilterChange = (key: keyof ClassFilters, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined };
    onFiltersChange?.(newFilters);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Cargando clases...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Gestión de Clases
          </CardTitle>
          <Button onClick={onCreateClick} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Clase
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[300px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clases..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="max-w-sm"
            />
          </div>
          
          <Select
            value={filters.status || ''}
            onValueChange={(value) => handleFilterChange('status', value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los estados</SelectItem>
              <SelectItem value="scheduled">Programada</SelectItem>
              <SelectItem value="confirmed">Confirmada</SelectItem>
              <SelectItem value="in_progress">En Progreso</SelectItem>
              <SelectItem value="completed">Completada</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.time_filter || ''}
            onValueChange={(value) => handleFilterChange('time_filter', value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas las fechas</SelectItem>
              <SelectItem value="upcoming">Próximas</SelectItem>
              <SelectItem value="past">Pasadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup: any) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header: any) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row: any) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                    {row.getVisibleCells().map((cell: any) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No hay clases programadas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            Mostrando {table.getPaginationRowModel().rows.length} de {sessions.length} clases
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}