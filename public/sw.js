const CACHE_NAME = 'marcosmusic-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/marcos-music-icon.png',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  // Precache initial shell assets
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Pre-caching assets failed:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clean up any old caches (v1 and earlier)
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('Purging old service worker cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Bypass Service Worker completely for API calls and non-GET requests
  if (request.method !== 'GET' || url.pathname.startsWith('/api') || url.origin !== self.location.origin) {
    return;
  }

  // 2. Navigation / HTML requests: NETWORK-FIRST strategy
  // This prevents the white-screen bug caused by stale index.html pointing to old JS bundle hashes
  const isNavigation =
    request.mode === 'navigate' ||
    request.headers.get('accept')?.includes('text/html') ||
    url.pathname === '/' ||
    url.pathname === '/index.html';

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // If network is unreachable (offline mode), fallback to cached index.html
          const cached =
            (await caches.match(request)) ||
            (await caches.match('/index.html')) ||
            (await caches.match('/'));
          if (cached) return cached;
          return new Response('Modo offline ativo. Reconecte-se para carregar novidades.', {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        })
    );
    return;
  }

  // 3. Static Assets (JS, CSS, Images, Fonts): Cache-First with Network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => null);
    })
  );
});

// ================= Background Fetch Support =================
// Allows downloads to run at the OS level even if the browser/tab is minimized or closed

self.addEventListener('backgroundfetchsuccess', (event) => {
  const bgFetch = event.registration;
  event.waitUntil(
    (async () => {
      try {
        const records = await bgFetch.matchAll();
        for (const record of records) {
          const response = await record.responseReady;
          const clients = await self.clients.matchAll({ type: 'window' });
          clients.forEach((client) => {
            client.postMessage({
              type: 'BG_FETCH_SUCCESS',
              id: bgFetch.id,
            });
          });
        }
      } catch (err) {
        console.warn('Error processing background fetch success:', err);
      }
    })()
  );
});

self.addEventListener('backgroundfetchfail', (event) => {
  console.warn('Background fetch failed:', event.registration.id);
});

self.addEventListener('backgroundfetchabort', (event) => {
  console.info('Background fetch aborted:', event.registration.id);
});
