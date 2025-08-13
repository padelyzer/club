'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/auth';
import { useActiveClubStore } from '@/store/clubs/activeClubStore';
import { useClubs } from '@/lib/api/hooks/useClubs';
import { Button } from '@/components/ui/professional/Button';
import { Card } from '@/components/ui/professional/Card';
import { 
  Building2, 
  Users, 
  MapPin, 
  ArrowRight,
  Star,
  Clock,
  TrendingUp,
  Target,
  Crown,
  Settings,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';

// Toast system integrado
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
              notification.type === 'warning' ? 'bg-amber-500' : 'bg-[#007AFF]'
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

export default function MyClubPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const { user } = useAuthStore();
  const { activeClub, setActiveClub } = useActiveClubStore();
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

  // Obtener clubes del usuario
  const { clubs, isLoading } = useClubs();

  // Gestión de toasts
  const addToast = (toast: Omit<ToastNotification, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Auto-dismiss toasts
  useEffect(() => {
    toasts.forEach(toast => {
      if (toast.duration) {
        const timer = setTimeout(() => {
          dismissToast(toast.id);
        }, toast.duration);
        return () => clearTimeout(timer);
      }
    });
  }, [toasts]);

  // Procesar clubes del usuario
  const userClubs = useMemo(() => {
    if (!clubs?.results || !user) return [];

    return clubs.results.filter(club => {
      return user.is_superuser || 
        user.club_memberships?.some(m => m.club?.id === club.id) ||
        club.email === user.email;
    });
  }, [clubs?.results, user]);

  // Estado de carga
  if (isLoading) {
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
            Cargando Mi Club
          </h2>
          <p className="text-gray-600">
            Accediendo a tu información de clubes...
          </p>
        </div>
      </div>
    );
  }

  // Toast de bienvenida solo una vez
  useEffect(() => {
    if (userClubs.length > 0 && !sessionStorage.getItem('my-club-welcome')) {
      addToast({
        title: 'Mi Club Profesional',
        message: `Tienes acceso a ${userClubs.length} club${userClubs.length > 1 ? 's' : ''}`,
        type: 'success',
        duration: 4000
      });
      sessionStorage.setItem('my-club-welcome', 'true');
    }
  }, [userClubs.length]);

  // Handlers
  const handleClubSelect = (club: any) => {
    setSelectedClubId(club.id);
    setActiveClub(club);
    
    addToast({
      title: 'Club Seleccionado',
      message: `${club.name} establecido como activo`,
      type: 'success',
      duration: 3000
    });

    setTimeout(() => {
      router.push(`/${locale}/${club.slug}`);
    }, 1500);
  };

  const handleManageClubs = () => {
    router.push(`/${locale}/clubs`);
  };

  // Si no hay clubes
  if (userClubs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card variant="glass" padding="lg" className="max-w-md text-center backdrop-blur-xl">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <Building2 className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            Sin Clubes Asignados
          </h2>
          <p className="text-gray-600 mb-6">
            No tienes acceso a ningún club en este momento. Contacta a tu administrador 
            para que te asigne a un club.
          </p>
          <Button 
            onClick={() => router.push(`/${locale}/dashboard`)}
            leftIcon={<ArrowRight className="w-4 h-4" />}
          >
            Volver al Dashboard
          </Button>
        </Card>
        <ToastContainer notifications={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // Si solo hay un club, redirigir automáticamente
  if (userClubs.length === 1 && !selectedClubId) {
    const club = userClubs[0];
    setTimeout(() => {
      handleClubSelect(club);
    }, 1000);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <motion.div 
            className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#4299E1] flex items-center justify-center shadow-2xl"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Building2 className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Accediendo a {club.name}
          </h2>
          <p className="text-gray-600">
            Redirigiendo a tu club...
          </p>
        </div>
        <ToastContainer notifications={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // Interface principal - múltiples clubes
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
                Mi Club
              </h1>
              <p className="text-gray-600">
                Selecciona el club al que quieres acceder o gestiona todos tus clubes
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {user?.is_superuser && (
                <Button
                  variant="secondary"
                  leftIcon={<Settings className="w-4 h-4" />}
                  onClick={handleManageClubs}
                >
                  Gestionar Clubes
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Club Activo */}
        {activeClub && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card variant="glass" padding="lg" className="border-[#007AFF]/20 bg-blue-50/80 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#4299E1] shadow-lg">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900">Club Activo</h3>
                  <p className="text-sm text-blue-800">
                    Actualmente trabajando en <strong>{activeClub.name}</strong>
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<ExternalLink className="w-4 h-4" />}
                  onClick={() => router.push(`/${locale}/${activeClub.slug}`)}
                >
                  Acceder
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Lista de Clubes */}
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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {userClubs.map((club, index) => (
            <motion.div
              key={club.id}
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
              className={`${selectedClubId === club.id ? 'ring-2 ring-[#007AFF]' : ''}`}
            >
              <Card 
                variant="glass" 
                padding="lg"
                className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-black/10 border-white/20 backdrop-blur-xl"
                onClick={() => handleClubSelect(club)}
              >
                {/* Header del Club */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#4299E1] shadow-lg group-hover:scale-110 transition-transform">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 mb-1">
                        {club.name}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        {club.location?.city || 'Sin ubicación'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#007AFF] transition-colors" />
                </div>

                {/* Stats Rápidas */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-sm text-purple-600 mb-1">
                      <Users className="w-3 h-3" />
                    </div>
                    <p className="font-semibold text-gray-900">{club.total_members || 0}</p>
                    <p className="text-xs text-gray-600">Miembros</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-sm text-green-600 mb-1">
                      <Target className="w-3 h-3" />
                    </div>
                    <p className="font-semibold text-gray-900">{club.courts?.length || 0}</p>
                    <p className="text-xs text-gray-600">Canchas</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-sm text-amber-600 mb-1">
                      <TrendingUp className="w-3 h-3" />
                    </div>
                    <p className="font-semibold text-gray-900">{club.average_occupancy || 0}%</p>
                    <p className="text-xs text-gray-600">Ocupación</p>
                  </div>
                </div>

                {/* Estado del Club */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      club.is_active ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <span className="text-sm text-gray-600">
                      {club.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  
                  {activeClub?.id === club.id && (
                    <div className="flex items-center gap-1 text-[#007AFF]">
                      <Sparkles className="w-3 h-3" />
                      <span className="text-xs font-medium">Activo</span>
                    </div>
                  )}
                </div>

                {/* Overlay de hover */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-gradient-to-br from-[#007AFF]/5 to-purple-500/5 transition-opacity duration-300 pointer-events-none" />
                
                {/* Loading overlay cuando está seleccionado */}
                {selectedClubId === club.id && (
                  <div className="absolute inset-0 rounded-xl bg-[#007AFF]/10 backdrop-blur-sm flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007AFF]"></div>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Mensaje de ayuda */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-gray-500">
            Haz clic en cualquier club para acceder a su dashboard y gestionar sus operaciones
          </p>
        </motion.div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer 
        notifications={toasts} 
        onDismiss={dismissToast} 
      />
    </>
  );
}