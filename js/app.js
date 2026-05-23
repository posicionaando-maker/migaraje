// ==================================================
// NUEVO: Manejo de rutas y PWA (añadir al principio de app.js)
// ==================================================

// Corregir navegación por hash si la PWA se abre con ruta extraña
(function fixRouting() {
  // Si la URL no es exactamente la raíz o index.html
  const url = window.location.href;
  const path = window.location.pathname;
  
  // Lista de rutas válidas (archivos reales)
  const rutasValidas = ['/', '/index.html', '/404.html', '/offline.html'];
  
  // Si es una ruta extraña (ej. /productos, /categoria, etc.) y NO es un archivo real
  if (!rutasValidas.includes(path) && !path.match(/\.(css|js|json|png|jpg|jpeg|gif|webp|svg|ico)$/)) {
    console.warn('⚠️ Ruta detectada:', path, '- Redirigiendo a /');
    // Redirigir a la raíz preservando el estado de la aplicación
    window.location.replace('/?ruta=' + encodeURIComponent(path));
  }
})();

// Detectar si la app se abrió desde la PWA instalada
function detectarModoInstalacion() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isPWA = isStandalone || (window.navigator.standalone === true);
  
  if (isPWA) {
    console.log('📱 App abierta desde PWA instalada');
  } else {
    console.log('🌐 App abierta desde navegador web');
  }
  
  // Registrar en el DOM (opcional, para depuración)
  const footer = document.querySelector('footer');
  if (footer && !document.getElementById('pwa-status')) {
    const statusSpan = document.createElement('div');
    statusSpan.id = 'pwa-status';
    statusSpan.style.fontSize = '10px';
    statusSpan.style.opacity = '0.5';
    statusSpan.style.marginTop = '10px';
    statusSpan.textContent = isPWA ? '📱 Modo PWA instalada' : '🌐 Modo web';
    footer.appendChild(statusSpan);
  }
}

// Forzar recarga del Service Worker si hay errores
function actualizarServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.update();
      console.log('🔄 Service Worker actualizado');
    });
  }
}

// Modificar la función cargarCatalogo() para manejar mejor el offline
// (Reemplaza tu función cargarCatalogo() existente con esta versión)
async function cargarCatalogo() {
  try {
    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = 'Conectando...';
    
    // Intentar cargar con timestamp para evitar caché corrupta
    const response = await fetch(`data/productos.json?t=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    progressFill.style.width = '30%';
    progressText.textContent = 'Descargando datos...';
    
    const nuevoData = await response.json();
    
    progressFill.style.width = '70%';
    progressText.textContent = 'Procesando productos...';
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    catalogoData = nuevoData;
    aplicarBusquedaYOrden();
    
    progressFill.style.width = '100%';
    progressText.textContent = '¡Listo!';
    
    setTimeout(() => {
      progressContainer.style.display = 'none';
    }, 500);
    
    actualizarStatusBar();
    
  } catch (error) {
    console.warn('Error cargando catálogo:', error);
    progressText.textContent = 'Usando caché local...';
    
    // Intentar recuperar de caché del Service Worker
    if ('caches' in window) {
      try {
        const cache = await caches.open('mi-garaje-v2');
        const cachedResponse = await cache.match('/data/productos.json');
        if (cachedResponse && cachedResponse.ok) {
          const cachedData = await cachedResponse.json();
          catalogoData = cachedData;
          aplicarBusquedaYOrden();
          progressText.textContent = '¡Cargado desde caché!';
          setTimeout(() => {
            progressContainer.style.display = 'none';
          }, 1000);
          actualizarStatusBar();
          return;
        }
      } catch (cacheError) {
        console.warn('Error leyendo caché:', cacheError);
      }
    }
    
    setTimeout(() => {
      progressContainer.style.display = 'none';
    }, 2000);
    
    if (!catalogoData) {
      productosContainer.innerHTML = '<div class="loading">No se pudo cargar el catálogo. Verifica tu conexión a internet.</div>';
    }
    actualizarStatusBar();
  }
}

// Modificar init() para incluir las nuevas funciones
const initOriginal = init;
window.init = function() {
  detectarModoInstalacion();
  actualizarServiceWorker();
  cargarVotosUsuario();
  cargarModoOscuro();
  cargarCatalogo();
};

// Reemplazar init
document.removeEventListener('DOMContentLoaded', init);
document.addEventListener('DOMContentLoaded', window.init);
