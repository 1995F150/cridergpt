// CriderGPT Service Worker for Offline Support - v4.9.9
const CACHE_VERSION = 'v4.9.9';
const STATIC_CACHE = `cridergpt-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `cridergpt-dynamic-${CACHE_VERSION}`;
const OFFLINE_PAGE = '/offline.html';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/favicon.png',
  '/favicon.ico',
  '/manifest.json'
];

// API endpoints that should not be cached
const NO_CACHE_PATTERNS = [
  /supabase\.co/,
  /stripe\.com/,
  /analytics/,
  /functions/,
  /\.js$/,
  /\.css$/,
  /\.html$/
];

// Install event - cache static assets with new version
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v4.9.9...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => {
          return new Request(url, { cache: 'reload' });
        })).catch(err => {
          console.log('[SW] Some static assets failed to cache:', err);
        });
      })
      .then(() => {
        console.log('[SW] Skip waiting - activate immediately');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches immediately
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v4.9.9...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Delete ALL old caches that don't match current version
            return name.startsWith('cridergpt-') && 
                   name !== STATIC_CACHE && 
                   name !== DYNAMIC_CACHE;
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Claiming all clients');
      // Take control of all pages immediately
      return self.clients.claim();
    }).then(() => {
      // Notify all clients that a new version is active
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
        });
      });
    })
  );
});

// Fetch event - NETWORK FIRST strategy for HTML/JS/CSS
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) schemes
  if (!request.url.startsWith('http')) {
    return;
  }

  // Skip API calls that shouldn't be cached
  if (NO_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    // For JS/CSS/HTML - use network first with cache fallback
    if (/\.(js|css|html)$/.test(request.url) || request.url.endsWith('/')) {
      event.respondWith(
        fetch(request, { cache: 'no-store' })
          .then(response => {
            // Don't cache these - always get fresh
            return response;
          })
          .catch(() => {
            // Only fall back to cache if network fails
            return caches.match(request);
          })
      );
      return;
    }
    // For other no-cache patterns (APIs), just use network
    return;
  }

  // For navigation requests (HTML pages) - NETWORK FIRST
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => {
          return response;
        })
        .catch(() => {
          return caches.match(OFFLINE_PAGE);
        })
    );
    return;
  }

  // For static assets (images, fonts) - Cache first with network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          // Only cache successful responses for static assets
          if (networkResponse && networkResponse.status === 200) {
            // Only cache images, fonts, etc. - not scripts or styles
            const contentType = networkResponse.headers.get('content-type') || '';
            if (contentType.includes('image') || contentType.includes('font')) {
              const responseClone = networkResponse.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
          }
          return networkResponse;
        })
        .catch(() => {
          // Return a placeholder for failed image requests
          if (request.destination === 'image') {
            return new Response(
              '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#f0f0f0" width="100" height="100"/></svg>',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          }
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
    })
  );
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Clearing all caches');
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      // Notify that cache was cleared
      event.source?.postMessage({ type: 'CACHE_CLEARED' });
    });
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.source?.postMessage({ type: 'VERSION', version: CACHE_VERSION });
  }
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_REQUIRED' });
  });
}
