// ==================================================
// sw-register.js - REGISTRO DEL SERVICE WORKER
// Habilita la funcionalidad offline de la PWA
// Se ejecuta independientemente del resto de la app
// ==================================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('✅ Service Worker registrado. La app funcionará offline.');
        
        // Detectar actualizaciones del Service Worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 Nueva versión del Service Worker detectada');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('✅ Actualización disponible. Recarga la página para aplicar cambios.');
              // Podrías mostrar un mensaje al usuario aquí si quieres
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
