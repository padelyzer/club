'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { 
  Calendar,
  Users,
  Building2,
  CreditCard,
  BarChart3,
  Settings,
  Trophy,
  Plus,
  Download,
  HelpCircle
} from 'lucide-react';
import { ProfessionalNavigationLayout } from '@/components/navigation/professional/ProfessionalNavigationLayout';
import { useAuthStore } from '@/store/auth';

// Mock notifications - replace with real data
const getMockNotifications = () => [
  {
    id: '1',
    title: 'New Reservation',
    message: 'Court 3 has been booked for tomorrow at 10:00 AM',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    type: 'info' as const,
    read: false
  },
  {
    id: '2',
    title: 'Payment Received',
    message: 'Monthly membership fee received from John Doe',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    type: 'success' as const,
    read: false
  },
  {
    id: '3',
    title: 'Maintenance Required',
    message: 'Court 2 lighting system needs attention',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    type: 'warning' as const,
    read: true
  }
];

// Mock quick actions
const getQuickActions = (t: any) => [
  {
    id: 'new-reservation',
    label: t('quickActions.newReservation'),
    icon: Calendar,
    onClick: () => {},
    variant: 'primary' as const
  },
  {
    id: 'add-client',
    label: t('quickActions.addClient'),
    icon: Users,
    onClick: () => {},
    variant: 'secondary' as const
  },
  {
    id: 'export-data',
    label: t('quickActions.exportData'),
    icon: Download,
    onClick: () => {},
    variant: 'secondary' as const
  }
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  
  const [notifications, setNotifications] = useState(getMockNotifications());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState('en');

  // Generate breadcrumbs based on current path
  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [];
    
    // Skip locale segment
    const pathSegments = segments.slice(1);
    
    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      const href = '/' + segments.slice(0, i + 2).join('/');
      
      breadcrumbs.push({
        id: segment,
        label: t(`navigation.${segment}`, { defaultValue: segment.charAt(0).toUpperCase() + segment.slice(1) }),
        href,
        active: i === pathSegments.length - 1
      });
    }
    
    return breadcrumbs;
  };

  const handleNavigate = (item: any) => {
    if (item.href) {
      router.push(item.href);
    }
  };

  const handleSearch = (query: string) => {
        // Implement search functionality
  };

  const handleNotificationClick = (notification: any) => {
        // Handle notification click
  };

  const handleNotificationMarkRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const handleNotificationMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleProfileClick = () => {
    router.push('/profile');
  };

  const handleSettingsClick = () => {
    router.push('/settings');
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleToggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleToggleLanguage = () => {
    const newLang = language === 'en' ? 'es' : 'en';
    setLanguage(newLang);
    // Implement language switching
  };

  return (
    <ProfessionalNavigationLayout
      currentRoute={pathname}
      breadcrumbs={getBreadcrumbs()}
      user={{
        name: user?.name || 'Admin User',
        email: user?.email || 'admin@padelyzer.com',
        avatar: user?.avatar,
        role: user?.role || 'Administrator'
      }}
      notifications={notifications}
      quickActions={getQuickActions(t)}
      onNavigate={handleNavigate}
      onSearch={handleSearch}
      onNotificationClick={handleNotificationClick}
      onNotificationMarkRead={handleNotificationMarkRead}
      onNotificationMarkAllRead={handleNotificationMarkAllRead}
      onProfileClick={handleProfileClick}
      onSettingsClick={handleSettingsClick}
      onLogout={handleLogout}
      onToggleTheme={handleToggleTheme}
      onToggleLanguage={handleToggleLanguage}
      theme={theme}
      language={language}
      showSearch={true}
      showBreadcrumbs={pathname !== '/dashboard'}
      sidebarCollapsed={sidebarCollapsed}
      onSidebarToggle={setSidebarCollapsed}
    >
      {children}
    </ProfessionalNavigationLayout>
  );
}
