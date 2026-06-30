const CACHE_NAME = "mi-garaje-v3"; // 🔥 Cambia la versión para forzar actualización
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

// 🔥 Nueva: URLs de imágenes que NO deben cachearse en alta resolución
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg)$/i;

// Instalación
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📦 Cacheando recursos estáticos (v2)...");
      return cache.addAll(ASSETS).catch((err) => {
        console.error("❌ Error cacheando recursos:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activación: limpiar caches antiguas
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("🗑️ Eliminando cache antigua:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercepción de fetch - CORREGIDA
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  
  // 🔥 Estrategia: "Stale-While-Revalidate" para imágenes
  // Primero devuelve la caché (si existe), luego actualiza en segundo plano
  if (IMAGE_EXTENSIONS.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        // 🔥 Si está en caché, devuélvela PERO actualiza en segundo plano
        const fetchPromise = fetch(e.request)
          .then((res) => {
            if (res && res.status === 200) {
              const resClone = res.clone();
              caches.open(CACHE_NAME).then((cache) => {
                // 🔥 Guarda la imagen, pero solo si es menor a 500 KB
                // (evita cachear imágenes demasiado pesadas)
                const contentLength = res.headers.get("content-length");
                if (contentLength && parseInt(contentLength) < 500 * 1024) {
                  cache.put(e.request, resClone);
                }
              });
            }
            return res;
          })
          .catch(() => {
            // Si falla la red, devuelve un placeholder en lugar de icon-192.png
            return new Response(
              `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
                <rect width="400" height="400" fill="#EAEDED"/>
                <text x="200" y="200" font-family="Arial" font-size="20" fill="#565959" text-anchor="middle" dominant-baseline="central">
                  🖼️
                </text>
              </svg>`,
              {
                headers: { "Content-Type": "image/svg+xml" },
              }
            );
          });

        // 🔥 Si hay caché, devuélvela inmediatamente y actualiza en segundo plano
        if (cached) {
          // Actualizar en segundo plano sin esperar
          e.waitUntil(fetchPromise.catch(() => {}));
          return cached;
        }
        return fetchPromise;
      })
    );
    return;
  }

  // 🔥 Para el resto de recursos (HTML, CSS, JS): estrategia "Network First"
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, resClone);
        });
        return res;
      })
      .catch(() => {
        return caches.match(e.request);
      })
  );
});
