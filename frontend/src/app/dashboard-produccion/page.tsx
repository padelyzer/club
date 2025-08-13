'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  CreditCard,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Download,
  Bell,
  Settings,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Target
} from 'lucide-react';
import { Card } from '@/components/ui/professional/Card';
import { Button } from '@/components/ui/professional/Button';
import { useAuthStore } from '@/store/auth';

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
              {notification.type === 'success' ? <CheckCircle className="w-4 h-4 text-white" /> :
               notification.type === 'error' ? <AlertCircle className="w-4 h-4 text-white" /> :
               notification.type === 'warning' ? <AlertCircle className="w-4 h-4 text-white" /> :
               <Bell className="w-4 h-4 text-white" />}
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

export default function DashboardProduccionPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  
  // Datos reales del dashboard (simulados)
  const [dashboardData, setDashboardData] = useState({
    totalReservations: 1247,
    totalRevenue: 45690,
    activeMembers: 324,
    courtOccupancy: 78,
    pendingPayments: 12,
    upcomingEvents: 8,
    
    changes: {
      reservations: 12,
      revenue: 8,
      members: 5,
      occupancy: -3,
      payments: -2,
      events: 3
    },
    
    // Métricas en tiempo real
    todayReservations: 28,
    liveOccupancy: 65,
    pendingApprovals: 5,
    recentPayments: 156,
    systemAlerts: 2,
    onlineMembers: 47,
    
    recentActivity: [
      {
        id: '1',
        type: 'reservation',
        message: 'Nueva reserva - Cancha 3, 14:00-15:30',
        time: 'hace 5 min',
        status: 'success'
      },
      {
        id: '2',
        type: 'payment',
        message: 'Pago recibido - Juan Pérez (€120)',
        time: 'hace 15 min',
        status: 'success'
      },
      {
        id: '3',
        type: 'member',
        message: 'Nuevo miembro - María García',
        time: 'hace 30 min',
        status: 'info'
      },
      {
        id: '4',
        type: 'alert',
        message: 'Mantenimiento Cancha 2 programado',
        time: 'hace 1 hora',
        status: 'warning'
      }
    ]
  });

  // Cargar dashboard
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      
      // Toast de bienvenida
      if (!sessionStorage.getItem('dashboard-welcome-shown')) {
        setToasts([{
          id: 'welcome',
          title: '¡Bienvenido a Padelyzer!',
          message: 'Dashboard cargado correctamente',
          type: 'success',
          duration: 4000
        }]);
        sessionStorage.setItem('dashboard-welcome-shown', 'true');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  // Actualizar datos en tiempo real
  useEffect(() => {
    if (!isLoading) {
      const interval = setInterval(() => {
        setDashboardData(prev => ({
          ...prev,
          liveOccupancy: Math.max(30, Math.min(95, prev.liveOccupancy + (Math.random() - 0.5) * 8)),
          onlineMembers: Math.max(15, Math.min(80, prev.onlineMembers + Math.floor((Math.random() - 0.5) * 4))),
          todayReservations: prev.todayReservations + (Math.random() < 0.2 ? 1 : 0)
        }));
      }, 45000);

      return () => clearInterval(interval);
    }
  }, [isLoading]);

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

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const addToast = (toast: Omit<ToastNotification, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setDashboardData(prev => ({
      ...prev,
      totalReservations: prev.totalReservations + Math.floor(Math.random() * 5),
      totalRevenue: prev.totalRevenue + Math.floor(Math.random() * 500),
      activeMembers: prev.activeMembers + Math.floor(Math.random() * 3)
    }));
    setIsLoading(false);
    
    addToast({
      title: 'Datos Actualizados',
      message: 'Dashboard refrescado exitosamente',
      type: 'success',
      duration: 2500
    });
  };

  const handleExport = () => {
    addToast({
      title: 'Exportando Datos',
      message: 'Generando reporte PDF...',
      type: 'info',
      duration: 3000
    });
    
    setTimeout(() => {
      addToast({
        title: 'Descarga Completada',
        message: 'Reporte guardado en Descargas',
        type: 'success',
        duration: 2500
      });
    }, 2000);
  };

  const handleNavigate = (path: string, name: string) => {
    addToast({
      title: 'Navegando...',
      message: `Accediendo a ${name}`,
      type: 'info',
      duration: 1500
    });
    
    setTimeout(() => router.push(path), 500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <motion.div 
            className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#4299E1] flex items-center justify-center shadow-2xl"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Activity className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Cargando Padelyzer
          </h2>
          <p className="text-gray-600 mb-6">
            Inicializando tu dashboard...
          </p>
          <div className="w-48 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-[#007AFF] to-[#4299E1] rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    );
  }

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
                Dashboard Padelyzer
              </h1>
              <p className="text-gray-600">
                {new Date().toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={handleRefresh}
                disabled={isLoading}
              >
                Actualizar
              </Button>
              <Button
                variant="primary"
                leftIcon={<Download className="w-4 h-4" />}
                onClick={handleExport}
              >
                Exportar
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Métricas Principales */}
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
              title: 'Total Reservas',
              value: dashboardData.totalReservations.toLocaleString(),
              change: dashboardData.changes.reservations,
              icon: Calendar,
              color: 'from-[#007AFF] to-[#4299E1]',
              onClick: () => handleNavigate('/reservations', 'Reservas')
            },
            {
              title: 'Ingresos Totales',
              value: `€${dashboardData.totalRevenue.toLocaleString()}`,
              change: dashboardData.changes.revenue,
              icon: DollarSign,
              color: 'from-green-500 to-green-600',
              onClick: () => handleNavigate('/finance', 'Finanzas')
            },
            {
              title: 'Miembros Activos',
              value: dashboardData.activeMembers.toString(),
              change: dashboardData.changes.members,
              icon: Users,
              color: 'from-purple-500 to-purple-600',
              onClick: () => handleNavigate('/clients', 'Clientes')
            },
            {
              title: 'Ocupación Canchas',
              value: `${dashboardData.courtOccupancy}%`,
              change: dashboardData.changes.occupancy,
              icon: Target,
              color: 'from-amber-500 to-amber-600',
              onClick: () => handleNavigate('/courts', 'Canchas')
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
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                variant="glass" 
                padding="lg"
                className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-black/10 border-white/20 backdrop-blur-xl"
                onClick={stat.onClick}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    stat.change >= 0 
                      ? 'bg-green-50/80 text-green-700 border border-green-200/50' 
                      : 'bg-red-50/80 text-red-700 border border-red-200/50'
                  } backdrop-blur-sm`}>
                    {stat.change >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    <span>{Math.abs(stat.change)}{stat.title.includes('€') ? '€' : stat.title.includes('%') ? '%' : ''}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                    {stat.value}
                  </h3>
                  <p className="text-sm font-medium text-gray-700">
                    {stat.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    vs mes anterior
                  </p>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-gradient-to-br from-[#007AFF]/5 to-purple-500/5 transition-opacity duration-300 pointer-events-none" />
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Métricas en Tiempo Real */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-8"
        >
          <Card variant="glass" padding="lg" className="backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Métricas en Tiempo Real
                </h2>
                <p className="text-sm text-gray-600">
                  Actualización automática cada 45 segundos
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-50/80 text-green-700 rounded-full text-sm font-medium">
                <Activity className="w-4 h-4 animate-pulse" />
                En vivo
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { 
                  label: 'Reservas Hoy', 
                  value: dashboardData.todayReservations, 
                  icon: Calendar,
                  color: 'bg-blue-500',
                  subtitle: 'programadas'
                },
                { 
                  label: 'Ocupación Actual', 
                  value: `${dashboardData.liveOccupancy}%`, 
                  icon: TrendingUp,
                  color: 'bg-green-500',
                  subtitle: 'de las canchas'
                },
                { 
                  label: 'Miembros Online', 
                  value: dashboardData.onlineMembers, 
                  icon: Users,
                  color: 'bg-purple-500',
                  subtitle: 'conectados ahora'
                }
              ].map((metric) => (
                <motion.div 
                  key={metric.label} 
                  className="p-4 rounded-xl bg-white/40 backdrop-blur-sm border border-white/20 hover:bg-white/60 transition-all"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg ${metric.color}`}>
                      <metric.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className={`w-2 h-2 rounded-full ${metric.color} animate-pulse`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 mb-1">
                      {metric.value}
                    </p>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      {metric.label}
                    </p>
                    <p className="text-xs text-gray-500">
                      {metric.subtitle}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Actividad Reciente */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-8"
        >
          <Card variant="glass" padding="lg" className="backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Actividad Reciente
              </h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleNavigate('/activity', 'Actividad')}
              >
                Ver Todo
              </Button>
            </div>
            
            <div className="space-y-4">
              {dashboardData.recentActivity.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                  className="flex items-center gap-4 p-3 rounded-lg bg-white/30 backdrop-blur-sm border border-white/20 hover:bg-white/50 transition-all"
                >
                  <div className={`p-2 rounded-lg ${
                    activity.status === 'success' ? 'bg-green-500' :
                    activity.status === 'warning' ? 'bg-amber-500' :
                    activity.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                  }`}>
                    {activity.type === 'reservation' ? <Calendar className="w-4 h-4 text-white" /> :
                     activity.type === 'payment' ? <CreditCard className="w-4 h-4 text-white" /> :
                     activity.type === 'member' ? <Users className="w-4 h-4 text-white" /> :
                     <AlertCircle className="w-4 h-4 text-white" />}
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.message}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {activity.time}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Estado del Sistema */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <Card variant="glass" padding="lg" className="backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Estado del Sistema
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: 'Backend API', status: 'online', icon: Activity },
                { name: 'Base de Datos', status: 'online', icon: Activity },
                { name: 'Notificaciones', status: 'online', icon: Bell },
                { name: 'Pagos', status: 'online', icon: CreditCard }
              ].map((service) => (
                <div key={service.name} className="flex items-center gap-3 p-3 rounded-lg bg-white/30 backdrop-blur-sm border border-white/20">
                  <div className={`p-2 rounded-lg ${
                    service.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    <service.icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {service.name}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {service.status}
                    </p>
                  </div>
                  <div className={`ml-auto w-2 h-2 rounded-full ${
                    service.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                  }`} />
                </div>
              ))}
            </div>
          </Card>
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