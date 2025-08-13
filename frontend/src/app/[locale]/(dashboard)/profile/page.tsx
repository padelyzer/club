'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TwoFactorSettings, SessionSecurity } from '@/components/auth';
import {
  User,
  Settings,
  Bell,
  Shield,
  Mail,
  Phone,
  Edit,
  Save,
  Camera,
} from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Mock user data - in real app this would come from the user object
  const profileData = {
    firstName: user?.firstName || 'Juan',
    lastName: user?.lastName || 'Pérez',
    email: user?.email || 'juan.perez@email.com',
    phone: '+34 666 123 456',
    language: 'Español',
    timezone: 'Madrid (GMT+1)',
    avatar: null,
    role: user?.is_superuser
      ? 'Administrador del Sistema'
      : 'Administrador de Club',
    joinDate: '2023-05-15',
    lastLogin: '2025-07-28 10:30',
  };

  const tabs = [
    { id: 'general', label: 'Información General', icon: User },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'preferences', label: 'Preferencias', icon: Settings },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Perfil
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestiona tu información personal y configuración
          </p>
        </div>
        <Button
          className="flex items-center gap-2"
          onClick={() => setIsEditing(!isEditing)}
        >
          <Edit className="w-4 h-4" />
          {isEditing ? 'Cancelar' : 'Editar Perfil'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Summary Card */}
        <Card className="lg:col-span-1 p-6">
          <div className="text-center">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {profileData.firstName[0]}
                {profileData.lastName[0]}
              </div>
              {isEditing && (
                <button className="absolute bottom-0 right-0 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Camera className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              )}
            </div>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {profileData.firstName} {profileData.lastName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {profileData.role}
            </p>

            <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" />
                {profileData.email}
              </div>
              <div className="flex items-center justify-center gap-2">
                <Phone className="w-4 h-4" />
                {profileData.phone}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-500">
                <p>
                  Miembro desde:{' '}
                  {new Date(profileData.joinDate).toLocaleDateString()}
                </p>
                <p>
                  Último acceso:{' '}
                  {new Date(profileData.lastLogin).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Profile Details */}
        <Card className="lg:col-span-2 p-6">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
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
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
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
          <div className="space-y-6">
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nombre
                    </label>
                    <Input
                      value={profileData.firstName || ''}
                      disabled={!isEditing}
                      className="disabled:bg-gray-50 dark:disabled:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Apellidos
                    </label>
                    <Input
                      value={profileData.lastName || ''}
                      disabled={!isEditing}
                      className="disabled:bg-gray-50 dark:disabled:bg-gray-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={profileData.email || ''}
                    disabled={!isEditing}
                    className="disabled:bg-gray-50 dark:disabled:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Teléfono
                  </label>
                  <Input
                    value={profileData.phone || ''}
                    disabled={!isEditing}
                    className="disabled:bg-gray-50 dark:disabled:bg-gray-800"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Idioma
                    </label>
                    <Input
                      value={profileData.language || ''}
                      disabled={!isEditing}
                      className="disabled:bg-gray-50 dark:disabled:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Zona Horaria
                    </label>
                    <Input
                      value={profileData.timezone || ''}
                      disabled={!isEditing}
                      className="disabled:bg-gray-50 dark:disabled:bg-gray-800"
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="flex gap-2 pt-4">
                    <Button>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Cambios
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <TwoFactorSettings />
                <SessionSecurity />
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Preferencias de Notificación
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Configura cómo y cuándo quieres recibir notificaciones.
                </p>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Preferencias de la Aplicación
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Personaliza tu experiencia en Padelyzer.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
