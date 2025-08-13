'use client';

import { useState, useEffect } from 'react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  Monitor,
  Search,
  Filter,
  Calendar,
  Clock,
  Check,
  X,
  Trash2,
  Archive,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationStore } from '@/store/notifications';
import { LoadingState } from '@/components/ui/states/loading-state';
import { EmptyState } from '@/components/ui/EmptyState';

interface NotificationHistoryItem {
  id: string;
  type: string;
  channel: 'email' | 'push' | 'sms' | 'inApp';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export function NotificationHistory() {
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>(
    []
  );
  const [filteredNotifications, setFilteredNotifications] = useState<
    NotificationHistoryItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    // Load notification history from API
    loadNotificationHistory();
  }, [from, Load, API, notification, history]);

  useEffect(() => {
    // Apply filters
    let filtered = notifications;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Channel filter
    if (selectedChannel !== 'all') {
      filtered = filtered.filter((n) => n.channel === selectedChannel);
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter((n) => n.type === selectedType);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      filtered = filtered.filter((n) => {
        const notificationDate = parseISO(n.timestamp);
        switch (dateRange) {
          case 'today':
            return isToday(notificationDate);
          case 'yesterday':
            return isYesterday(notificationDate);
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return notificationDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return notificationDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    setFilteredNotifications(filtered);
    setCurrentPage(1);
  }, [searchQuery, selectedChannel, selectedType, dateRange, notifications]);

  const loadNotificationHistory = async () => {
    setLoading(true);
    try {
      // Simulated API call - replace with actual API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock data
      const mockNotifications: NotificationHistoryItem[] = [
        {
          id: '1',
          type: 'reservation',
          channel: 'email',
          title: 'Reserva confirmada',
          message:
            'Tu reserva para el 15 de marzo a las 10:00 ha sido confirmada',
          timestamp: new Date().toISOString(),
          read: true,
          actionUrl: '/reservations',
        },
        {
          id: '2',
          type: 'tournament',
          channel: 'push',
          title: 'Nuevo torneo disponible',
          message:
            'Se ha abierto la inscripción para el Torneo de Primavera 2024',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          read: false,
          actionUrl: '/tournaments',
        },
        // Add more mock data as needed
      ];

      setNotifications(mockNotifications);
    } catch (error) {
          } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const deleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = async () => {
    if (
      window.confirm(
        '¿Estás seguro de que quieres borrar todo el historial de notificaciones?'
      )
    ) {
      setNotifications([]);
    }
  };

  const channelIcons = {
    email: Mail,
    push: Smartphone,
    sms: MessageSquare,
    inApp: Monitor,
  };

  const channelColors = {
    email: 'text-blue-600 bg-blue-50',
    push: 'text-green-600 bg-green-50',
    sms: 'text-purple-600 bg-purple-50',
    inApp: 'text-indigo-600 bg-indigo-50',
  };

  const formatNotificationDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) {
      return `Hoy, ${format(date, 'HH:mm')}`;
    } else if (isYesterday(date)) {
      return `Ayer, ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'd MMM yyyy, HH:mm', { locale: es });
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNotifications = filteredNotifications.slice(
    startIndex,
    endIndex
  );

  if (loading) {
    return <LoadingState message="Cargando historial de notificaciones..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Historial de Notificaciones</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Revisa todas las notificaciones que has recibido
          </p>
        </div>
        {notifications.length > 0 && (
          <Button
            variant="outline"
            onClick={clearAllNotifications}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Borrar todo
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar notificaciones..."
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Canal</label>
            <Select
              value={selectedChannel || ''}
              onChange={(e: React.MouseEvent | React.KeyboardEvent | React.ChangeEvent<HTMLInputElement>) => setSelectedChannel(e.target.value)}
            >
              <option value="all">Todos los canales</option>
              <option value="email">Email</option>
              <option value="push">Push</option>
              <option value="sms">SMS</option>
              <option value="inApp">En la app</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <Select
              value={selectedType || ''}
              onChange={(e: React.MouseEvent | React.KeyboardEvent | React.ChangeEvent<HTMLInputElement>) => setSelectedType(e.target.value)}
            >
              <option value="all">Todos los tipos</option>
              <option value="reservation">Reservas</option>
              <option value="tournament">Torneos</option>
              <option value="match">Partidos</option>
              <option value="promotion">Promociones</option>
              <option value="system">Sistema</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Período</label>
            <Select
              value={dateRange || ''}
              onChange={(e: React.MouseEvent | React.KeyboardEvent | React.ChangeEvent<HTMLInputElement>) => setDateRange(e.target.value)}
            >
              <option value="all">Todo el tiempo</option>
              <option value="today">Hoy</option>
              <option value="yesterday">Ayer</option>
              <option value="week">Última semana</option>
              <option value="month">Último mes</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      {currentNotifications.length === 0 ? (
        <EmptyState
          icon={Bell as any}
          title="No hay notificaciones"
          description="No se encontraron notificaciones con los filtros seleccionados"
        />
      ) : (
        <>
          <div className="space-y-2">
            {currentNotifications.map((notification) => {
              const ChannelIcon = channelIcons[notification.channel];
              return (
                <Card
                  key={notification.id}
                  className={cn(
                    'p-4 transition-all hover:shadow-md',
                    !notification.read &&
                      'bg-blue-50 dark:bg-blue-900/10 border-blue-200'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'p-2 rounded-lg',
                        channelColors[notification.channel]
                      )}
                    >
                      <ChannelIcon className="h-5 w-5" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{notification.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatNotificationDate(notification.timestamp)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {notification.type}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markAsRead(notification.id)}
                              title="Marcar como leída"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {notification.actionUrl && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                (window.location.href = notification.actionUrl)
                              }
                              title="Ver más"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteNotification(notification.id)}
                            title="Eliminar"
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="text-sm text-gray-600 dark:text-gray-400">
                Página {currentPage} de {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
