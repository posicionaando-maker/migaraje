// ==================================================
// app.js - MI GARAJE
// Lógica completa: carga JSON, paginación, búsqueda, 
// ordenamiento, valoración con estrellas, modo oscuro,
// sección admin, modal de productos
// ==================================================

// ---------- VARIABLES GLOBALES ----------
let catalogoData = null;           // Datos completos del JSON
let productosFiltrados = [];       // Productos después de aplicar búsqueda
let paginaActual = 1;
let productosPorPagina = 10;
let ordenActual = 'fecha';         // 'fecha', 'puntuacion', 'precio'
let busquedaActiva = '';           // Texto de búsqueda actual
let votosUsuario = {};              // Guarda los votos del usuario {id: puntuacion}
let modoOscuro = false;            // Estado del modo oscuro

// DOM elements
const productosContainer = document.getElementById('productosContainer');
const paginationContainer = document.getElementById('paginationContainer');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');
const searchToggle = document.getElementById('searchToggle');
const searchContainer = document.getElementById('searchContainer');
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const resultCount = document.getElementById('resultCount');
const sortFechaBtn = document.getElementById('sortFecha');
const sortPuntuacionBtn = document.getElementById('sortPuntuacion');
const sortPrecioBtn = document.getElementById('sortPrecio');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modalBody');
const closeModal = document.querySelector('.close-modal');
const adminModal = document.getElementById('adminModal');
const closeAdminModal = document.querySelector('.close-admin-modal');
const darkModeToggle = document.getElementById('darkModeToggle');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const offlineMsg = document.getElementById('offlineMsg');
const mainTitle = document.getElementById('mainTitle');

// ---------- FUNCIONES DE INICIALIZACIÓN ----------

// Cargar votos del usuario desde localStorage
function cargarVotosUsuario() {
  const guardados = localStorage.getItem('votosUsuario');
  if (guardados) {
    votosUsuario = JSON.parse(guardados);
  }
}

// Guardar un voto del usuario
function guardarVoto(productoId, puntuacion) {
  votosUsuario[productoId] = puntuacion;
  localStorage.setItem('votosUsuario', JSON.stringify(votosUsuario));
}

// Verificar si el usuario ya votó un producto
function yaVoto(productoId) {
  return votosUsuario.hasOwnProperty(productoId);
}

// Obtener puntuación del usuario para un producto (si votó)
function obtenerVotoUsuario(productoId) {
  return votosUsuario[productoId] || null;
}

// Cargar preferencia de modo oscuro
function cargarModoOscuro() {
  const guardado = localStorage.getItem('modoOscuro');
  if (guardado === 'true') {
    modoOscuro = true;
    document.body.classList.add('dark-mode');
    darkModeToggle.textContent = '☀️';
  } else {
    modoOscuro = false;
    document.body.classList.remove('dark-mode');
    darkModeToggle.textContent = '🌙';
  }
}

// Guardar preferencia de modo oscuro
function guardarModoOscuro() {
  localStorage.setItem('modoOscuro', modoOscuro);
}

// Alternar modo oscuro
function toggleModoOscuro() {
  modoOscuro = !modoOscuro;
  if (modoOscuro) {
    document.body.classList.add('dark-mode');
    darkModeToggle.textContent = '☀️';
  } else {
    document.body.classList.remove('dark-mode');
    darkModeToggle.textContent = '🌙';
  }
  guardarModoOscuro();
}

// ---------- FUNCIONES DE ORDENAMIENTO ----------

// Ordenar productos según el criterio actual
function ordenarProductos(productos) {
  const productosCopy = [...productos];
  
  switch(ordenActual) {
    case 'fecha':
      // Más reciente primero (fecha más reciente arriba)
      return productosCopy.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    case 'puntuacion':
      // Más votado primero
      return productosCopy.sort((a, b) => b.puntuacion - a.puntuacion);
    case 'precio':
      // Menor precio primero
      return productosCopy.sort((a, b) => a.precioCUP - b.precioCUP);
    default:
      return productosCopy;
  }
}

// Cambiar orden y refrescar
function setOrden(tipo) {
  ordenActual = tipo;
  
  // Actualizar estilos visuales de los botones
  sortFechaBtn.classList.remove('active');
  sortPuntuacionBtn.classList.remove('active');
  sortPrecioBtn.classList.remove('active');
  
  if (tipo === 'fecha') sortFechaBtn.classList.add('active');
  if (tipo === 'puntuacion') sortPuntuacionBtn.classList.add('active');
  if (tipo === 'precio') sortPrecioBtn.classList.add('active');
  
  // Aplicar búsqueda y orden
  aplicarBusquedaYOrden();
}

// ---------- FUNCIONES DE BÚSQUEDA ----------

// Filtrar productos por texto de búsqueda (nombre o descripción)
function filtrarPorBusqueda(productos) {
  if (!busquedaActiva.trim()) return productos;
  
  const termino = busquedaActiva.toLowerCase().trim();
  return productos.filter(p => 
    p.nombre.toLowerCase().includes(termino) || 
    p.descripcion.toLowerCase().includes(termino)
  );
}

// Aplicar búsqueda, orden y actualizar todo
function aplicarBusquedaYOrden() {
  if (!catalogoData) return;
  
  // Filtrar por búsqueda
  let productos = filtrarPorBusqueda(catalogoData.productos);
  
  // Ordenar
  productosFiltrados = ordenarProductos(productos);
  
  // Actualizar contador de resultados
  const total = productosFiltrados.length;
  resultCount.textContent = `${total} producto${total !== 1 ? 's' : ''}`;
  
  // Resetear a página 1
  paginaActual = 1;
  
  // Renderizar productos y paginación
  renderizarProductos();
  renderizarPaginacion();
}

// ---------- FUNCIONES DE PAGINACIÓN ----------

function renderizarPaginacion() {
  const totalProductos = productosFiltrados.length;
  const totalPaginas = Math.ceil(totalProductos / productosPorPagina);
  
  if (totalPaginas <= 1) {
    paginationContainer.style.display = 'none';
    return;
  }
  
  paginationContainer.style.display = 'flex';
  pageInfo.textContent = `Página ${paginaActual} de ${totalPaginas} · Mostrando ${Math.min(productosPorPagina, totalProductos - (paginaActual-1)*productosPorPagina)} de ${totalProductos} productos`;
  
  prevPageBtn.disabled = (paginaActual === 1);
  nextPageBtn.disabled = (paginaActual === totalPaginas);
}

function cambiarPagina(delta) {
  const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);
  const nuevaPagina = paginaActual + delta;
  
  if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
    paginaActual = nuevaPagina;
    renderizarProductos();
    renderizarPaginacion();
    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ---------- RENDERIZADO DE PRODUCTOS ----------

// Generar HTML de las estrellas para un producto
function generarEstrellas(producto, productoId) {
  const votado = yaVoto(productoId);
  const votoUsuario = obtenerVotoUsuario(productoId);
  // Mostrar puntuación global (del JSON) o la del usuario si votó localmente
  const puntuacionMostrar = votoUsuario || producto.puntuacion;
  const votosMostrar = votoUsuario ? 1 : producto.votos;
  
  // Generar 5 estrellas visuales
  let estrellasHTML = '';
  const puntuacionEntera = Math.round(puntuacionMostrar);
  
  for (let i = 1; i <= 5; i++) {
    const clase = i <= puntuacionEntera ? 'llena' : 'vacia';
    const valor = i;
    if (votado) {
      estrellasHTML += `<span class="estrella ${clase}" data-valor="${valor}">★</span>`;
    } else {
      estrellasHTML += `<span class="estrella ${clase}" data-valor="${valor}" style="cursor:pointer;">★</span>`;
    }
  }
  
  const claseClick = votado ? 'votado' : '';
  
  return `
    <div class="estrellas-container">
      <div class="estrellas ${claseClick}" data-id="${productoId}">
        ${estrellasHTML}
      </div>
      <span class="puntuacion-texto">⭐ ${puntuacionMostrar.toFixed(1)} (${votosMostrar} ${votosMostrar === 1 ? 'voto' : 'votos'})</span>
    </div>
  `;
}

// Renderizar una tarjeta de producto
function renderizarProducto(producto) {
  const precioDisplay = `${producto.precioCUP} CUP (≈${producto.precioUSD} USD / transferencia)`;
  
  return `
    <div class="producto-card" data-id="${producto.id}">
      <img class="producto-imagen" src="${producto.imagen}" alt="${producto.nombre}" loading="lazy" 
           onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23ddd%22/%3E%3Ctext x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3ESin imagen%3C/text%3E%3C/svg%3E'">
      <div class="producto-info">
        <div class="producto-nombre">${producto.nombre}</div>
        <div class="producto-precio">${precioDisplay}</div>
        <div class="producto-descripcion">${producto.descripcion.substring(0, 100)}${producto.descripcion.length > 100 ? '...' : ''}</div>
        ${generarEstrellas(producto, producto.id)}
        <div class="card-buttons">
          <button class="ver-mas-btn" data-id="${producto.id}">Ver más</button>
          <a href="#" class="whatsapp-btn" data-id="${producto.id}" data-nombre="${producto.nombre}">💬 WhatsApp</a>
        </div>
      </div>
    </div>
  `;
}

// Renderizar todos los productos de la página actual
function renderizarProductos() {
  if (!productosFiltrados || productosFiltrados.length === 0) {
    productosContainer.innerHTML = '<div class="loading">No se encontraron productos. Pronto añadiremos más hallazgos.</div>';
    return;
  }
  
  const inicio = (paginaActual - 1) * productosPorPagina;
  const fin = inicio + productosPorPagina;
  const productosPagina = productosFiltrados.slice(inicio, fin);
  
  productosContainer.innerHTML = productosPagina.map(p => renderizarProducto(p)).join('');
  
  // Asignar eventos a los botones
  document.querySelectorAll('.ver-mas-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = btn.getAttribute('data-id');
      abrirModal(id);
    });
  });
  
  document.querySelectorAll('.whatsapp-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.getAttribute('data-id');
      const nombre = btn.getAttribute('data-nombre');
      abrirWhatsApp(id, nombre);
    });
  });
  
  // Asignar eventos a las estrellas (solo si no están votadas)
  document.querySelectorAll('.estrellas:not(.votado)').forEach(estrellaContainer => {
    const productoId = estrellaContainer.getAttribute('data-id');
    const estrellas = estrellaContainer.querySelectorAll('.estrella');
    
    estrellas.forEach(estrella => {
      estrella.addEventListener('click', (e) => {
        e.stopPropagation();
        const valor = parseInt(estrella.getAttribute('data-valor'));
        registrarVoto(productoId, valor);
      });
    });
  });
}

// Registrar un voto de usuario
function registrarVoto(productoId, puntuacion) {
  // Verificar que no haya votado antes
  if (yaVoto(productoId)) {
    alert('Ya valoraste este producto. ¡Gracias!');
    return;
  }
  
  // Guardar voto
  guardarVoto(productoId, puntuacion);
  
  // Actualizar la interfaz (re-renderizar productos actuales)
  renderizarProductos();
  
  // Si el modal está abierto, actualizarlo también
  if (modal.style.display === 'block') {
    const productoActual = catalogoData.productos.find(p => p.id === productoId);
    if (productoActual) {
      abrirModal(productoId); // Recargar modal
    }
  }
}

// ---------- MODAL DE PRODUCTO ----------

function abrirModal(productoId) {
  const producto = catalogoData.productos.find(p => p.id === productoId);
  if (!producto) return;
  
  const precioDisplay = `${producto.precioCUP} CUP (≈${producto.precioUSD} USD / transferencia)`;
  const votado = yaVoto(productoId);
  const votoUsuario = obtenerVotoUsuario(productoId);
  const puntuacionMostrar = votoUsuario || producto.puntuacion;
  
  modalBody.innerHTML = `
    <img class="modal-imagen" src="${producto.imagen}" alt="${producto.nombre}" 
         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23ddd%22/%3E%3Ctext x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3ESin imagen%3C/text%3E%3C/svg%3E'">
    <h2>${producto.nombre}</h2>
    <p><strong>Precio:</strong> ${precioDisplay}</p>
    <p><strong>Descripción:</strong> ${producto.descripcion}</p>
    <p><strong>Fecha de publicación:</strong> ${producto.fecha}</p>
    ${generarEstrellas(producto, productoId)}
    <div class="modal-botones">
      <a href="#" class="whatsapp-btn" id="modalWhatsAppBtn" style="flex:1;">💬 Consultar por WhatsApp</a>
      <button class="ver-mas-btn" id="cerrarModalBtn" style="flex:1;">← Volver al catálogo</button>
    </div>
  `;
  
  modal.style.display = 'block';
  
  // Evento WhatsApp del modal
  const modalWhatsBtn = document.getElementById('modalWhatsAppBtn');
  if (modalWhatsBtn) {
    modalWhatsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      abrirWhatsApp(producto.id, producto.nombre);
    });
  }
  
  // Evento cerrar modal
  const cerrarBtn = document.getElementById('cerrarModalBtn');
  if (cerrarBtn) {
    cerrarBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }
  
  // Evento estrellas dentro del modal
  const estrellasModal = modalBody.querySelector('.estrellas:not(.votado)');
  if (estrellasModal && !votado) {
    const estrellas = estrellasModal.querySelectorAll('.estrella');
    estrellas.forEach(estrella => {
      estrella.addEventListener('click', (e) => {
        const valor = parseInt(estrella.getAttribute('data-valor'));
        registrarVoto(productoId, valor);
      });
    });
  }
}

// Cerrar modal con X o clic fuera
closeModal.addEventListener('click', () => {
  modal.style.display = 'none';
});
window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
  }
  if (e.target === adminModal) {
    adminModal.style.display = 'none';
  }
});

// ---------- WHATSAPP ----------

function abrirWhatsApp(productoId, productoNombre) {
  if (!catalogoData) return;
  const numero = catalogoData.whatsappNumber;
  // Mensaje SIN precio (como solicitaste)
  const mensaje = `Hola, me interesa el producto: ${productoNombre}. ¿Está disponible?`;
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank'); // Nueva pestaña
}

// ---------- CARGA DEL CATÁLOGO CON PROGRESO ----------

async function cargarCatalogo() {
  try {
    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = 'Conectando...';
    
    const response = await fetch(`data/productos.json?t=${Date.now()}`);
    if (!response.ok) throw new Error('Error HTTP');
    
    // Simular progreso (no podemos saber tamaño exacto, pero damos feedback)
    progressFill.style.width = '30%';
    progressText.textContent = 'Descargando datos...';
    
    const nuevoData = await response.json();
    
    progressFill.style.width = '70%';
    progressText.textContent = 'Procesando productos...';
    
    // Pequeña pausa para que se vea el progreso (opcional)
    await new Promise(resolve => setTimeout(resolve, 200));
    
    catalogoData = nuevoData;
    
    // Aplicar búsqueda y orden inicial
    aplicarBusquedaYOrden();
    
    progressFill.style.width = '100%';
    progressText.textContent = '¡Listo!';
    
    setTimeout(() => {
      progressContainer.style.display = 'none';
    }, 500);
    
    actualizarStatusBar();
    
  } catch (error) {
    console.warn('Error cargando catálogo:', error);
    progressText.textContent = 'Error al cargar. Usando caché local.';
    setTimeout(() => {
      progressContainer.style.display = 'none';
    }, 2000);
    
    if (!catalogoData) {
      productosContainer.innerHTML = '<div class="loading">No se pudo cargar el catálogo. Verifica tu conexión a internet.</div>';
    }
    actualizarStatusBar();
  }
}

// ---------- ADMIN: SECCIÓN SECRETA (doble clic en título) ----------

function mostrarAdminStats() {
  if (!catalogoData || !catalogoData.productos) return;
  
  const productos = catalogoData.productos;
  const statsHTML = `
    <table class="stats-table">
      <thead>
        <tr><th>Producto</th><th>Votos locales</th><th>Promedio local</th><th>Votos globales</th><th>Puntuación global</th></tr>
      </thead>
      <tbody>
        ${productos.map(p => {
          const votoLocal = votosUsuario[p.id] || null;
          const tieneVotoLocal = votoLocal !== null;
          return `
            <tr>
              <td>${p.nombre}</td>
              <td>${tieneVotoLocal ? '1' : '0'}</td>
              <td>${tieneVotoLocal ? votoLocal.toFixed(1) : '—'}</td>
              <td>${p.votos}</td>
              <td>${p.puntuacion.toFixed(1)} ⭐</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    <p><small>Nota: Los votos locales son solo de este dispositivo. Úsalos para actualizar los puntajes globales en el JSON.</small></p>
  `;
  
  document.getElementById('adminStats').innerHTML = statsHTML;
  adminModal.style.display = 'block';
}

// Copiar estadísticas al portapapeles
document.getElementById('copyStatsBtn')?.addEventListener('click', () => {
  let texto = 'Producto\tVoto local\tPromedio local\tVotos globales\tPuntuación global\n';
  catalogoData.productos.forEach(p => {
    const votoLocal = votosUsuario[p.id] || null;
    texto += `${p.nombre}\t${votoLocal ? 1 : 0}\t${votoLocal || '—'}\t${p.votos}\t${p.puntuacion}\n`;
  });
  navigator.clipboard.writeText(texto);
  alert('Estadísticas copiadas al portapapeles');
});

// Cerrar modal admin
if (closeAdminModal) {
  closeAdminModal.addEventListener('click', () => {
    adminModal.style.display = 'none';
  });
}

// Detectar doble clic en el título
mainTitle.addEventListener('dblclick', () => {
  mostrarAdminStats();
});

// ---------- ESTADO DE CONEXIÓN ----------

function actualizarStatusBar() {
  if (navigator.onLine) {
    offlineMsg.style.display = 'none';
  } else {
    offlineMsg.style.display = 'block';
  }
}

window.addEventListener('online', () => {
  actualizarStatusBar();
  cargarCatalogo(); // Reintentar carga
});
window.addEventListener('offline', actualizarStatusBar);

// ---------- BUSCADOR (lupa desplegable) ----------

searchToggle.addEventListener('click', () => {
  if (searchContainer.style.display === 'none') {
    searchContainer.style.display = 'flex';
    searchInput.focus();
  } else {
    searchContainer.style.display = 'none';
    if (busquedaActiva) {
      // Limpiar búsqueda si se cierra
      busquedaActiva = '';
      searchInput.value = '';
      clearSearch.style.display = 'none';
      aplicarBusquedaYOrden();
    }
  }
});

searchInput.addEventListener('input', (e) => {
  busquedaActiva = e.target.value;
  clearSearch.style.display = busquedaActiva ? 'block' : 'none';
  aplicarBusquedaYOrden();
});

clearSearch.addEventListener('click', () => {
  searchInput.value = '';
  busquedaActiva = '';
  clearSearch.style.display = 'none';
  aplicarBusquedaYOrden();
  searchInput.focus();
});

// ---------- EVENTOS DE ORDENAMIENTO ----------
sortFechaBtn.addEventListener('click', () => setOrden('fecha'));
sortPuntuacionBtn.addEventListener('click', () => setOrden('puntuacion'));
sortPrecioBtn.addEventListener('click', () => setOrden('precio'));

// ---------- EVENTOS DE PAGINACIÓN ----------
prevPageBtn.addEventListener('click', () => cambiarPagina(-1));
nextPageBtn.addEventListener('click', () => cambiarPagina(1));

// ---------- MODO OSCURO ----------
darkModeToggle.addEventListener('click', toggleModoOscuro);

// ---------- INICIALIZACIÓN ----------
function init() {
  cargarVotosUsuario();
  cargarModoOscuro();
  cargarCatalogo();
}

document.addEventListener('DOMContentLoaded', init);