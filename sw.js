const CACHE_NAME = 'mi-garaje-v4';
const ARCHIVOS_PRECACHE = [
  '/',
  '/index.html',
  '/404.html',
  '/manifest.json',
  '/data/productos.json'
  // No incluyas todos los archivos aquí, se cachearán solos
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ARCHIVOS_PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  // Para navegación, siempre devolver index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }
  
  // Para todo lo demás: caché con actualización en segundo plano
  event.respondWith(
    caches.match(event.request).then(respuesta => {
      const fetchPromise = fetch(event.request).then(respuestaRed => {
        if (respuestaRed && respuestaRed.status === 200) {
          const copia = respuestaRed.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copia));
        }
        return respuestaRed;
      }).catch(() => respuesta);
      
      return respuesta || fetchPromise;
    })
  );
});
