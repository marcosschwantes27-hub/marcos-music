const CACHE_NAME = 'marcosmusic-v3';
const BG_DOWNLOAD_CACHE = 'marcosmusic-downloads-v1';
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
  // Clean up any old caches (v1, v2, etc.) but preserve BG_DOWNLOAD_CACHE
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== BG_DOWNLOAD_CACHE)
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
// Allows downloads to run at the mobile OS level (Android Download Manager)
// even when the browser or PWA is minimized or completely closed.

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    if (!self.indexedDB) return reject(new Error('IndexedDB not supported in SW'));
    const req = self.indexedDB.open('MarcosMusicDB', 2);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('songs')) {
        const songStore = db.createObjectStore('songs', { keyPath: 'id' });
        songStore.createIndex('dateAdded', 'dateAdded');
        songStore.createIndex('isLiked', 'isLiked');
        songStore.createIndex('artist', 'artist');
        songStore.createIndex('album', 'album');
      }
      if (!db.objectStoreNames.contains('playlists')) {
        const playlistStore = db.createObjectStore('playlists', { keyPath: 'id' });
        playlistStore.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('downloadQueue')) {
        const queueStore = db.createObjectStore('downloadQueue', { keyPath: 'id' });
        queueStore.createIndex('status', 'status');
        queueStore.createIndex('createdAt', 'createdAt');
      }
    };
  });
}

async function saveBgDownloadToIndexedDB(fetchId, audioBlob) {
  const db = await openIndexedDB();

  // Read queue item
  const queueItem = await new Promise((resolve, reject) => {
    const tx = db.transaction('downloadQueue', 'readonly');
    const store = tx.objectStore('downloadQueue');
    const req = store.get(fetchId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (!queueItem) {
    console.warn('Queue item not found for bgFetch:', fetchId);
    return;
  }

  const safeTitle = (queueItem.title || 'Música').replace(/[/\\?%*:|"<>]/g, '-');
  const safeArtist = (queueItem.artist || 'Artista').replace(/[/\\?%*:|"<>]/g, '-');
  const songId = 'sp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  const newSong = {
    id: songId,
    title: queueItem.title,
    artist: queueItem.artist,
    album: queueItem.album || 'Single',
    duration: queueItem.duration || 0,
    fileBlob: audioBlob,
    fileType: audioBlob.type || 'audio/mp4',
    fileName: `${safeTitle} - ${safeArtist}.m4a`,
    fileSize: audioBlob.size,
    coverUrl: queueItem.coverUrl || null,
    coverBlob: null,
    isLiked: false,
    dateAdded: new Date().toISOString(),
  };

  const storeNames = queueItem.playlistId
    ? ['songs', 'downloadQueue', 'playlists']
    : ['songs', 'downloadQueue'];

  await new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);

    tx.objectStore('songs').put(newSong);

    const updatedQueueItem = {
      ...queueItem,
      status: 'completed',
      savedSongId: songId,
      completedAt: new Date().toISOString(),
    };
    tx.objectStore('downloadQueue').put(updatedQueueItem);

    if (queueItem.playlistId) {
      const pStore = tx.objectStore('playlists');
      const pReq = pStore.get(queueItem.playlistId);
      pReq.onsuccess = () => {
        const playlist = pReq.result;
        if (playlist) {
          if (!playlist.songIds) playlist.songIds = [];
          if (!playlist.songIds.includes(songId)) {
            playlist.songIds.push(songId);
            playlist.updatedAt = new Date().toISOString();
            pStore.put(playlist);
          }
        }
      };
    }
  });

  console.info(`Saved background download "${newSong.title}" directly to IndexedDB!`);
}

self.addEventListener('backgroundfetchsuccess', (event) => {
  const bgFetch = event.registration;
  event.waitUntil(
    (async () => {
      try {
        const records = await bgFetch.matchAll();
        const cache = await caches.open(BG_DOWNLOAD_CACHE);

        for (const record of records) {
          const response = await record.responseReady;
          if (response && response.ok) {
            // Save in cache storage as reliable fallback
            await cache.put(`/bg-download/${bgFetch.id}`, response.clone());

            // Save directly into IndexedDB so it's ready in the music library
            try {
              const audioBlob = await response.blob();
              await saveBgDownloadToIndexedDB(bgFetch.id, audioBlob);
              // Clean up cache once written to IndexedDB
              await cache.delete(`/bg-download/${bgFetch.id}`);
            } catch (idbErr) {
              console.warn('Could not write directly to IndexedDB, keeping in cache:', idbErr);
            }
          }
        }

        // Notify active window clients
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach((client) => {
          client.postMessage({
            type: 'BG_FETCH_SUCCESS',
            id: bgFetch.id,
          });
        });
      } catch (err) {
        console.warn('Error processing background fetch success:', err);
      }
    })()
  );
});

self.addEventListener('backgroundfetchfail', (event) => {
  console.warn('Background fetch failed:', event.registration.id);
  event.waitUntil(
    (async () => {
      try {
        const db = await openIndexedDB();
        const tx = db.transaction('downloadQueue', 'readwrite');
        const store = tx.objectStore('downloadQueue');
        const req = store.get(event.registration.id);
        req.onsuccess = () => {
          const item = req.result;
          if (item) {
            item.status = 'failed';
            item.error = 'Download interrompido pelo sistema';
            item.failedAt = new Date().toISOString();
            store.put(item);
          }
        };
      } catch (e) {}

      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => {
        client.postMessage({
          type: 'BG_FETCH_FAIL',
          id: event.registration.id,
        });
      });
    })()
  );
});

self.addEventListener('backgroundfetchabort', (event) => {
  console.info('Background fetch aborted:', event.registration.id);
  event.waitUntil(
    (async () => {
      try {
        const db = await openIndexedDB();
        const tx = db.transaction('downloadQueue', 'readwrite');
        const store = tx.objectStore('downloadQueue');
        const req = store.get(event.registration.id);
        req.onsuccess = () => {
          const item = req.result;
          if (item) {
            item.status = 'pending';
            store.put(item);
          }
        };
      } catch (e) {}
    })()
  );
});

