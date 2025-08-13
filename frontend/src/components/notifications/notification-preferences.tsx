'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useProfileStore } from '@/store/profileStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/states/loading-state';
import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  Monitor,
  Volume2,
  Vibrate,
  AlertTriangle,
  Clock,
  TestTube,
  Check,
  X,
  Link,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { NotificationPreferences as NotificationPreferencesType } from '@/types/profile';
import { toast } from '@/lib/toast';

interface NotificationToggleProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  frequency?: string;
  onFrequencyChange?: (frequency: string) => void;
}

function NotificationToggle({
  title,
  description,
  checked,
  onChange,
  disabled,
  frequency,
  onFrequencyChange,
}: NotificationToggleProps) {
  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
        </label>
      </div>

      {checked && frequency !== undefined && onFrequencyChange && (
        <div className="mt-3 ml-0 md:ml-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <Label htmlFor={`frequency-${title}`} className="text-sm">
              Frecuencia:
            </Label>
            <Select
              id={`frequency-${title}`}
              value={frequency || ''}
              onChange={(e: React.MouseEvent | React.KeyboardEvent | React.ChangeEvent<HTMLInputElement>) => onFrequencyChange(e.target.value)}
              className="w-40 h-8 text-sm"
              disabled={disabled}
            >
              <option value="instant">Instantáneo</option>
              <option value="hourly">Cada hora</option>
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}

interface ChannelPreferences {
  enabled: boolean;
  frequency: 'instant' | 'hourly' | 'daily' | 'weekly';
  categories: {
    [key: string]: boolean;
  };
}

export function NotificationPreferences() {
  const { t } = useTranslation();
  const {
    notifications,
    loadingStates,
    errors,
    updateNotificationPreferences,
  } = useProfileStore();

  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<{
    email: ChannelPreferences;
    push: ChannelPreferences;
    sms: ChannelPreferences;
    inApp: ChannelPreferences;
  }>({
    email: {
      enabled: true,
      frequency: 'instant',
      categories: notifications?.email || {},
    },
    push: {
      enabled: true,
      frequency: 'instant',
      categories: notifications?.push || {},
    },
    sms: {
      enabled: true,
      frequency: 'instant',
      categories: notifications?.sms || {},
    },
    inApp: {
      enabled: true,
      frequency: 'instant',
      categories: notifications?.inApp || {},
    },
  });

  if (!notifications) {
    return <LoadingState message={t('profile.loading')} />;
  }

  const updatePreference = async (
    channel: keyof typeof preferences,
    category: string,
    value: boolean
  ) => {
    try {
      const updatedPreferences = {
        ...preferences,
        [channel]: {
          ...preferences[channel],
          categories: {
            ...preferences[channel].categories,
            [category]: value,
          },
        },
      };
      setPreferences(updatedPreferences);

      // Update in backend
      const backendPreferences = {
        email: updatedPreferences.email.categories,
        push: updatedPreferences.push.categories,
        sms: updatedPreferences.sms.categories,
        inApp: updatedPreferences.inApp.categories,
      };
      await updateNotificationPreferences(backendPreferences as any);
    } catch (error) {
          }
  };

  const updateChannelFrequency = (
    channel: keyof typeof preferences,
    frequency: string
  ) => {
    setPreferences({
      ...preferences,
      [channel]: {
        ...preferences[channel],
        frequency: frequency as ChannelPreferences['frequency'],
      },
    });
  };

  const updateChannelEnabled = (
    channel: keyof typeof preferences,
    enabled: boolean
  ) => {
    setPreferences({
      ...preferences,
      [channel]: {
        ...preferences[channel],
        enabled,
      },
    });
  };

  const sendTestNotification = async (channel: string) => {
    setTestingChannel(channel);
    try {
      // Simulate API call to send test notification
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success(`Notificación de prueba enviada por ${channel}`);
    } catch (error) {
      toast.error('Error al enviar notificación de prueba');
    } finally {
      setTestingChannel(null);
    }
  };

  const channels = [
    {
      key: 'email',
      icon: Mail,
      color: 'text-blue-600',
      title: t('profile.notifications.email'),
      description: 'Recibe notificaciones por correo electrónico',
    },
    {
      key: 'push',
      icon: Smartphone,
      color: 'text-green-600',
      title: t('profile.notifications.push'),
      description: 'Recibe notificaciones push en tu dispositivo',
    },
    {
      key: 'sms',
      icon: MessageSquare,
      color: 'text-purple-600',
      title: t('profile.notifications.sms'),
      description: 'Recibe notificaciones importantes por SMS',
    },
    {
      key: 'inApp',
      icon: Monitor,
      color: 'text-indigo-600',
      title: t('profile.notifications.inApp'),
      description: 'Controla cómo aparecen las notificaciones en la app',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Master Controls */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">
              Preferencias de Notificaciones
            </h2>
          </div>
          <Badge variant="outline">
            {Object.values(preferences).filter((p) => p.enabled).length} canales
            activos
          </Badge>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Personaliza cómo y cuándo recibes notificaciones de Padelyzer
        </p>
      </Card>

      {/* Channel Settings */}
      {channels.map((channel) => {
        const channelKey = channel.key as keyof typeof preferences;
        const channelPrefs = preferences[channelKey];

        return (
          <Card key={channel.key} className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <channel.icon className={`w-6 h-6 ${channel.color}`} />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {channel.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {channel.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sendTestNotification(channel.key)}
                  disabled={
                    !channelPrefs.enabled || testingChannel === channel.key
                  }
                >
                  {testingChannel === channel.key ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4 mr-2" />
                      Probar
                    </>
                  )}
                </Button>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channelPrefs.enabled}
                    onChange={(e) =>
                      updateChannelEnabled(channelKey, e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {channelPrefs.enabled && (
              <>
                {/* Global Frequency for Channel */}
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <Label>Frecuencia global del canal:</Label>
                    </div>
                    <Select
                      value={channelPrefs.frequency || ''}
                      onChange={(e: React.MouseEvent | React.KeyboardEvent | React.ChangeEvent<HTMLInputElement>) =>
                        updateChannelFrequency(channelKey, e.target.value)
                      }
                      className="w-40"
                    >
                      <option value="instant">Instantáneo</option>
                      <option value="hourly">Cada hora</option>
                      <option value="daily">Resumen diario</option>
                      <option value="weekly">Resumen semanal</option>
                    </Select>
                  </div>
                </div>

                {/* Category Settings */}
                <div className="space-y-2 divide-y divide-gray-200 dark:divide-gray-700">
                  <NotificationToggle
                    title={t('profile.notifications.categories.reservations')}
                    description={t(
                      'profile.notifications.categories.reservationsDesc'
                    )}
                    checked={channelPrefs.categories.reservations || false}
                    onChange={(checked) =>
                      updatePreference(channelKey, 'reservations', checked)
                    }
                    disabled={loadingStates.preferences}
                  />

                  <NotificationToggle
                    title={t('profile.notifications.categories.tournaments')}
                    description={t(
                      'profile.notifications.categories.tournamentsDesc'
                    )}
                    checked={channelPrefs.categories.tournaments || false}
                    onChange={(checked) =>
                      updatePreference(channelKey, 'tournaments', checked)
                    }
                    disabled={loadingStates.preferences}
                  />

                  <NotificationToggle
                    title={t('profile.notifications.categories.matches')}
                    description={t(
                      'profile.notifications.categories.matchesDesc'
                    )}
                    checked={channelPrefs.categories.matches || false}
                    onChange={(checked) =>
                      updatePreference(channelKey, 'matches', checked)
                    }
                    disabled={loadingStates.preferences}
                  />

                  {channelKey === 'email' && (
                    <>
                      <NotificationToggle
                        title={t('profile.notifications.categories.promotions')}
                        description={t(
                          'profile.notifications.categories.promotionsDesc'
                        )}
                        checked={channelPrefs.categories.promotions || false}
                        onChange={(checked) =>
                          updatePreference(channelKey, 'promotions', checked)
                        }
                        disabled={loadingStates.preferences}
                      />

                      <NotificationToggle
                        title={t(
                          'profile.notifications.categories.newsletters'
                        )}
                        description={t(
                          'profile.notifications.categories.newslettersDesc'
                        )}
                        checked={channelPrefs.categories.newsletters || false}
                        onChange={(checked) =>
                          updatePreference(channelKey, 'newsletters', checked)
                        }
                        disabled={loadingStates.preferences}
                      />
                    </>
                  )}

                  {(channelKey === 'push' || channelKey === 'sms') && (
                    <NotificationToggle
                      title={t('profile.notifications.categories.reminders')}
                      description={t(
                        'profile.notifications.categories.remindersDesc'
                      )}
                      checked={channelPrefs.categories.reminders || false}
                      onChange={(checked) =>
                        updatePreference(channelKey, 'reminders', checked)
                      }
                      disabled={loadingStates.preferences}
                    />
                  )}

                  <NotificationToggle
                    title={t('profile.notifications.categories.systemUpdates')}
                    description={t(
                      'profile.notifications.categories.systemUpdatesDesc'
                    )}
                    checked={channelPrefs.categories.systemUpdates || false}
                    onChange={(checked) =>
                      updatePreference(channelKey, 'systemUpdates', checked)
                    }
                    disabled={loadingStates.preferences}
                  />

                  {channelKey === 'sms' && (
                    <NotificationToggle
                      title={t(
                        'profile.notifications.categories.emergencyOnly'
                      )}
                      description={t(
                        'profile.notifications.categories.emergencyOnlyDesc'
                      )}
                      checked={channelPrefs.categories.emergencyOnly || false}
                      onChange={(checked) =>
                        updatePreference(channelKey, 'emergencyOnly', checked)
                      }
                      disabled={loadingStates.preferences}
                    />
                  )}

                  {channelKey === 'inApp' && (
                    <>
                      <NotificationToggle
                        title={t(
                          'profile.notifications.preferences.realTimeUpdates'
                        )}
                        description="Recibe actualizaciones en tiempo real"
                        checked={
                          channelPrefs.categories.realTimeUpdates || false
                        }
                        onChange={(checked) =>
                          updatePreference(
                            channelKey,
                            'realTimeUpdates',
                            checked
                          )
                        }
                        disabled={loadingStates.preferences}
                      />

                      <div className="flex items-center justify-between py-4">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                            <Volume2 className="w-4 h-4" />
                            <span>
                              {t(
                                'profile.notifications.preferences.soundEnabled'
                              )}
                            </span>
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Reproducir sonido para notificaciones
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              channelPrefs.categories.soundEnabled || false
                            }
                            onChange={(e) =>
                              updatePreference(
                                channelKey,
                                'soundEnabled',
                                e.target.checked
                              )
                            }
                            disabled={loadingStates.preferences}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between py-4">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                            <Vibrate className="w-4 h-4" />
                            <span>
                              {t(
                                'profile.notifications.preferences.vibrationEnabled'
                              )}
                            </span>
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Vibrar para notificaciones en dispositivos móviles
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              channelPrefs.categories.vibrationEnabled || false
                            }
                            onChange={(e) =>
                              updatePreference(
                                channelKey,
                                'vibrationEnabled',
                                e.target.checked
                              )
                            }
                            disabled={loadingStates.preferences}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </Card>
        );
      })}

      {/* Unsubscribe Options */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link className="h-6 w-6 text-gray-600" />
            <h2 className="text-xl font-semibold">Enlaces de Cancelación</h2>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Usa estos enlaces para cancelar rápidamente las suscripciones de
          notificaciones
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p className="font-medium">Cancelar todas las notificaciones</p>
              <p className="text-sm text-gray-600">
                Deja de recibir todo tipo de notificaciones
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const unsubscribeToken = btoa(`${notifications?.email}:all`);
                  const url = `${window.location.origin}/unsubscribe?token=${unsubscribeToken}`;
                  navigator.clipboard.writeText(url);
                  toast.success('Enlace copiado al portapapeles');
                }}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copiar enlace
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={async () => {
                  const confirmed = window.confirm(
                    '¿Estás seguro de que quieres cancelar todas las notificaciones?'
                  );
                  if (confirmed) {
                    try {
                      // Disable all channels
                      const allDisabled = {
                        email: {},
                        push: {},
                        sms: {},
                        inApp: {},
                      };
                      await updateNotificationPreferences(allDisabled as any);
                      toast.success(
                        'Todas las notificaciones han sido canceladas'
                      );
                    } catch (error) {
                      toast.error('Error al cancelar las notificaciones');
                    }
                  }
                }}
              >
                Cancelar todo
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p className="font-medium">
                Cancelar notificaciones promocionales
              </p>
              <p className="text-sm text-gray-600">
                Solo cancela promociones y newsletters
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const unsubscribeToken = btoa(
                    `${notifications?.email}:promotional`
                  );
                  const url = `${window.location.origin}/unsubscribe?token=${unsubscribeToken}`;
                  navigator.clipboard.writeText(url);
                  toast.success('Enlace copiado al portapapeles');
                }}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copiar enlace
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    // Disable promotional notifications
                    await updatePreference('email', 'promotions', false);
                    await updatePreference('email', 'newsletters', false);
                    toast.success('Notificaciones promocionales canceladas');
                  } catch (error) {
                    toast.error(
                      'Error al cancelar las notificaciones promocionales'
                    );
                  }
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Los enlaces de cancelación se pueden incluir en los correos
              electrónicos para cumplir con las regulaciones de privacidad.
            </p>
          </div>
        </div>
      </Card>

      {/* Summary Card */}
      <Card className="p-6 bg-gray-50 dark:bg-gray-800">
        <h3 className="font-semibold mb-4">Resumen de Configuración</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {channels.map((channel) => {
            const channelKey = channel.key as keyof typeof preferences;
            const channelPrefs = preferences[channelKey];
            const activeCategories = Object.values(
              channelPrefs.categories
            ).filter(Boolean).length;

            return (
              <div key={channel.key} className="text-center">
                <channel.icon
                  className={`h-8 w-8 mx-auto mb-2 ${channelPrefs.enabled ? channel.color : 'text-gray-400'}`}
                />
                <p className="font-medium">{channel.title}</p>
                <p className="text-sm text-gray-600">
                  {channelPrefs.enabled ? (
                    <>
                      {activeCategories} categorías
                      <br />
                      {channelPrefs.frequency === 'instant' && 'Instantáneo'}
                      {channelPrefs.frequency === 'hourly' && 'Cada hora'}
                      {channelPrefs.frequency === 'daily' && 'Diario'}
                      {channelPrefs.frequency === 'weekly' && 'Semanal'}
                    </>
                  ) : (
                    'Desactivado'
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Loading State */}
      {loadingStates.preferences && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
        >
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-blue-700 dark:text-blue-300">
              {t('profile.saving')}
            </span>
          </div>
        </motion.div>
      )}

      {/* Error Display */}
      {errors.preferences && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">
              {errors.preferences}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
