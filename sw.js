const CACHE_NAME = 'mi-garaje-v3';
const ARCHIVOS_PRECACHE = [
  '/',
  '/index.html',
  '/404.html',
  '/css/style.css',
  '/js/app.js',
  '/js/sw-register.js',
  '/manifest.json',
  '/data/productos.json'
];

self.addEventListener('install', event => {
  console.log('Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ARCHIVOS_PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Activando Service Worker...');
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Para navegación (cuando se escribe una ruta), siempre devolver index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }
  
  // Para todo lo demás: caché primero
  event.respondWith(
    caches.match(event.request).then(respuesta => {
      if (respuesta) return respuesta;
      
      return fetch(event.request).then(respuestaRed => {
        if (respuestaRed && respuestaRed.status === 200) {
          const copia = respuestaRed.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copia));
        }
        return respuestaRed;
      });
    })
  );
});
