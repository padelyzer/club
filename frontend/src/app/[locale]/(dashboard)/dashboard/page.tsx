'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { 
  Calendar,
  Users,
  CreditCard,
  TrendingUp,
  Clock,
  Activity,
  Plus,
  Download,
  Bell,
  Settings,
  BarChart3
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboard';
import { useAuthStore } from '@/store/auth';
import { ProfessionalDashboardOverview } from '@/components/dashboard/professional/ProfessionalDashboardOverview';
import { ProfessionalToast, ToastNotification } from '@/components/notifications/professional/ProfessionalToast';
import { LoadingState, ErrorState } from '@/components/ui/states';

// Mock data - replace with real API calls
const getMockDashboardData = () => ({
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
  
  todayReservations: 28,
  liveOccupancy: 65,
  pendingApprovals: 5,
  recentPayments: 156,
  systemAlerts: 2,
  onlineMembers: 47,
  
  recentActivity: [
    {
      id: '1',
      type: 'reservation' as const,
      message: 'New reservation created for Court 3',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      status: 'success' as const
    },
    {
      id: '2',
      type: 'payment' as const,
      message: 'Payment received from John Doe - $120',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      status: 'success' as const
    },
    {
      id: '3',
      type: 'member' as const,
      message: 'New member registration: Maria Garcia',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      status: 'info' as const
    },
    {
      id: '4',
      type: 'alert' as const,
      message: 'Court 2 maintenance scheduled for tomorrow',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      status: 'warning' as const
    }
  ]
});

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { refreshInterval } = useDashboardStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(getMockDashboardData());
  const [toastNotifications, setToastNotifications] = useState<ToastNotification[]>([]);

  // Initialize user from localStorage if not in store
  useEffect(() => {
    if (!user) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          useAuthStore.getState().updateUser(parsedUser);
        } catch (e) {
                  }
      }
    }
  }, [user]);

  // Simulate loading and data fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      
      // Show welcome toast
      setToastNotifications([{
        id: 'welcome',
        title: t('dashboard.welcome', { name: user?.name?.split(' ')[0] || 'Admin' }),
        message: t('dashboard.welcomeMessage'),
        type: 'success',
        duration: 4000
      }]);
    }, 1500);

    return () => clearTimeout(timer);
  }, [user, t]);

  // Mock real-time updates
  useEffect(() => {
    if (!isLoading) {
      const interval = setInterval(() => {
        setDashboardData(prev => ({
          ...prev,
          liveOccupancy: Math.max(30, Math.min(95, prev.liveOccupancy + (Math.random() - 0.5) * 10)),
          onlineMembers: Math.max(20, Math.min(80, prev.onlineMembers + Math.floor((Math.random() - 0.5) * 6))),
          todayReservations: prev.todayReservations + (Math.random() < 0.3 ? 1 : 0)
        }));
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [isLoading]);

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setDashboardData(getMockDashboardData());
    setIsLoading(false);
    
    // Show refresh toast
    setToastNotifications(prev => [...prev, {
      id: `refresh-${Date.now()}`,
      title: t('dashboard.refreshed'),
      message: t('dashboard.dataUpdated'),
      type: 'info',
      duration: 2000
    }]);
  };

  const handleExport = () => {
    // Show export toast
    setToastNotifications(prev => [...prev, {
      id: `export-${Date.now()}`,
      title: t('dashboard.exportStarted'),
      message: t('dashboard.exportMessage'),
      type: 'info',
      duration: 3000,
      action: {
        label: t('dashboard.download'),
        onClick: () => {
          // Mock download
                  }
      }
    }]);
  };

  const handleNavigate = (route: string) => {
    router.push(route);
  };

  const handleNotifications = () => {
    // Mock notification action
    setToastNotifications(prev => [...prev, {
      id: `notification-${Date.now()}`,
      title: t('notifications.newNotification'),
      message: t('notifications.checkCenter'),
      type: 'info',
      duration: 3000
    }]);
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  const dismissToast = (id: string) => {
    setToastNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (isLoading) {
    return <LoadingState fullScreen />;
  }

  // Ensure user is available
  if (!user) {
    return <LoadingState fullScreen />;
  }

  return (
    <>
      <ProfessionalDashboardOverview
        data={dashboardData}
        user={{
          name: user.name || 'Admin User',
          avatar: user.avatar,
          role: user.role || 'Administrator'
        }}
        loading={isLoading}
        onRefresh={handleRefresh}
        onExport={handleExport}
        onViewReservations={() => handleNavigate('/reservations')}
        onViewFinance={() => handleNavigate('/finance')}
        onViewMembers={() => handleNavigate('/clients')}
        onViewAnalytics={() => handleNavigate('/analytics')}
        onNotifications={handleNotifications}
        onSettings={handleSettings}
      />

      {/* Toast Notifications */}
      <ProfessionalToast
        notifications={toastNotifications}
        onDismiss={dismissToast}
        maxVisible={3}
      />
    </>
  );
}
