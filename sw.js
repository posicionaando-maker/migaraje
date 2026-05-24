// ==================================================
// sw.js - SERVICE WORKER
// CORREGIDO: Rutas relativas con './' para el precaché
// ==================================================

const CACHE_NAME = 'mi-garaje-v1';

// CORREGIDO: Archivos a precachear con rutas relativas
const ARCHIVOS_PRECACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/sw-register.js',
  './manifest.json',
  './data/productos.json'
];

// INSTALACIÓN
self.addEventListener('install', event => {
  console.log('🛠️ Service Worker instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Archivos precacheados');
        return cache.addAll(ARCHIVOS_PRECACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// ACTIVACIÓN
self.addEventListener('activate', event => {
  console.log('⚡ Service Worker activado');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('🗑️ Eliminando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// FETCH (Sin cambios mayores, pero las URLs se manejan solas)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  if (url.pathname.includes('/images/')) {
    event.respondWith(
      caches.match(event.request).then(respuestaCache => {
        if (respuestaCache) {
          fetch(event.request).then(respuestaRed => {
            if (respuestaRed && respuestaRed.status === 200) {
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, respuestaRed));
            }
          }).catch(() => {});
          return respuestaCache;
        }
        return fetch(event.request).then(respuestaRed => {
          const copia = respuestaRed.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copia));
          return respuestaRed;
        }).catch(() => caches.match('/icons/icon-192.png'));
      })
    );
  }
  else if (url.pathname.includes('/data/')) {
    event.respondWith(
      caches.match(event.request).then(respuestaCache => {
        const respuestaRed = fetch(event.request).then(respuestaRed => {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, respuestaRed.clone()));
          return respuestaRed;
        }).catch(() => respuestaCache);
        return respuestaCache || respuestaRed;
      })
    );
  }
  else {
    event.respondWith(
      caches.match(event.request).then(respuestaCache => {
        return respuestaCache || fetch(event.request).then(respuestaRed => {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, respuestaRed.clone()));
          return respuestaRed;
        });
      }).catch(() => {
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        return new Response('Offline', { status: 503 });
      })
    );
  }
});
