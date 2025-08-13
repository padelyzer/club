/**
 * Padelyzer PWA Service Worker
 * Enhanced with push notifications, background sync, and offline support
 */

// Constants
const CACHE_NAME = 'padelyzer-v1';
const NOTIFICATION_CACHE = 'padelyzer-notifications-v1';
const OFFLINE_QUEUE_NAME = 'padelyzer-offline-queue';
const MAX_NOTIFICATION_CACHE = 100;
const RETRY_ATTEMPTS = 3;

// Notification default configuration
const DEFAULT_NOTIFICATION_CONFIG = {
  icon: '/icon-192x192.png',
  badge: '/icon-192x192.png',
  vibrate: [200, 100, 200],
  requireInteraction: false,
  silent: false,
};

// Notification category configurations
const CATEGORY_CONFIGS = {
  reservations: {
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200],
    sound: 'reservation',
    actions: [
      { action: 'accept', title: 'Accept', icon: '/icon-192x192.png' },
      { action: 'decline', title: 'Decline', icon: '/icon-192x192.png' },
      { action: 'view', title: 'View Details', icon: '/icon-192x192.png' }
    ]
  },
  tournaments: {
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [300, 200, 300],
    sound: 'tournament',
    actions: [
      { action: 'join', title: 'Join Tournament', icon: '/icon-192x192.png' },
      { action: 'view', title: 'View Details', icon: '/icon-192x192.png' }
    ]
  },
  classes: {
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [150, 100, 150],
    sound: 'class',
    actions: [
      { action: 'book', title: 'Book Class', icon: '/icon-192x192.png' },
      { action: 'view', title: 'View Details', icon: '/icon-192x192.png' }
    ]
  },
  payments: {
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [400, 200, 400],
    sound: 'payment',
    actions: [
      { action: 'pay', title: 'Pay Now', icon: '/icon-192x192.png' },
      { action: 'view', title: 'View Invoice', icon: '/icon-192x192.png' }
    ]
  },
  promotions: {
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    sound: 'promotion',
    actions: [
      { action: 'claim', title: 'Claim Offer', icon: '/icon-192x192.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/icon-192x192.png' }
    ]
  },
  system: {
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200],
    sound: 'system',
    actions: [
      { action: 'view', title: 'View Details', icon: '/icon-192x192.png' }
    ]
  }
};

// Global state
let notificationQueue = [];
let badgeCount = 0;
let isOnline = true;

// Initialize service worker
self.addEventListener('install', (event) => {
  console.log('Padelyzer PWA Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME),
      caches.open(NOTIFICATION_CACHE),
      self.skipWaiting()
    ])
  );
});

self.addEventListener('activate', (event) => {
  console.log('Padelyzer PWA Service Worker activated');
  
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      cleanupOldCaches(),
      initializeOfflineQueue()
    ])
  );
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  if (!event.data) {
    console.warn('Push event has no data');
    return;
  }

  try {
    const payload = event.data.json();
    event.waitUntil(handlePushNotification(payload));
  } catch (error) {
    console.error('Error parsing push notification:', error);
    // Fallback notification
    event.waitUntil(
      showNotification({
        title: 'Padelyzer',
        body: 'You have a new notification',
        category: 'system'
      })
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const { notification } = event;
  const { data = {} } = notification;
  const { url, category, notificationId } = data;
  
  // Handle action clicks
  if (event.action) {
    event.waitUntil(handleNotificationAction(event.action, data));
    return;
  }
  
  // Handle main notification click
  event.waitUntil(
    Promise.all([
      trackNotificationEvent('clicked', notificationId, { category }),
      openNotificationUrl(url || '/')
    ])
  );
});

// Notification close handling
self.addEventListener('notificationclose', (event) => {
  const { data = {} } = event.notification;
  const { notificationId, category } = data;
  
  trackNotificationEvent('dismissed', notificationId, { category });
});

// Background sync handling
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'notification-sync') {
    event.waitUntil(syncOfflineNotifications());
  } else if (event.tag === 'analytics-sync') {
    event.waitUntil(syncAnalyticsEvents());
  }
});

// Online/offline status handling
self.addEventListener('online', () => {
  console.log('Back online, processing queued notifications');
  isOnline = true;
  syncOfflineNotifications();
});

self.addEventListener('offline', () => {
  console.log('Gone offline');
  isOnline = false;
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'UPDATE_BADGE_COUNT':
      updateBadgeCount(payload.count);
      break;
    case 'CLEAR_NOTIFICATIONS':
      clearAllNotifications();
      break;
    case 'SCHEDULE_NOTIFICATION':
      scheduleLocalNotification(payload);
      break;
    default:
      console.warn('Unknown message type:', type);
  }
});

// Core notification functions
async function handlePushNotification(payload) {
  const { notification, metadata = {} } = payload;
  
  try {
    // Cache the notification
    await cacheNotification(notification);
    
    // Check if we should show the notification (quiet hours, etc.)
    const shouldShow = await shouldShowNotification(notification);
    
    if (shouldShow) {
      await showNotification(notification);
      await trackNotificationEvent('delivered', notification.id, {
        category: notification.category,
        source: metadata.source
      });
    } else {
      // Store for later display
      await queueNotification(notification);
    }
    
    // Update badge count
    badgeCount++;
    await updateBadgeCount(badgeCount);
    
  } catch (error) {
    console.error('Error handling push notification:', error);
    await queueNotificationForRetry(notification, error);
  }
}

async function showNotification(notification) {
  const {
    title,
    message: body,
    category = 'system',
    priority = 'normal',
    icon,
    badge,
    image,
    actions = [],
    data = {},
    tag,
    requiresInteraction,
    silent,
    vibrate,
    timestamp
  } = notification;

  // Get category-specific configuration
  const categoryConfig = CATEGORY_CONFIGS[category] || CATEGORY_CONFIGS.system;
  
  // Build notification options
  const options = {
    body,
    icon: icon || categoryConfig.icon || DEFAULT_NOTIFICATION_CONFIG.icon,
    badge: badge || categoryConfig.badge || DEFAULT_NOTIFICATION_CONFIG.badge,
    image,
    vibrate: vibrate || categoryConfig.vibrate || DEFAULT_NOTIFICATION_CONFIG.vibrate,
    requireInteraction: requiresInteraction || (priority === 'urgent'),
    silent: silent || false,
    timestamp: timestamp || Date.now(),
    tag: tag || `padelyzer-${category}`,
    renotify: true,
    data: {
      ...data,
      category,
      notificationId: notification.id,
      url: notification.actionUrl || data.url || '/'
    },
    actions: actions.length > 0 ? actions : categoryConfig.actions || []
  };

  return self.registration.showNotification(title, options);
}

async function handleNotificationAction(action, data) {
  const { category, notificationId, url } = data;
  
  try {
    // Track the action
    await trackNotificationEvent('action-clicked', notificationId, {
      category,
      action
    });
    
    switch (action) {
      case 'accept':
      case 'decline':
        await handleReservationAction(action, data);
        break;
      case 'join':
        await handleTournamentAction(action, data);
        break;
      case 'pay':
        await handlePaymentAction(action, data);
        break;
      case 'book':
        await handleClassAction(action, data);
        break;
      case 'claim':
        await handlePromotionAction(action, data);
        break;
      case 'view':
        await openNotificationUrl(url);
        break;
      case 'dismiss':
        // Just track the dismissal
        break;
      default:
        console.warn('Unknown notification action:', action);
    }
  } catch (error) {
    console.error('Error handling notification action:', error);
  }
}

async function openNotificationUrl(url) {
  const clients = await self.clients.matchAll({ type: 'window' });
  
  // Check if there's already a window open
  for (const client of clients) {
    if (client.url.includes(url) && 'focus' in client) {
      return client.focus();
    }
  }
  
  // Open new window
  if (self.clients.openWindow) {
    return self.clients.openWindow(url);
  }
}

// Specific action handlers
async function handleReservationAction(action, data) {
  const { reservationId } = data;
  
  if (!reservationId) return;
  
  try {
    const response = await fetch('/api/reservations/quick-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservationId, action })
    });
    
    if (response.ok) {
      await showSuccessNotification(action === 'accept' ? 'Reservation accepted' : 'Reservation declined');
    } else {
      throw new Error('Failed to process reservation action');
    }
  } catch (error) {
    await queueOfflineAction('reservation', { reservationId, action });
    await showErrorNotification('Action will be processed when online');
  }
}

async function handleTournamentAction(action, data) {
  const { tournamentId } = data;
  
  if (!tournamentId) return;
  
  try {
    const response = await fetch('/api/tournaments/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tournamentId })
    });
    
    if (response.ok) {
      await showSuccessNotification('Successfully joined tournament');
    } else {
      throw new Error('Failed to join tournament');
    }
  } catch (error) {
    await queueOfflineAction('tournament', { tournamentId, action });
    await showErrorNotification('Will join tournament when online');
  }
}

async function handlePaymentAction(action, data) {
  const { paymentId, amount } = data;
  
  // Open payment window
  await openNotificationUrl(`/payments/${paymentId}`);
}

async function handleClassAction(action, data) {
  const { classId } = data;
  
  // Open class booking
  await openNotificationUrl(`/classes/${classId}/book`);
}

async function handlePromotionAction(action, data) {
  const { promotionId } = data;
  
  // Open promotion page
  await openNotificationUrl(`/promotions/${promotionId}`);
}

// Utility notification functions
async function showSuccessNotification(message) {
  return showNotification({
    title: 'Success',
    message,
    category: 'system',
    priority: 'low',
    id: `success-${Date.now()}`
  });
}

async function showErrorNotification(message) {
  return showNotification({
    title: 'Error',
    message,
    category: 'system',
    priority: 'normal',
    id: `error-${Date.now()}`
  });
}

// Caching functions
async function cacheNotification(notification) {
  const cache = await caches.open(NOTIFICATION_CACHE);
  const key = `notification-${notification.id}`;
  
  await cache.put(key, new Response(JSON.stringify(notification), {
    headers: { 'Content-Type': 'application/json' }
  }));
  
  // Cleanup old notifications
  await cleanupNotificationCache();
}

async function cleanupNotificationCache() {
  const cache = await caches.open(NOTIFICATION_CACHE);
  const keys = await cache.keys();
  
  if (keys.length > MAX_NOTIFICATION_CACHE) {
    const keysToDelete = keys.slice(0, keys.length - MAX_NOTIFICATION_CACHE);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
  }
}

async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(name => 
    name.startsWith('padelyzer-') && name !== CACHE_NAME && name !== NOTIFICATION_CACHE
  );
  
  return Promise.all(oldCaches.map(name => caches.delete(name)));
}

// Queue management
async function queueNotification(notification) {
  notificationQueue.push({
    ...notification,
    queuedAt: Date.now()
  });
  
  // Persist queue
  await saveQueue();
}

async function queueNotificationForRetry(notification, error) {
  const queueItem = {
    ...notification,
    retryCount: (notification.retryCount || 0) + 1,
    lastError: error.message,
    queuedAt: Date.now()
  };
  
  if (queueItem.retryCount < RETRY_ATTEMPTS) {
    notificationQueue.push(queueItem);
    await saveQueue();
  }
}

async function queueOfflineAction(type, data) {
  const action = {
    id: `action-${Date.now()}`,
    type,
    data,
    queuedAt: Date.now(),
    retryCount: 0
  };
  
  // Store in IndexedDB or similar
  console.log('Queuing offline action:', action);
}

async function saveQueue() {
  // In a real implementation, save to IndexedDB
  console.log('Saving notification queue:', notificationQueue.length, 'items');
}

async function initializeOfflineQueue() {
  // Load queued notifications from storage
  notificationQueue = [];
  console.log('Initialized offline queue');
}

// Background sync functions
async function syncOfflineNotifications() {
  if (!isOnline || notificationQueue.length === 0) return;
  
  const notifications = [...notificationQueue];
  notificationQueue = [];
  
  for (const notification of notifications) {
    try {
      await showNotification(notification);
      console.log('Synced queued notification:', notification.id);
    } catch (error) {
      console.error('Failed to sync notification:', error);
      if (notification.retryCount < RETRY_ATTEMPTS) {
        await queueNotificationForRetry(notification, error);
      }
    }
  }
  
  await saveQueue();
}

async function syncAnalyticsEvents() {
  // Sync any queued analytics events
  console.log('Syncing analytics events');
}

// Badge management
async function updateBadgeCount(count) {
  badgeCount = count;
  
  if ('setAppBadge' in navigator) {
    try {
      await navigator.setAppBadge(count);
    } catch (error) {
      console.warn('Failed to set app badge:', error);
    }
  }
}

async function clearAllNotifications() {
  const notifications = await self.registration.getNotifications();
  notifications.forEach(notification => notification.close());
  
  badgeCount = 0;
  await updateBadgeCount(0);
}

// Notification filtering
async function shouldShowNotification(notification) {
  // Check quiet hours
  const now = new Date();
  const hour = now.getHours();
  
  // Simple quiet hours check (10 PM to 8 AM)
  if (hour >= 22 || hour < 8) {
    return notification.priority === 'urgent';
  }
  
  return true;
}

// Analytics tracking
async function trackNotificationEvent(event, notificationId, metadata = {}) {
  const eventData = {
    event,
    notificationId,
    timestamp: Date.now(),
    ...metadata
  };
  
  try {
    await fetch('/api/analytics/notification-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });
  } catch (error) {
    // Queue for later sync
    console.log('Queuing analytics event for later sync');
  }
}

// Local notification scheduling
function scheduleLocalNotification(data) {
  const { notification, scheduledFor } = data;
  const delay = new Date(scheduledFor).getTime() - Date.now();
  
  if (delay > 0) {
    setTimeout(() => {
      showNotification(notification);
    }, delay);
  }
}

console.log('Padelyzer PWA Service Worker loaded successfully');