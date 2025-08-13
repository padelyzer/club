'use client';

import React, { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useClubs, useDeleteClub } from '@/lib/api/hooks/useClubs';
import { Button } from '@/components/ui/professional/Button';
import { Card } from '@/components/ui/professional/Card';
import { useAuthStore } from '@/store/auth';
import { useClubsDataStore, useActiveClubStore } from '@/store/clubs';
import { 
  Plus, 
  Building2, 
  AlertCircle,
  Shield,
  Info,
  TrendingUp,
  Users,
  Target,
  RefreshCw,
  Download,
  CheckCircle
} from 'lucide-react';
import type { ClubFilters as ClubFiltersType, ClubViewMode } from '@/types/club';
import { ProfessionalClubsList } from '@/components/clubs/professional/ProfessionalClubsList';

// Sistema de notificaciones toast profesional  
interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
}

const ToastContainer = ({ notifications, onDismiss }: {
  notifications: ToastNotification[];
  onDismiss: (id: string) => void;
}) => (
  <div className="fixed top-4 right-4 z-50 space-y-2">
    <AnimatePresence>
      {notifications.map((notification) => (
        <motion.div
          key={notification.id}
          initial={{ opacity: 0, x: 300, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 300, scale: 0.8 }}
          className={`
            p-4 rounded-xl shadow-xl backdrop-blur-xl border border-white/20 max-w-sm cursor-pointer
            ${notification.type === 'success' ? 'bg-green-50/90 text-green-900 border-green-200/50' :
              notification.type === 'error' ? 'bg-red-50/90 text-red-900 border-red-200/50' :
              notification.type === 'warning' ? 'bg-amber-50/90 text-amber-900 border-amber-200/50' :
              'bg-blue-50/90 text-blue-900 border-blue-200/50'}
          `}
          onClick={() => onDismiss(notification.id)}
        >
          <div className="flex items-center gap-3">
            <div className={`p-1 rounded-lg ${
              notification.type === 'success' ? 'bg-green-500' :
              notification.type === 'error' ? 'bg-red-500' :
              notification.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
            }`}>
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{notification.title}</h4>
              <p className="text-xs opacity-90">{notification.message}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

// Lazy loading del formulario profesional
const ProfessionalClubForm = lazy(() => import('@/components/clubs/professional/ProfessionalClubForm').then(module => ({ 
  default: module.ProfessionalClubForm 
})));

const ClubsPage = React.memo(() => {
  const router = useRouter();
  const { user } = useAuthStore();
  const { filters, currentPage, pageSize, searchQuery, setCurrentPage, setPageSize, setSearchQuery: setStoreSearchQuery } = useClubsDataStore(
    (state) => ({
      filters: state.filters,
      currentPage: state.currentPage,
      pageSize: state.pageSize,
      searchQuery: state.searchQuery,
      setCurrentPage: state.setCurrentPage,
      setPageSize: state.setPageSize,
      setSearchQuery: state.setSearchQuery,
    })
  );
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<ClubViewMode>('grid');
  // Use search query from store instead of local state to prevent sync issues
  const [sortBy, setSortBy] = useState<'name' | 'members' | 'occupancy' | 'created'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Hooks para datos
  const { clubs, isLoading, error, refresh } = useClubs(filters);
  const deleteClubMutation = useDeleteClub();

  const dismissToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Auto-dismiss toasts
  useEffect(() => {
    const timers = new Map<string, NodeJS.Timeout>();
    
    toasts.forEach(toast => {
      if (toast.duration && !timers.has(toast.id)) {
        const timer = setTimeout(() => {
          dismissToast(toast.id);
        }, toast.duration);
        timers.set(toast.id, timer);
      }
    });
    
    // Cleanup all timers
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [toasts, dismissToast]);

  const addToast = (toast: Omit<ToastNotification, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  // Store is now updated automatically by useClubs hook

  // Toast de bienvenida
  // eslint-disable-next-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sessionStorage.getItem('clubs-professional-welcome') && clubs?.results) {
      addToast({
        title: '🏢 Sistema de Clubes Profesional',
        message: 'Nueva interfaz con glassmorphism activada',
        type: 'success',
        duration: 4000
      });
      sessionStorage.setItem('clubs-professional-welcome', 'true');
    }
  }, [clubs]);

  // Verificar permisos del usuario
  const canManageClubs = // eslint-disable-next-line react-hooks/exhaustive-deps
 useMemo(() => {
    return user?.is_staff || user?.is_superuser || 
      user?.club_memberships?.some(m => ['admin', 'manager'].includes(m.role || ''));
  }, [user?.is_staff, user?.is_superuser, user?.club_memberships]);

  // Verificar límites del plan
  const organizationLimits = // eslint-disable-next-line react-hooks/exhaustive-deps
 useMemo(() => ({
    maxClubs: 5,
    currentClubs: clubs?.count || 0
  }), [clubs?.count]);

  const canCreateClub = // eslint-disable-next-line react-hooks/exhaustive-deps
 useMemo(() => {
    return canManageClubs && organizationLimits.currentClubs < organizationLimits.maxClubs;
  }, [canManageClubs, organizationLimits.currentClubs]);

  // Estadísticas rápidas
  const quickStats = // eslint-disable-next-line react-hooks/exhaustive-deps
 useMemo(() => {
    if (!clubs?.results) return null;
    
    const totalMembers = clubs.results.reduce((sum, club) => sum + (club.total_members || 0), 0);
    const totalCourts = clubs.results.reduce((sum, club) => sum + (club.courts?.length || 0), 0);
    const avgOccupancy = clubs.results.reduce((sum, club) => sum + (club.average_occupancy || 0), 0) / clubs.results.length;
    
    return {
      totalClubs: clubs.results.length,
      totalMembers,
      totalCourts,
      avgOccupancy: Math.round(avgOccupancy)
    };
  }, [clubs?.results]);

  // Handlers
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
    addToast({
      title: 'Datos Actualizados',
      message: 'Lista de clubes refrescada',
      type: 'success',
      duration: 2500
    });
  };

  const handleExport = () => {
    addToast({
      title: 'Exportando Clubes',
      message: 'Generando archivo Excel...',
      type: 'info',
      duration: 3000
    });
  };

  const handleCreateClub = () => {
    if (!canCreateClub) {
      addToast({
        title: 'Límite Alcanzado',
        message: 'Has alcanzado el límite de clubes de tu plan',
        type: 'warning',
        duration: 4000
      });
      return;
    }
    setShowCreateModal(true);
  };

  const handleClubView = (club: any) => {
    router.push(`/es/clubs/${club.id}`);
  };

  const handleClubEdit = (club: any) => {
    router.push(`/es/clubs/${club.id}/edit`);
  };

  const handleClubSetActive = (club: any) => {
    useActiveClubStore.getState().setActiveClub(club);
    addToast({
      title: 'Club Activo',
      message: `${club.name} establecido como activo`,
      type: 'success',
      duration: 3000
    });
  };

  // Estados de carga y error
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <motion.div 
            className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#4299E1] flex items-center justify-center shadow-2xl"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Building2 className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Cargando Clubes
          </h2>
          <p className="text-gray-600">
            Sincronizando datos del sistema...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Card variant="glass" padding="lg" className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error al Cargar Clubes
          </h2>
          <p className="text-gray-600 mb-6">
            No pudimos cargar la lista de clubes. Por favor, intenta de nuevo.
          </p>
          <Button onClick={refresh} leftIcon={<RefreshCw className="w-4 h-4" />}>
            Reintentar
          </Button>
        </Card>
      </div>
    );
  }

  // Verificar acceso sin organización
  if (!user?.organization_memberships?.length && !user?.is_superuser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Card variant="glass" padding="lg" className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-amber-500 flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            Sin Acceso a Clubes
          </h2>
          <p className="text-gray-600 mb-6">
            No tienes acceso a ningún club. Contacta a tu administrador para que te asigne a una organización.
          </p>
          <Button onClick={() => router.push('/es/dashboard')}>
            Volver al Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const hasClubs = clubs?.results && clubs.results.length > 0;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                Gestión de Clubes
              </h1>
              <p className="text-gray-600">
                Administra los clubes de tu organización con estilo profesional
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                Actualizar
              </Button>
              <Button
                variant="secondary"
                leftIcon={<Download className="w-4 h-4" />}
                onClick={handleExport}
              >
                Exportar
              </Button>
              {canManageClubs && (
                <Button
                  variant="primary"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={handleCreateClub}
                  disabled={!canCreateClub}
                >
                  Nuevo Club
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        {quickStats && hasClubs && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1, delayChildren: 0.2 }
              }
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            {[
              {
                title: 'Total Clubes',
                value: quickStats.totalClubs.toString(),
                icon: Building2,
                color: 'from-[#007AFF] to-[#4299E1]'
              },
              {
                title: 'Total Miembros',
                value: quickStats.totalMembers.toLocaleString(),
                icon: Users,
                color: 'from-purple-500 to-purple-600'
              },
              {
                title: 'Total Canchas',
                value: quickStats.totalCourts.toString(),
                icon: Target,
                color: 'from-green-500 to-green-600'
              },
              {
                title: 'Ocupación Media',
                value: `${quickStats.avgOccupancy}%`,
                icon: TrendingUp,
                color: 'from-amber-500 to-amber-600'
              }
            ].map((stat, index) => (
              <motion.div
                key={stat.title}
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.95 },
                  visible: { 
                    opacity: 1, 
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.5 }
                  }
                }}
                whileHover={{ scale: 1.02 }}
              >
                <Card 
                  variant="glass" 
                  padding="lg"
                  className="group transition-all duration-300 hover:shadow-xl hover:shadow-black/10 border-white/20 backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg group-hover:scale-110 transition-transform`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                      {stat.value}
                    </h3>
                    <p className="text-sm font-medium text-gray-700">
                      {stat.title}
                    </p>
                  </div>

                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-gradient-to-br from-[#007AFF]/5 to-purple-500/5 transition-opacity duration-300 pointer-events-none" />
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Alertas profesionales */}
        {canManageClubs && !canCreateClub && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card variant="glass" padding="default" className="border-amber-200/50 bg-amber-50/80 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-amber-900">Límite Alcanzado</h4>
                  <p className="text-sm text-amber-800">
                    Has alcanzado el límite de {organizationLimits.maxClubs} clubes de tu plan. 
                    Para agregar más clubes, actualiza tu suscripción.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {!canManageClubs && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card variant="glass" padding="default" className="border-blue-200/50 bg-blue-50/80 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500">
                  <Info className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900">Solo Lectura</h4>
                  <p className="text-sm text-blue-800">
                    Tienes acceso de solo lectura a los clubes. Contacta a tu administrador 
                    si necesitas permisos para gestionar clubes.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Lista de Clubes Profesional */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {hasClubs ? (
            <ProfessionalClubsList
              clubs={clubs.results}
              loading={isLoading}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onCreateClub={canCreateClub ? handleCreateClub : undefined}
              onClubView={handleClubView}
              onClubEdit={handleClubEdit}
              onClubSetActive={handleClubSetActive}
              searchQuery={searchQuery}
              onSearchChange={(query) => {
                setStoreSearchQuery(query);
              }}
              sortBy={sortBy}
              onSortChange={setSortBy}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
              totalCount={clubs.count || 0}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          ) : (
            <Card variant="glass" padding="lg" className="text-center backdrop-blur-xl">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <Building2 className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                No hay clubes registrados
              </h3>
              <p className="text-gray-600 mb-6">
                {canManageClubs 
                  ? "Comienza creando tu primer club para gestionar canchas y reservaciones."
                  : "No hay clubes disponibles en este momento."
                }
              </p>
              {canManageClubs && canCreateClub && (
                <Button 
                  onClick={handleCreateClub}
                  leftIcon={<Plus className="w-4 h-4" />}
                  variant="primary"
                >
                  Crear Primer Club
                </Button>
              )}
            </Card>
          )}
        </motion.div>

        {/* Modal de creación profesional */}
        {showCreateModal && (
          <Suspense fallback={
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <Card variant="glass" padding="lg" className="animate-pulse">
                <div className="w-80 h-64 bg-gray-200 rounded"></div>
              </Card>
            </div>
          }>
            <ProfessionalClubForm
              isOpen={showCreateModal}
              onClose={() => setShowCreateModal(false)}
              onSuccess={() => {
                setShowCreateModal(false);
                refresh();
                addToast({
                  title: 'Club Creado',
                  message: 'El nuevo club ha sido creado exitosamente',
                  type: 'success',
                  duration: 4000
                });
              }}
            />
          </Suspense>
        )}
      </div>

      {/* Toast Notifications */}
      <ToastContainer 
        notifications={toasts} 
        onDismiss={dismissToast} 
      />
    </>
  );
});

ClubsPage.displayName = 'ClubsPage';

export default ClubsPage;