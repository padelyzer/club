'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Database,
  Shield,
  Server,
  Globe,
  Users,
  FileText,
  Eye,
  Edit,
  Plus,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/store/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Enterprise2FAAdmin } from '@/components/auth';

// ROOT System Configuration Data
const systemConfig = {
  global: {
    appName: 'Padelyzer',
    version: '2.1.0',
    maintenance: false,
    environment: 'production',
    maxOrganizations: 50,
    currentOrganizations: 3,
    maxClubs: 500,
    currentClubs: 42,
    totalUsers: 2847,
  },
  systemFeatures: [
    {
      name: 'Multi-tenant Architecture',
      enabled: true,
      description: 'Soporte para múltiples organizaciones',
      icon: Database,
      critical: true,
    },
    {
      name: 'Global Analytics',
      enabled: true,
      description: 'Analytics consolidados de todas las organizaciones',
      icon: TrendingUp,
      critical: false,
    },
    {
      name: 'System Backup',
      enabled: true,
      description: 'Respaldos automáticos del sistema',
      icon: Database,
      critical: true,
    },
    {
      name: 'API Rate Limiting',
      enabled: true,
      description: 'Límites de tasa para APIs públicas',
      icon: Shield,
      critical: true,
    },
    {
      name: 'Global Notifications',
      enabled: false,
      description: 'Sistema de notificaciones cruzadas',
      icon: AlertCircle,
      critical: false,
    },
  ],
  globalIntegrations: [
    {
      name: 'Stripe Connect',
      type: 'Payments',
      status: 'connected',
      description: 'Procesamiento de pagos para todas las organizaciones',
      scope: 'global',
    },
    {
      name: 'SendGrid',
      type: 'Email',
      status: 'connected',
      description: 'Servicio de email transaccional global',
      scope: 'global',
    },
    {
      name: 'AWS S3',
      type: 'Storage',
      status: 'connected',
      description: 'Almacenamiento de archivos y backups',
      scope: 'global',
    },
    {
      name: 'Sentry',
      type: 'Monitoring',
      status: 'connected',
      description: 'Monitoreo de errores y performance',
      scope: 'global',
    },
    {
      name: 'Auth0',
      type: 'Authentication',
      status: 'disconnected',
      description: 'Autenticación empresarial (SSO)',
      scope: 'global',
    },
  ],
  globalSecurity: {
    enforceSSL: true,
    globalTwoFactor: true,
    passwordPolicy: 'enterprise',
    sessionTimeout: 24,
    ipWhitelisting: false,
    auditLogging: true,
    dataEncryption: true,
  },
  systemPerformance: {
    globalCache: true,
    cdnEnabled: true,
    databaseOptimized: true,
    loadBalancer: true,
    autoScaling: false,
    monitoring: true,
  },
};

const statusConfig = {
  connected: {
    label: 'Conectado',
    color: 'bg-green-100 text-green-800',
  },
  disconnected: {
    label: 'Desconectado',
    color: 'bg-red-100 text-red-800',
  },
  pending: {
    label: 'Pendiente',
    color: 'bg-yellow-100 text-yellow-800',
  },
};

const tabs = [
  { id: 'overview', label: 'System Overview', icon: Settings },
  { id: '2fa-admin', label: '2FA Management', icon: Shield },
  { id: 'integrations', label: 'Integrations', icon: Globe },
  { id: 'performance', label: 'Performance', icon: Server },
];

export default function RootSystemConfigPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');

  // Access control
  const hasAccess = user?.is_superuser || user?.is_staff;

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-md mx-auto mt-32">
            <Alert className="border-red-200 bg-red-50">
              <Shield className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                You need ROOT administrator privileges to access system configuration.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-semibold text-blue-600">ROOT System Configuration</span>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Global System Configuration
              </h1>
              <p className="text-gray-600 mt-1">
                Manage system-wide settings and configurations for all organizations
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                System Logs
              </Button>
              <Button className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Advanced Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* System Overview Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">System Version</p>
                <p className="text-2xl font-bold text-gray-900">
                  {systemConfig.global.version}
                </p>
                <p className="text-xs text-green-600">Production</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Server className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Organizations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {systemConfig.global.currentOrganizations}
                </p>
                <p className="text-xs text-gray-500">
                  of {systemConfig.global.maxOrganizations} max
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Clubs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {systemConfig.global.currentClubs}
                </p>
                <p className="text-xs text-gray-500">
                  of {systemConfig.global.maxClubs} max
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Database className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {systemConfig.global.totalUsers.toLocaleString()}
                </p>
                <p className="text-xs text-green-600">+12% this month</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Users className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* System Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                System Features
              </h3>
              <Badge variant="outline">
                {systemConfig.systemFeatures.filter(f => f.enabled).length} Active
              </Badge>
            </div>

            <div className="space-y-4">
              {systemConfig.systemFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">
                            {feature.name}
                          </p>
                          {feature.critical && (
                            <Badge variant="destructive" className="text-xs">
                              Critical
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                    <Switch checked={feature.enabled} disabled={feature.critical} />
                  </motion.div>
                );
              })}
            </div>
          </Card>

          {/* Global Integrations */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Global Integrations
              </h3>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Integration
              </Button>
            </div>

            <div className="space-y-4">
              {systemConfig.globalIntegrations.map((integration, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Globe className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {integration.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {integration.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        statusConfig[integration.status as keyof typeof statusConfig].color
                      }
                    >
                      {statusConfig[integration.status as keyof typeof statusConfig].label}
                    </Badge>
                    <Button size="sm" variant="ghost">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>

        {/* Security & Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Global Security */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Global Security Settings
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">Force SSL/HTTPS</p>
                  <p className="text-sm text-gray-600">Enforce HTTPS across all organizations</p>
                </div>
                <Switch checked={systemConfig.globalSecurity.enforceSSL} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">Global 2FA Policy</p>
                  <p className="text-sm text-gray-600">Require 2FA for all admin users</p>
                </div>
                <Switch checked={systemConfig.globalSecurity.globalTwoFactor} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">Audit Logging</p>
                  <p className="text-sm text-gray-600">Log all administrative actions</p>
                </div>
                <Switch checked={systemConfig.globalSecurity.auditLogging} />
              </div>

              <div className="p-3 rounded-lg bg-gray-50">
                <p className="font-medium text-gray-900 mb-1">Password Policy</p>
                <p className="text-sm text-gray-600">
                  Current: {systemConfig.globalSecurity.passwordPolicy}
                </p>
                <Button size="sm" variant="outline" className="mt-2">
                  Configure Policy
                </Button>
              </div>
            </div>
          </Card>

          {/* System Performance */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Server className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                System Performance
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">Global Cache</p>
                  <p className="text-sm text-gray-600">Redis cluster for all organizations</p>
                </div>
                <Switch checked={systemConfig.systemPerformance.globalCache} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">CDN</p>
                  <p className="text-sm text-gray-600">Content delivery network</p>
                </div>
                <Switch checked={systemConfig.systemPerformance.cdnEnabled} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">Load Balancer</p>
                  <p className="text-sm text-gray-600">Distribute traffic across servers</p>
                </div>
                <Switch checked={systemConfig.systemPerformance.loadBalancer} />
              </div>

              <div className="p-3 rounded-lg bg-gray-50">
                <p className="font-medium text-gray-900 mb-1">System Monitoring</p>
                <p className="text-sm text-gray-600">
                  Status: {systemConfig.systemPerformance.monitoring ? 'Active' : 'Inactive'}
                </p>
                <Button size="sm" variant="outline" className="mt-2">
                  <Eye className="h-4 w-4 mr-2" />
                  View Metrics
                </Button>
              </div>
            </div>
          </Card>
        </div>
          </>
        )}

        {/* 2FA Management Tab */}
        {activeTab === '2fa-admin' && (
          <Enterprise2FAAdmin />
        )}

        {/* Other tabs can be implemented later */}
        {activeTab === 'integrations' && (
          <div className="text-center py-12">
            <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Integrations Management</h3>
            <p className="text-gray-600">Global integrations configuration coming soon...</p>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="text-center py-12">
            <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Performance Monitoring</h3>
            <p className="text-gray-600">System performance metrics coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}