'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveClubStore } from '@/store/clubs/activeClubStore';
import { ClubsService } from '@/lib/api/services/clubs.service';
import { DashboardStats } from '@/types/club';
import { Card } from '@/components/ui/professional/Card';
import { Button } from '@/components/ui/professional/Button';
import {
  ProfessionalDashboardLayout,
  ProfessionalStatsGrid,
  ProfessionalQuickActions,
  ProfessionalContentGrid
} from '@/components/ui/professional/ProfessionalDashboardLayout';
import { 
  ProfessionalToast, 
  useProfessionalToast 
} from '@/components/ui/professional/ProfessionalToast';
import { 
  Calendar, 
  Users, 
  Building2, 
  TrendingUp,
  Clock,
  DollarSign,
  AlertCircle,
  Plus,
  Activity,
  Target,
  Zap,
  Award,
  MapPin,
  Phone,
  Mail,
  Globe,
  ChevronRight,
  BarChart3,
  PieChart,
  Sparkles
} from 'lucide-react';


export default function ClubDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const clubSlug = params['club-slug'] as string;
  const { activeClub, setActiveClub } = useActiveClubStore();
  const [loading, setLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const toast = useProfessionalToast();

  useEffect(() => {
            
    // If no active club, try to load it
    if (!activeClub && clubSlug) {
      const loadClub = async () => {
        try {
          setLoading(true);
                    const club = await ClubsService.getBySlug(clubSlug);
                    setActiveClub(club);
        } catch (error) {
                  } finally {
          setLoading(false);
        }
      };
      loadClub();
    }
  }, [activeClub, clubSlug, setActiveClub]);

  // Fetch dashboard stats when we have the club slug
  useEffect(() => {
    if (clubSlug) {
      const loadDashboardStats = async () => {
        try {
          setStatsLoading(true);
          setStatsError(null);
          const stats = await ClubsService.getDashboardStats(clubSlug);
          setDashboardStats(stats);
        } catch (error: any) {
                                                  
          // Handle specific error cases
          if (error.response?.status === 403) {
            setStatsError('No tienes permisos para ver las estadísticas de este club');
          } else if (error.response?.status === 404) {
            setStatsError('Club no encontrado');
          } else {
            setStatsError(`Error al cargar las estadísticas del dashboard: ${error.response?.status || 'desconocido'}`);
          }
        } finally {
          setStatsLoading(false);
        }
      };
      loadDashboardStats();
    }
  }, [clubSlug]);

  // Toast de bienvenida
  useEffect(() => {
    if (activeClub && !sessionStorage.getItem(`club-dashboard-welcome-${activeClub.id}`)) {
      toast.success(
        `Bienvenido a ${activeClub.name}`,
        'Dashboard profesional cargado'
      );
      sessionStorage.setItem(`club-dashboard-welcome-${activeClub.id}`, 'true');
    }
  }, [activeClub, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <motion.div 
            className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#4299E1] flex items-center justify-center shadow-2xl"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Building2 className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Cargando Dashboard
          </h2>
          <p className="text-gray-600">
            Preparando la información del club...
          </p>
        </div>
      </div>
    );
  }

  if (!activeClub) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card variant="glass" padding="lg" className="max-w-md text-center backdrop-blur-xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Club No Encontrado
          </h2>
          <p className="text-gray-600 mb-6">
            No se pudo cargar la información del club. Por favor, intenta de nuevo.
          </p>
          <Button onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </Card>
      </div>
    );
  }

  // Prepare stats for Professional Stats Grid
  const stats = [
    {
      title: 'Reservas Hoy',
      value: statsLoading ? '-' : (dashboardStats?.today_reservations?.toString() || '0'),
      change: statsLoading ? '-' : (dashboardStats?.today_reservations_change 
        ? `${dashboardStats.today_reservations_change > 0 ? '+' : ''}${dashboardStats.today_reservations_change.toFixed(1)}% vs último mes`
        : '+0% vs último mes'),
      changeType: (!statsLoading && (dashboardStats?.today_reservations_change || 0) >= 0) ? 'positive' as const : 'negative' as const,
      icon: <Calendar className="w-6 h-6" />,
      color: 'bg-gradient-to-br from-[#007AFF] to-[#4299E1]',
      loading: statsLoading,
    },
    {
      title: 'Clientes Activos',
      value: statsLoading ? '-' : (dashboardStats?.active_members?.toString() || '0'),
      change: statsLoading ? '-' : (dashboardStats?.active_members_change 
        ? `${dashboardStats.active_members_change > 0 ? '+' : ''}${dashboardStats.active_members_change.toFixed(1)}% vs último mes`
        : '+0% vs último mes'),
      changeType: (!statsLoading && (dashboardStats?.active_members_change || 0) >= 0) ? 'positive' as const : 'negative' as const,
      icon: <Users className="w-6 h-6" />,
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      loading: statsLoading,
    },
    {
      title: 'Canchas Disponibles',
      value: statsLoading ? '-' : (dashboardStats?.total_courts?.toString() || '0'),
      change: '100% disponibles',
      changeType: 'positive' as const,
      icon: <Target className="w-6 h-6" />,
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      loading: statsLoading,
    },
    {
      title: 'Ocupación',
      value: statsLoading ? '-' : `${dashboardStats?.average_occupancy || 0}%`,
      change: statsLoading ? '-' : (dashboardStats?.occupancy_change 
        ? `${dashboardStats.occupancy_change > 0 ? '+' : ''}${dashboardStats.occupancy_change.toFixed(1)}% vs último mes`
        : '+0% vs último mes'),
      changeType: (!statsLoading && (dashboardStats?.occupancy_change || 0) >= 0) ? 'positive' as const : 'negative' as const,
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'bg-gradient-to-br from-amber-500 to-amber-600',
      loading: statsLoading,
    },
  ];

  // Quick actions handlers
  const handleNewReservation = () => {
    toast.info('Nueva Reserva', 'Abriendo formulario de reserva...');
    router.push(`/es/${clubSlug}/reservations?new=true`);
  };

  const handleNewClient = () => {
    toast.info('Registrar Cliente', 'Abriendo formulario de cliente...');
    router.push(`/es/${clubSlug}/clients?new=true`);
  };

  const handleFinanceView = () => {
    toast.info('Finanzas', 'Accediendo al módulo financiero...');
    router.push(`/es/${clubSlug}/finance`);
  };

  // Prepare quick actions for Professional Quick Actions
  const quickActions = [
    {
      title: 'Nueva Reserva',
      description: 'Crear reservación',
      icon: <Calendar className="w-5 h-5" />,
      onClick: handleNewReservation,
      color: 'bg-[#007AFF]',
    },
    {
      title: 'Registrar Cliente',
      description: 'Nuevo miembro',
      icon: <Users className="w-5 h-5" />,
      onClick: handleNewClient,
      color: 'bg-purple-500',
    },
    {
      title: 'Finanzas',
      description: 'Ver pagos',
      icon: <DollarSign className="w-5 h-5" />,
      onClick: handleFinanceView,
      color: 'bg-green-500',
    },
  ];

  // Header actions
  const headerActions = (
    <>
      <Button
        variant="secondary"
        leftIcon={<BarChart3 className="w-4 h-4" />}
        onClick={() => router.push(`/es/${clubSlug}/analytics`)}
      >
        Análisis
      </Button>
      <Button
        variant="secondary"
        leftIcon={<Activity className="w-4 h-4" />}
        onClick={() => router.push(`/es/${clubSlug}/settings`)}
      >
        Configurar
      </Button>
    </>
  );

  return (
    <>
      <ProfessionalDashboardLayout
        title={`Dashboard de ${activeClub?.name}`}
        subtitle={`${activeClub?.location?.city ? `${activeClub.location.city} • ` : ''}${activeClub?.phone || 'Panel de control principal'}`}
        headerActions={headerActions}
      >

        {/* Error Alert Professional */}
        {statsError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card variant="glass" padding="default" className="border-red-200/50 bg-red-50/80 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-red-900">Error en las Estadísticas</h4>
                  <p className="text-sm text-red-800">{statsError}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Stats Professional */}
        <ProfessionalStatsGrid stats={stats} columns={4} />

        {/* Quick Actions Professional */}
        <ProfessionalQuickActions actions={quickActions} />

        {/* Recent Activity Professional */}
        <ProfessionalContentGrid columns={2}>
          {/* Próximas Reservas */}
          <Card variant="glass" padding="lg" className="backdrop-blur-xl border-white/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-br from-[#007AFF] to-[#4299E1]">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Próximas Reservas</h2>
            </div>
            
            {statsError && (
              <div className="flex items-center gap-2 p-3 bg-red-50/80 rounded-lg text-red-600 mb-4 backdrop-blur-sm">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Error al cargar las reservas</span>
              </div>
            )}
            
            {statsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white/40 backdrop-blur-sm rounded-lg animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 bg-gray-300 rounded"></div>
                      <div>
                        <div className="h-4 w-20 bg-gray-300 rounded mb-1"></div>
                        <div className="h-3 w-32 bg-gray-300 rounded"></div>
                      </div>
                    </div>
                    <div className="h-3 w-16 bg-gray-300 rounded"></div>
                  </div>
                ))}
              </div>
            ) : dashboardStats?.upcoming_reservations && dashboardStats.upcoming_reservations.length > 0 ? (
              <div className="space-y-3">
                {dashboardStats.upcoming_reservations.slice(0, 3).map((reservation) => {
                  const reservationDate = new Date(reservation.date);
                  const formattedDate = reservationDate.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit'
                  });
                  
                  return (
                    <div key={reservation.id} className="group flex items-center justify-between p-4 bg-white/40 backdrop-blur-sm rounded-lg hover:bg-white/60 transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#007AFF]/10 group-hover:bg-[#007AFF]/20 transition-colors">
                          <Target className="h-4 w-4 text-[#007AFF]" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{reservation.court || 'Cancha'}</p>
                          <p className="text-sm text-gray-600">
                            {reservation.player_name} - {formattedDate}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-[#007AFF]">
                          {reservation.start_time}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Clock className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Sin reservas próximas</h3>
                <p className="text-sm text-gray-600">No hay reservas programadas para hoy</p>
              </div>
            )}
          </Card>

          {/* Actividad Reciente */}
          <Card variant="glass" padding="lg" className="backdrop-blur-xl border-white/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Actividad Reciente</h2>
            </div>
            
            {statsError && (
              <div className="flex items-center gap-2 p-3 bg-red-50/80 rounded-lg text-red-600 mb-4 backdrop-blur-sm">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Error al cargar la actividad</span>
              </div>
            )}
            
            {statsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <div className="flex-1 space-y-1">
                      <div className="h-3 w-48 bg-gray-300 rounded"></div>
                      <div className="h-2 w-24 bg-gray-300 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : dashboardStats?.recent_activity && dashboardStats.recent_activity.length > 0 ? (
              <div className="space-y-3">
                {dashboardStats.recent_activity.slice(0, 4).map((activity, index) => {
                  const getActivityColor = (type: string) => {
                    switch (type) {
                      case 'reservation':
                      case 'reservation_created':
                      case 'reservation_completed':
                        return 'bg-green-500';
                      case 'client_registration':
                      case 'client_registered':
                        return 'bg-[#007AFF]';
                      case 'payment':
                      case 'payment_received':
                        return 'bg-purple-500';
                      case 'reservation_cancelled':
                        return 'bg-red-500';
                      default:
                        return 'bg-gray-500';
                    }
                  };

                  const activityDate = new Date(activity.timestamp);
                  const formattedTime = activityDate.toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div key={`${activity.type}-${index}`} className="flex items-center gap-4 p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                      <div className={`w-3 h-3 ${getActivityColor(activity.type)} rounded-full shadow-lg`}></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {formattedTime}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Activity className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Sin actividad reciente</h3>
                <p className="text-sm text-gray-600">La actividad del club aparecerá aquí</p>
              </div>
            )}
          </Card>
        </ProfessionalContentGrid>
      </ProfessionalDashboardLayout>

      {/* Toast Notifications */}
      <ProfessionalToast 
        notifications={toast.toasts} 
        onDismiss={toast.dismissToast} 
      />
    </>
  );
}