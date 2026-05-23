// ==================================================
// sw.js - SERVICE WORKER PARA MI GARAJE
// Estrategia: cache-first para recursos estáticos y datos
// Permite navegación completa sin internet
// ==================================================

const CACHE_NAME = 'mi-garaje-v2';

// Archivos a precachear durante la instalación
const ARCHIVOS_PRECACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/sw-register.js',
  '/manifest.json',
  '/data/productos.json'
];

// Instalación: guardar archivos críticos
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

// Activación: limpiar cachés viejas
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

// Interceptar peticiones: cache-first para todo
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Para imágenes: cache-first, actualizar en segundo plano
  if (url.pathname.includes('/images/')) {
    event.respondWith(
      caches.match(event.request).then(respuestaCache => {
        const respuestaRed = fetch(event.request).then(respuestaRed => {
          const copia = respuestaRed.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, copia);
          });
          return respuestaRed;
        }).catch(() => {
          // Fallback: imagen por defecto si no hay caché ni red
          return caches.match('/icons/icon-192.png');
        });
        
        return respuestaCache || respuestaRed;
      })
    );
  } 
  // Para JSON (productos): cache-first, revalidar en segundo plano
  else if (url.pathname.includes('/data/')) {
    event.respondWith(
      caches.match(event.request).then(respuestaCache => {
        const respuestaRed = fetch(event.request).then(respuestaRed => {
          const copia = respuestaRed.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, copia);
          });
          return respuestaRed;
        }).catch(() => {
          // Si no hay red, devolver caché (puede ser vieja, pero algo)
          return respuestaCache;
        });
        
        return respuestaCache || respuestaRed;
      })
    );
  }
  // Para HTML, CSS, JS: cache-first
  else {
    event.respondWith(
      caches.match(event.request).then(respuestaCache => {
        return respuestaCache || fetch(event.request).then(respuestaRed => {
          const copia = respuestaRed.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, copia);
          });
          return respuestaRed;
        });
      }).catch(() => {
        // Si todo falla y es navegación, mostrar index.html
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Offline - No se pudo cargar el recurso', { status: 503 });
      })
    );
  }
});
