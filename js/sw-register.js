// ==================================================
// sw-register.js - REGISTRO DEL SERVICE WORKER
// Permite que la PWA funcione offline después de la primera carga
// ==================================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('✅ Service Worker registrado. La app funcionará offline.');
        
        // Detectar actualizaciones
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 Nueva versión detectada');
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('✅ Actualización disponible. Recarga la página.');
              // Podrías mostrar un mensaje al usuario aquí
            }
          });
        });
      })
      .catch(error => {
        console.error('❌ Error al registrar Service Worker:', error);
      });
  });
} else {
  console.warn('⚠️ Este navegador no soporta Service Workers. Modo offline no disponible.');
}