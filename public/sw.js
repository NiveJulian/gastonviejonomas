const CACHE_NAME = 'gastonapp-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon.svg'
];

// Install: pre-cache shell assets and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Fallo al precachear algunos assets:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: cleanup old caches and take control of all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-first for navigation & API, Cache-first for static icons/assets with network fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // No interceptar peticiones de terceros ni llamadas no GET
  if (event.request.method !== 'GET' || !url.origin.includes(self.location.origin)) {
    return;
  }

  // Rutas que no deben cachearse de forma agresiva (/api/* o /env-config.js)
  if (url.pathname.startsWith('/api/') || url.pathname === '/env-config.js') {
    return;
  }

  // Para navegaciones HTML (modo SPA): Network-first con fallback a caché
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;
          const fallback = await caches.match('/index.html');
          return fallback || Response.error();
        })
    );
    return;
  }

  // Para recursos estáticos (imágenes, CSS, JS): Cache-first con fallback a red
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // En segundo plano actualizar si es posible
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {});
        return cached;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      });
    })
  );
});
