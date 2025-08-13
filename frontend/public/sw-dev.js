// Development service worker - unregisters existing SW
console.log('Development mode: Unregistering service worker');

// Unregister existing service workers
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clear all caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      
      // Unregister self
      const registrations = await self.registration.unregister();
      console.log('Service worker unregistered:', registrations);
      
      // Claim clients to ensure immediate effect
      self.clients.claim();
    })()
  );
});