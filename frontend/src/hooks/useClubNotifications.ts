import { useEffect, useCallback } from 'react';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { useClubNotifications, notificationTemplates } from '@/lib/notifications/club-notifications';
import { useSimpleClubStore } from '@/lib/stores/club-store-simple';

/**
 * Hook to integrate club notifications with WebSocket
 */
export const useClubNotificationsSocket = () => {
  const { socket, isConnected } = useWebSocket();
  const { addNotification } = useClubNotifications();
  const currentClubId = useSimpleClubStore(state => state.currentClubId);
  
  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        // Reservation notifications
        case 'reservation_created':
          if (data.club_id === currentClubId) {
            addNotification(notificationTemplates.newReservation(
              data.club_name,
              data.court_name,
              data.time
            ));
          }
          break;
          
        case 'reservation_cancelled':
          if (data.club_id === currentClubId) {
            addNotification(notificationTemplates.reservationCancelled(
              data.club_name,
              data.reason
            ));
          }
          break;
          
        // Member notifications
        case 'member_joined':
          if (data.club_id === currentClubId) {
            addNotification(notificationTemplates.newMember(
              data.member_name,
              data.club_name
            ));
          }
          break;
          
        case 'member_milestone':
          addNotification(notificationTemplates.memberMilestone(
            data.member_count,
            data.club_name
          ));
          break;
          
        // Payment notifications
        case 'payment_received':
          addNotification(notificationTemplates.paymentReceived(
            data.amount,
            data.concept
          ));
          break;
          
        case 'payment_failed':
          addNotification(notificationTemplates.paymentFailed(
            data.concept
          ));
          break;
          
        // Analytics notifications
        case 'weekly_report_ready':
          addNotification(notificationTemplates.weeklyReport(
            data.club_name,
            {
              revenue: data.revenue,
              occupancy: data.occupancy
            }
          ));
          break;
          
        // Achievement notifications
        case 'rating_improved':
          addNotification(notificationTemplates.ratingImproved(
            data.club_name,
            data.new_rating
          ));
          break;
          
        // Maintenance notifications
        case 'maintenance_scheduled':
          addNotification(notificationTemplates.maintenanceScheduled(
            data.club_name,
            data.scheduled_date
          ));
          break;
          
        // Generic notification
        case 'club_notification':
          addNotification({
            type: data.notification_type || 'info',
            category: data.category || 'system',
            title: data.title,
            message: data.message,
            priority: data.priority || 'medium',
            clubId: data.club_id,
            clubName: data.club_name,
            actionUrl: data.action_url,
            actionLabel: data.action_label,
            metadata: data.metadata,
            expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
          });
          break;
      }
    } catch (error) {
          }
  }, [addNotification, currentClubId]);
  
  // Set up WebSocket listener
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    socket.addEventListener('message', handleWebSocketMessage);
    
    return () => {
      socket.removeEventListener('message', handleWebSocketMessage);
    };
  }, [socket, isConnected, handleWebSocketMessage]);
  
  // Subscribe to club notifications
  const subscribeToClub = useCallback((clubId: string) => {
    if (!socket || !isConnected) return;
    
    socket.send(JSON.stringify({
      type: 'subscribe',
      channel: 'club_notifications',
      club_id: clubId,
    }));
  }, [socket, isConnected]);
  
  // Unsubscribe from club notifications
  const unsubscribeFromClub = useCallback((clubId: string) => {
    if (!socket || !isConnected) return;
    
    socket.send(JSON.stringify({
      type: 'unsubscribe',
      channel: 'club_notifications',
      club_id: clubId,
    }));
  }, [socket, isConnected]);
  
  // Auto-subscribe to current club
  useEffect(() => {
    if (currentClubId) {
      subscribeToClub(currentClubId);
      
      return () => {
        unsubscribeFromClub(currentClubId);
      };
    }
  }, [currentClubId, subscribeToClub, unsubscribeFromClub]);
  
  return {
    subscribeToClub,
    unsubscribeFromClub,
  };
};

/**
 * Hook to show notification toasts
 */
export const useClubNotificationToasts = () => {
  const notifications = useClubNotifications(state => 
    state.notifications.filter(n => 
      n.priority === 'high' || 
      n.priority === 'urgent' ||
      n.type === 'achievement'
    ).slice(0, 3)
  );
  
  const removeNotification = useClubNotifications(state => state.removeNotification);
  
  return {
    toastNotifications: notifications,
    dismissToast: removeNotification,
  };
};

/**
 * Hook for notification analytics
 */
export const useClubNotificationAnalytics = () => {
  const notifications = useClubNotifications(state => state.notifications);
  
  const analytics = {
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    byCategory: Object.entries(
      notifications.reduce((acc, n) => {
        acc[n.category] = (acc[n.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ),
    byType: Object.entries(
      notifications.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ),
    highPriority: notifications.filter(n => 
      n.priority === 'high' || n.priority === 'urgent'
    ).length,
    recent: notifications.filter(n => {
      const hourAgo = new Date();
      hourAgo.setHours(hourAgo.getHours() - 1);
      return n.timestamp > hourAgo;
    }).length,
  };
  
  return analytics;
};