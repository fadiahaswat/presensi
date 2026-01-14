const CACHE_NAME = 'musyrif-app-v11'; // Naikkan versi cache agar browser mereset ulang
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './output.css',       // Ganti style.css ke output.css (sesuai index.html)
  './manifest.json',
  
  // Data & Config
  './config.js',
  './utils.js',
  './state.js',
  './constants.js',
  './data-kelas.js',
  './data-santri.js',
  './santri-manager.js',
  
  // App Logic (Masukkan semua file JS yang dipakai)
  './app-core.js',
  './app-features.js',
  './main.js'
  
  // HAPUS './script.js' karena file ini TIDAK ADA di folder/index.html Anda
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
