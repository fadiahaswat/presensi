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

// 1. Install Service Worker & Cache File
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
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
