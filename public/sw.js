const CACHE_NAME = 'presensi-muallimin-v6';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.webp',
  '/app-icon.png'
];

// Handle messages from the client app (e.g. SKIP_WAITING or CLEAR_CACHES)
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data === 'SKIP_WAITING' || event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'CLEAR_CACHES' || event.data.type === 'CLEAR_CACHES') {
    caches.keys().then((names) => {
      return Promise.all(names.map((name) => caches.delete(name)));
    }).then(() => {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: true });
      }
    });
  }
});

// Install event: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Cache addAll warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate event: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// External API hosts that should not be intercepted by service worker
const EXTERNAL_API_HOSTS = [
  'worldtimeapi.org',
  'timeapi.io',
  'google.com',
  'googleapis.com',
  'googleusercontent.com',
  'script.google.com',
  'script.googleusercontent.com',
  'accounts.google.com',
  'lh3.googleusercontent.com',
  'syamsa.web.app',
  'syamsa.firebaseapp.com',
];

// Check if request should bypass service worker caching
function shouldBypassCache(request) {
  const url = new URL(request.url);
  // Never cache version.json so update checks are always 100% fresh from server
  if (url.pathname.endsWith('/version.json')) {
    return true;
  }
  // Bypass for same-origin navigation and assets
  if (url.origin === self.location.origin) {
    return false;
  }
  // Bypass for known external APIs
  return EXTERNAL_API_HOSTS.some(host => url.hostname.includes(host));
}

// Fetch event: Network first with Cache fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Bypass external API calls - let them go directly to network
  if (shouldBypassCache(event.request)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html') || caches.match('/presensi/index.html');
          }
        });
      })
  );
});
