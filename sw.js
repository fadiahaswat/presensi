const CACHE_NAME = 'musyrif-app-v10';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './santri-manager.js',
  './data-santri.js',
  './data-kelas.js',
  './manifest.json'
  // KITA HAPUS LINK EKSTERNAL (Tailwind, Lucide, Supabase) DARI SINI
  // Karena server mereka menolak di-cache oleh Service Worker secara langsung (CORS Error)
];

// 1. Install Service Worker & Cache File with Error Handling
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use Promise.allSettled to handle individual failures gracefully
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => 
          cache.add(url).catch(error => {
            console.warn(`Failed to cache ${url}:`, error.message);
            // Don't fail installation if one resource fails
            return null;
          })
        )
      ).then(results => {
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) {
          console.warn(`Service Worker installed with ${failed.length} cache failures`);
        } else {
          console.log('Service Worker installed successfully with all assets cached');
        }
      });
    }).catch(error => {
      console.error('Failed to open cache during install:', error);
      // Allow installation to proceed even if caching fails
    })
  );
  // Force activate immediately
  self.skipWaiting();
});

// 2. Activate & Hapus Cache Lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// 3. Fetch Strategy: Network First for External, Cache First for Local
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Cek apakah request menuju ke file eksternal (http/https)
  if (url.protocol === 'http:' || url.protocol === 'https:') {
    // Detect if it's a Supabase API request - use more specific check
    const isSupabaseRequest = url.hostname.endsWith('.supabase.co') || url.hostname === 'supabase.co';
    
    if (isSupabaseRequest) {
      // For Supabase: Network-only, never cache API responses
      event.respondWith(
        fetch(event.request)
          .catch(error => {
            console.error('Supabase fetch failed:', error.message);
            // Return a more informative error response
            return new Response(
              JSON.stringify({ 
                error: 'Network Error', 
                message: 'Unable to connect to Supabase. Please check your internet connection.',
                details: error.message 
              }), 
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                  'Content-Type': 'application/json'
                })
              }
            );
          })
      );
    } else {
      // For other external resources: Network First, then Cache
      event.respondWith(
        fetch(event.request)
          .then(response => {
            // Clone response to cache it
            if (response && response.status === 200 && response.type !== 'opaque') {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseToCache).catch(err => {
                  console.warn('Failed to cache response:', err.message);
                });
              });
            }
            return response;
          })
          .catch(error => {
            console.warn('Network fetch failed for', url.href, '- trying cache');
            
            // Try to return cached version if available
            return caches.match(event.request).then(response => {
              if (response) {
                return response;
              }
              
              // Return a proper offline response
              return new Response('Offline - Resource not available', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                  'Content-Type': 'text/plain'
                })
              });
            });
          })
      );
    }
  } else {
    // Untuk file lokal, gunakan Cache First
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then(response => {
            // Cache the new response
            if (response && response.status === 200) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseToCache);
              });
            }
            return response;
          })
          .catch(error => {
            console.error('Fetch failed for local resource', event.request.url, error);
            
            // Return a proper error response for local resources
            return new Response('Resource not found', {
              status: 404,
              statusText: 'Not Found',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
    );
  }
});
