const CACHE_NAME = 'musyrif-app-v11';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './output.css',
  './config.js',
  './utils.js',
  './state.js',
  './constants.js',
  './data-kelas.js',
  './data-santri.js',
  './santri-manager.js',
  './app-core.js',
  './app-features.js',
  './main.js',
  './manifest.json'
  // KITA HAPUS LINK EKSTERNAL (Tailwind, Lucide, Supabase) DARI SINI
  // Karena server mereka menolak di-cache oleh Service Worker secara langsung (CORS Error)
];

// 1. Install Service Worker & Cache File
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use Promise.allSettled to handle individual file failures gracefully
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url))
      ).then(results => {
        // Log any failures with the correct URLs
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.warn(`Failed to cache ${ASSETS_TO_CACHE[index]}:`, result.reason);
          }
        });
        
        const failureCount = results.filter(r => r.status === 'rejected').length;
        if (failureCount > 0) {
          console.warn(`Total failed to cache: ${failureCount} of ${ASSETS_TO_CACHE.length} assets`);
        }
        
        // Continue even if some files failed to cache
        return Promise.resolve();
      });
    })
  );
});

// 2. Activate & Hapus Cache Lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// 3. Fetch Strategy: Cache First, then Network
self.addEventListener('fetch', (event) => {
  // Cek apakah request menuju ke file eksternal (http/https)
  if (event.request.url.startsWith('http')) {
     // Gunakan strategi Network First untuk file eksternal agar tidak error CORS
     event.respondWith(
        fetch(event.request).catch((error) => {
            // Proper error handling: Return a valid Response object
            console.error('Fetch failed for', event.request.url, error);
            
            // Try to return cached version if available
            return caches.match(event.request).then((response) => {
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
  } else {
     // Untuk file lokal, gunakan Cache First (sesuai kode lama)
     event.respondWith(
        caches.match(event.request).then((response) => {
          return response || fetch(event.request).catch((error) => {
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
