'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  Plus, 
  Search,
  Building2,
  MapPin,
  Users,
  Edit,
  Trash2,
  ArrowLeftRight
} from 'lucide-react';
import { RootService } from '@/lib/api/services/root.service';
import { Club } from '@/types/club';
import { toast } from '@/lib/toast';
import { ClubsTableSkeleton } from '@/components/ui/skeletons/clubs-table-skeleton';

interface ExtendedClub extends Club {
  organization_name?: string;
  organization_state?: string;
  subscription_plan?: string;
  monthly_revenue?: number;
  total_reservations?: number;
  health_metrics?: {
    occupancy_rate: number;
    active_members: number;
    courts_operational: number;
    last_activity: string | null;
  };
}

export default function RootClubsPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [clubs, setClubs] = useState<ExtendedClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [orgStateFilter, setOrgStateFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalClubs, setTotalClubs] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps


  useEffect(() => {
    loadClubs();
  }, [orgStateFilter, activeFilter, currentPage]);

  const loadClubs = async () => {
    try {
      const params: any = {
        page: currentPage,
        page_size: 20
      };
      if (orgStateFilter !== 'all') params.organization_state = orgStateFilter;
      if (activeFilter !== 'all') params.is_active = activeFilter === 'active';
      if (search) params.search = search;
      
      const response = await RootService.getClubs(params);
      
      // Handle paginated response
      if (response.results) {
        setClubs(response.results);
        setTotalPages(Math.ceil((response.count || 0) / 20));
        setTotalClubs(response.count || 0);
      } else {
        // Fallback for non-paginated response
        const clubsData = Array.isArray(response) ? response : [];
        setClubs(clubsData);
        setTotalPages(1);
        setTotalClubs(clubsData.length);
      }
    } catch (error: any) {
            toast.error(error?.response?.data?.detail || 'Error loading clubs');
      setClubs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on search
    loadClubs();
  };

  const handleDelete = async (club: ExtendedClub) => {
    if (!confirm(`¿Estás seguro de eliminar el club "${club.name}"?`)) return;
    
    try {
      await RootService.deleteClub(club.id);
      toast.success('Club eliminado exitosamente');
      loadClubs();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Error al eliminar club');
    }
  };

  const getOrgStateBadge = (state?: string) => {
    if (!state) return null;
    const styles = {
      active: 'bg-green-100 text-green-800',
      trial: 'bg-blue-100 text-blue-800',
      suspended: 'bg-orange-100 text-orange-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={styles[state as keyof typeof styles] || ''}>
        {state}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gestión de Clubes
            </h1>
            <p className="text-gray-600 mt-1">
              Administra todos los clubes del sistema
            </p>
          </div>
          <Button disabled className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Club
          </Button>
        </div>
        
        {/* Loading skeleton */}
        <ClubsTableSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Clubes
          </h1>
          <p className="text-gray-600 mt-1">
            Administra todos los clubes del sistema
          </p>
        </div>
        <Button 
          onClick={() => router.push(`/${locale}/root/clubmngr/new`)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Club
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nombre, email u organización..."
                value={search || ''}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="w-48">
            <label className="block text-sm font-medium mb-1">Estado Org.</label>
            <Select value={orgStateFilter || ''} onValueChange={(value) => {
              setOrgStateFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="trial">En prueba</SelectItem>
                <SelectItem value="suspended">Suspendidas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-32">
            <label className="block text-sm font-medium mb-1">Estado</label>
            <Select value={activeFilter || ''} onValueChange={(value) => {
              setActiveFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit">Buscar</Button>
        </form>
      </Card>

      {/* Clubs Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Club</TableHead>
              <TableHead>Organización</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead className="text-center">Canchas</TableHead>
              <TableHead className="text-center">Miembros</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clubs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No se encontraron clubes
                </TableCell>
              </TableRow>
            ) : (
              clubs.map((club) => (
                <TableRow key={club.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{club.name}</p>
                      <p className="text-sm text-gray-500">{club.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{club.organization_name || 'N/A'}</p>
                      {getOrgStateBadge(club.organization_state)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span className="text-sm">
                        {club.address?.city || 'Sin ubicación'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">
                      {club.total_courts || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">
                      {club.total_members || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge>
                      {club.subscription_plan || 'basic'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={club.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {club.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/${locale}/root/clubmngr/${club.id}`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/${locale}/root/clubmngr/${club.id}/transfer`)}
                        title="Transferir a otra organización"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(club)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-gray-600">
              Mostrando {((currentPage - 1) * 20) + 1} - {Math.min(currentPage * 20, totalClubs)} de {totalClubs} clubes
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              
              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}