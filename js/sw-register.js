// ==================================================
// sw-register.js - REGISTRO DEL SERVICE WORKER
// CORREGIDO: Ruta relativa 'sw.js'
// ==================================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // CORREGIDO: 'sw.js' en lugar de '/sw.js'
    navigator.serviceWorker.register('sw.js')
      .then(registration => {
        console.log('✅ Service Worker registrado con éxito. Alcance:', registration.scope);
      })
      .catch(error => {
        console.error('❌ Error al registrar el Service Worker:', error);
      });
  });
} else {
  console.warn('⚠️ Este navegador no soporta Service Workers.');
}
