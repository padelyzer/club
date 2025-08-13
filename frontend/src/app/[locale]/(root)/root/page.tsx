'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Building, 
  BarChart3, 
  Settings, 
  AlertCircle, 
  Users,
  ArrowRight,
  Info,
  Activity,
  Plus,
  Lock,
  Server,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function RootDashboardPage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split('/')[1] || 'es';
  const { user } = useAuthStore();

  const rootModules = [
    {
      title: 'Gestión de Organizaciones',
      description: 'Administrar organizaciones y sus clubes',
      icon: Building,
      href: `/${locale}/root/organizations`,
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      stats: { label: 'Organizaciones activas', value: '12' }
    },
    {
      title: 'Gestión de Clubes',
      description: 'Ver y administrar todos los clubes del sistema',
      icon: Building,
      href: `/${locale}/root/clubmngr`,
      color: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      stats: { label: 'Clubes totales', value: '45' }
    },
    {
      title: 'Analíticas del Sistema',
      description: 'Métricas y reportes globales',
      icon: BarChart3,
      href: `/${locale}/root/analytics`,
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      stats: { label: 'Usuarios activos', value: '1,234' }
    },
    {
      title: 'Configuración del Sistema',
      description: 'Parámetros y ajustes globales',
      icon: Settings,
      href: `/${locale}/root/system-config`,
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      badge: 'Avanzado'
    },
    {
      title: 'Auditoría y Seguridad',
      description: 'Logs de auditoría y eventos de seguridad',
      icon: Shield,
      href: `/${locale}/root/audit`,
      color: 'bg-gradient-to-br from-red-500 to-red-600',
      stats: { label: 'Eventos hoy', value: '89' }
    },
    {
      title: 'Salud del Sistema',
      description: 'Monitor de servicios y recursos',
      icon: Activity,
      href: `/${locale}/root/health`,
      color: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
      badge: 'En línea'
    },
    {
      title: 'Gestión de Usuarios',
      description: 'Administrar usuarios del sistema',
      icon: Users,
      href: `/${locale}/root/users`,
      color: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      stats: { label: 'Usuarios totales', value: '3,456' }
    },
  ];

  // Quick access shortcuts
  const quickActions = [
    {
      label: 'Crear Organización',
      href: `/${locale}/root/organizations/new`,
      icon: Plus
    },
    {
      label: 'Nuevo Club',
      href: `/${locale}/root/clubmngr/new`,
      icon: Plus
    },
    {
      label: 'Ver Reportes',
      href: `/${locale}/root/analytics`,
      icon: BarChart3
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Panel de Control ROOT
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Acceso completo al sistema de gestión de Padelyzer
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="gap-2">
            <Shield className="h-4 w-4" />
            Superadministrador
          </Badge>
          <Button 
            variant="outline"
            onClick={() => router.push(`/${locale}/clubs`)}
            className="gap-2"
          >
            <Building className="h-4 w-4" />
            Ir a Clubes
          </Button>
        </div>
      </div>

      {/* Welcome Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Bienvenido {user?.first_name || user?.username}. Tienes acceso completo al sistema. 
          Usa los módulos a continuación para gestionar organizaciones, clubes y configuraciones del sistema.
        </AlertDescription>
      </Alert>

      {/* Quick Actions */}
      <div className="flex gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.href}
              variant="outline"
              size="sm"
              onClick={() => router.push(action.href)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </Button>
          );
        })}
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rootModules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} href={module.href} className="group">
              <Card className="h-full hover:shadow-lg transition-all duration-200 hover:scale-[1.02] overflow-hidden">
                <div className="p-6 space-y-4">
                  {/* Icon and Badge */}
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-lg ${module.color} text-white shadow-lg`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    {module.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {module.badge}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Title and Description */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {module.description}
                    </p>
                  </div>

                  {/* Stats */}
                  {module.stats && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{module.stats.label}</span>
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">
                          {module.stats.value}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Arrow Icon */}
                  <div className="flex justify-end">
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all group-hover:translate-x-1" />
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* System Status */}
      <Card className="mt-8">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Estado del Sistema
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">99.9%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Uptime</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">1.2ms</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Latencia API</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">45GB</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Almacenamiento</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">12</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Alertas</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}