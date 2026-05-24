// js/sw-register.js (VERSIÓN CORREGIDA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // ¡¡¡EL CAMBIO MÁGICO ESTÁ AQUÍ!!!
    // Al añadir '?v=2', el navegador cree que es un archivo nuevo y lo descarga otra vez.
    // Cada vez que hagas cambios importantes, cambia este número (v=3, v=4, etc.)
    navigator.serviceWorker.register('sw.js?v=3')
      .then(registration => {
        console.log('✅ Service Worker registrado con éxito.');
      })
      .catch(error => {
        console.error('❌ Error al registrar el Service Worker:', error);
      });
  });
}
