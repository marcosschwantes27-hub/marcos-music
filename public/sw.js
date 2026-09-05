const CACHE_NAME = 'marcosmusic-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Let API calls pass through to network
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(event.request).catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        })
      );
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
          // Notify any open clients about the completed background download
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
