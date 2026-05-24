// ==================================================
// app.js - MI GARAJE (SIN PANEL DE REDES SOCIALES)
// Lógica completa: carga JSON, búsqueda con autocompletar,
// expansión de tarjetas, paginación estilo Amazon,
// filtros por categoría, ordenamiento, panel admin con caché
// ==================================================

// ---------- VARIABLES GLOBALES ----------
let catalogoData = null;           // Datos completos del JSON
let productosFiltrados = [];       // Productos después de aplicar filtros
let paginaActual = 1;
let productosPorPagina = 10;
let categoriaActiva = 'Todos';
let ordenActual = 'fecha';
let busquedaActiva = '';
let productoExpandidoId = null;     // ID del producto expandido actualmente
let versionActual = null;

// ========== INSTALACIÓN DE LA PWA (BOTÓN PERSONALIZADO) ==========
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // Previene que el navegador muestre el diálogo automático
  e.preventDefault();
  // Guarda el evento para usarlo más tarde
  deferredPrompt = e;
  // Muestra el botón de instalación
  mostrarBotonInstalar();
});

function mostrarBotonInstalar() {
  // Evita crear el botón varias veces
  if (document.getElementById('btnInstalar')) return;
  
  const btn = document.createElement('button');
  btn.id = 'btnInstalar';
  btn.innerHTML = '📲 Instalar Mi Garaje';
  btn.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    background: linear-gradient(135deg, #FF6B35, #F4A261);
    color: white;
    border: none;
    border-radius: 50px;
    padding: 12px 24px;
    font-weight: bold;
    font-size: 1rem;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    cursor: pointer;
    animation: pulse 1.5s infinite;
  `;
  
  // Estilo de animación para llamar la atención
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0% { transform: translateX(-50%) scale(1); opacity: 1; }
      50% { transform: translateX(-50%) scale(1.05); opacity: 0.9; }
      100% { transform: translateX(-50%) scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  btn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      alert('La instalación no está disponible ahora. Intenta más tarde.');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(outcome === 'accepted' ? '✅ Usuario aceptó instalar' : '❌ Usuario rechazó');
    deferredPrompt = null;
    btn.style.display = 'none';
  });
  
  document.body.appendChild(btn);
}

// Opcional: Oculta el botón si la app ya está instalada
window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('btnInstalar');
  if (btn) btn.style.display = 'none';
  console.log('✅ Mi Garaje fue instalada como PWA');
});

// DOM elements
const productosContainer = document.getElementById('productosContainer');
const paginationContainer = document.getElementById('paginationContainer');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageNumbersDiv = document.getElementById('pageNumbers');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const suggestionsList = document.getElementById('suggestionsList');
const resultCount = document.getElementById('resultCount');
const sortSelect = document.getElementById('sortSelect');
const filterAllBtn = document.getElementById('filterAllBtn');
const categoriasContainer = document.getElementById('categoriasContainer');
const updateBtn = document.getElementById('updateBtn');
const updateNotification = document.getElementById('updateNotification');
const confirmUpdateBtn = document.getElementById('confirmUpdate');
const cancelUpdateBtn = document.getElementById('cancelUpdate');
const offlineMsg = document.getElementById('offlineMsg');
const mainTitle = document.getElementById('mainTitle');
const adminModal = document.getElementById('adminModal');
const closeAdminModal = document.querySelector('.close-admin-modal');
const copyStatsBtn = document.getElementById('copyStatsBtn');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

// ---------- FUNCIONES DE CARGA Y PROGRESO ----------

// Actualizar barra de progreso
function actualizarProgreso(porcentaje, texto) {
    progressFill.style.width = `${porcentaje}%`;
    progressText.textContent = texto;
}

// Mostrar/ocultar progreso
function mostrarProgreso(mostrar) {
    progressContainer.style.display = mostrar ? 'block' : 'none';
}

// Cargar catálogo desde GitHub
// ==================================================
// FUNCIÓN CORREGIDA: cargarCatalogo()
// Con más logs y manejo de errores
// ==================================================

async function cargarCatalogo(mostrarProgresoFlag = true) {
    if (mostrarProgresoFlag) {
        mostrarProgreso(true);
        actualizarProgreso(10, 'Conectando con el catálogo...');
    }
    
    try {
        // --- OPCIÓN 1: Ruta relativa (la que ya tienes) ---
        // let url = `data/productos.json?t=${Date.now()}`;
        
        // --- OPCIÓN 2: Ruta absoluta pero dentro de tu proyecto (CORREGIDA) ---
        let url = `/migaraje/data/productos.json?t=${Date.now()}`;
        
        console.log('🔄 Intentando cargar desde:', url);  // <--- ¡MUY IMPORTANTE! Mira esto en la consola.
        
        const response = await fetch(url);
        
        console.log('📡 Respuesta del servidor:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }
        
        if (mostrarProgresoFlag) actualizarProgreso(40, 'Descargando datos...');
        
        const nuevoData = await response.json();
        
        console.log('✅ Datos recibidos correctamente:', nuevoData); // <--- Mira si llega el JSON
        
        if (mostrarProgresoFlag) actualizarProgreso(70, 'Procesando productos...');







      
        // Verificar si hay nueva versión
        if (versionActual && versionActual !== nuevoData.version && mostrarProgresoFlag) {
            updateNotification.style.display = 'flex';
            setTimeout(() => {
                if (updateNotification.style.display === 'flex') {
                    setTimeout(() => {
                        updateNotification.style.display = 'none';
                    }, 10000);
                }
            }, 100);
        }
        
        catalogoData = nuevoData;
        versionActual = nuevoData.version;
        
        // Extraer categorías únicas
        extraerCategorias();
        
        // Aplicar filtros y orden
        aplicarFiltrosYOrden();
        
        if (mostrarProgresoFlag) {
            actualizarProgreso(100, '¡Listo!');
            setTimeout(() => {
                mostrarProgreso(false);
            }, 500);
        }
        
        actualizarStatusBar();
        
    } catch (error) {
        console.warn('Error cargando catálogo:', error);
        if (mostrarProgresoFlag) {
            actualizarProgreso(0, 'Error al cargar. Usando caché local.');
            setTimeout(() => {
                mostrarProgreso(false);
            }, 2000);
        }
        
        if (!catalogoData) {
            productosContainer.innerHTML = '<div class="loading">No se pudo cargar el catálogo. Verifica tu conexión a internet.</div>';
        }
        actualizarStatusBar();
    }
}

// Extraer categorías únicas del JSON
function extraerCategorias() {
    if (!catalogoData) return;
    
    const categoriasSet = new Set();
    catalogoData.productos.forEach(p => {
        if (p.categoria) categoriasSet.add(p.categoria);
    });
    
    const categorias = Array.from(categoriasSet).sort();
    
    // Limpiar contenedor
    categoriasContainer.innerHTML = '';
    
    // Agregar botones de categoría
    categorias.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.textContent = cat;
        btn.addEventListener('click', () => filtrarPorCategoria(cat));
        categoriasContainer.appendChild(btn);
    });
}

// Filtrar por categoría
function filtrarPorCategoria(categoria) {
    categoriaActiva = categoria;
    
    // Actualizar estilos de botones
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    filterAllBtn.classList.remove('active');
    
    const btnActivo = Array.from(categoriasContainer.children).find(
        btn => btn.textContent === categoria
    );
    if (btnActivo) btnActivo.classList.add('active');
    
    aplicarFiltrosYOrden();
}

// Filtrar todos (sin categoría)
function filtrarTodos() {
    categoriaActiva = 'Todos';
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    filterAllBtn.classList.add('active');
    aplicarFiltrosYOrden();
}

filterAllBtn.addEventListener('click', filtrarTodos);

// Aplicar filtros (búsqueda + categoría) y orden
function aplicarFiltrosYOrden() {
    if (!catalogoData) return;
    
    let productos = [...catalogoData.productos];
    
    // Filtrar por búsqueda
    if (busquedaActiva.trim()) {
        const termino = busquedaActiva.toLowerCase().trim();
        productos = productos.filter(p => 
            p.nombre.toLowerCase().includes(termino) || 
            p.descripcion.toLowerCase().includes(termino)
        );
    }
    
    // Filtrar por categoría
    if (categoriaActiva !== 'Todos') {
        productos = productos.filter(p => p.categoria === categoriaActiva);
    }
    
    // Ordenar
    productos = ordenarProductos(productos);
    
    productosFiltrados = productos;
    
    // Actualizar contador
    resultCount.textContent = `${productosFiltrados.length} producto${productosFiltrados.length !== 1 ? 's' : ''}`;
    
    // Resetear página a 1
    paginaActual = 1;
    productoExpandidoId = null;
    
    // Renderizar
    renderizarProductos();
    renderizarPaginacion();
}

// Ordenar productos según selección
function ordenarProductos(productos) {
    const productosCopy = [...productos];
    
    switch(ordenActual) {
        case 'fecha':
            return productosCopy.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        case 'precio-asc':
            return productosCopy.sort((a, b) => a.precio - b.precio);
        case 'precio-desc':
            return productosCopy.sort((a, b) => b.precio - a.precio);
        case 'nombre':
            return productosCopy.sort((a, b) => a.nombre.localeCompare(b.nombre));
        default:
            return productosCopy;
    }
}

// Cambiar orden
sortSelect.addEventListener('change', (e) => {
    ordenActual = e.target.value;
    aplicarFiltrosYOrden();
});

// ---------- BÚSQUEDA CON AUTOCOMPLETAR ----------

// Generar sugerencias
function generarSugerencias(texto) {
    if (!texto.trim() || !catalogoData) {
        suggestionsList.style.display = 'none';
        return;
    }
    
    const termino = texto.toLowerCase().trim();
    const productos = catalogoData.productos;
    
    // Buscar coincidencias (nombre o categoría)
    const sugerencias = productos.filter(p => 
        p.nombre.toLowerCase().includes(termino) ||
        p.categoria.toLowerCase().includes(termino)
    ).slice(0, 8); // Máximo 8 sugerencias
    
    if (sugerencias.length === 0) {
        suggestionsList.style.display = 'none';
        return;
    }
    
    // Renderizar sugerencias
    suggestionsList.innerHTML = sugerencias.map(p => `
        <div class="suggestion-item" data-id="${p.id}">
            <span class="suggestion-nombre">${p.nombre}</span>
            <span class="suggestion-categoria">${p.categoria}</span>
        </div>
    `).join('');
    
    suggestionsList.style.display = 'block';
    
    // Agregar eventos a las sugerencias
    document.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.getAttribute('data-id');
            const producto = catalogoData.productos.find(p => p.id === id);
            if (producto) {
                searchInput.value = producto.nombre;
                busquedaActiva = producto.nombre;
                aplicarFiltrosYOrden();
                suggestionsList.style.display = 'none';
            }
        });
    });
}

// Eventos del buscador
searchInput.addEventListener('input', (e) => {
    busquedaActiva = e.target.value;
    clearSearchBtn.style.display = busquedaActiva ? 'block' : 'none';
    generarSugerencias(busquedaActiva);
    aplicarFiltrosYOrden();
});

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    busquedaActiva = '';
    clearSearchBtn.style.display = 'none';
    suggestionsList.style.display = 'none';
    aplicarFiltrosYOrden();
    searchInput.focus();
});

// Cerrar sugerencias al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !suggestionsList.contains(e.target)) {
        suggestionsList.style.display = 'none';
    }
});

// ---------- EXPANSIÓN DE TARJETAS ----------

function toggleExpandir(productoId) {
    if (productoExpandidoId === productoId) {
        // Colapsar
        productoExpandidoId = null;
    } else {
        // Expandir nueva
        productoExpandidoId = productoId;
    }
    renderizarProductos(); // Re-renderizar para actualizar estado
}

// ---------- RENDERIZADO DE PRODUCTOS ----------

function renderizarProductos() {
    if (!productosFiltrados || productosFiltrados.length === 0) {
        productosContainer.innerHTML = '<div class="loading">No se encontraron productos. Pronto añadiremos más hallazgos.</div>';
        return;
    }
    
    const inicio = (paginaActual - 1) * productosPorPagina;
    const fin = inicio + productosPorPagina;
    const productosPagina = productosFiltrados.slice(inicio, fin);
    
    productosContainer.innerHTML = productosPagina.map(p => renderizarProducto(p)).join('');
    
    // Asignar eventos
    document.querySelectorAll('.producto-card').forEach(card => {
        const id = card.getAttribute('data-id');
        // Evento para expandir/colapsar al hacer clic en "Ver más"
        const verMasBtn = card.querySelector('.ver-mas-btn');
        if (verMasBtn) {
            verMasBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleExpandir(id);
            });
        }
        
        // Evento WhatsApp
        const whatsappBtn = card.querySelector('.whatsapp-btn');
        if (whatsappBtn) {
            whatsappBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                abrirWhatsApp(id);
            });
        }
        
        // Evento Compartir
        const compartirBtn = card.querySelector('.compartir-btn');
        if (compartirBtn) {
            compartirBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                compartirProducto(id);
            });
        }
    });
}

function renderizarProducto(producto) {
    const esExpandido = productoExpandidoId === producto.id;
    const claseExpandida = esExpandido ? 'expandida' : '';
    
    // Truncar descripción si no está expandida
    const descripcionMostrada = esExpandido ? producto.descripcion : producto.descripcion.substring(0, 100);
    const descripcionFinal = esExpandido ? descripcionMostrada : descripcionMostrada + (producto.descripcion.length > 100 ? '...' : '');
    
    return `
        <div class="producto-card ${claseExpandida}" data-id="${producto.id}">
            <img class="producto-imagen" src="${producto.imagen}" alt="${producto.nombre}" loading="lazy" 
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23ddd%22/%3E%3Ctext x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3ESin imagen%3C/text%3E%3C/svg%3E'">
            <div class="producto-info">
                <div class="producto-nombre">${producto.nombre}</div>
                <div class="producto-precio">${producto.precio} ${producto.moneda || 'CUP'}</div>
                <span class="producto-categoria">${producto.categoria || 'General'}</span>
                <div class="producto-descripcion">${descripcionFinal}</div>
                <div class="card-buttons">
                    <button class="ver-mas-btn">${esExpandido ? 'Ver menos' : 'Ver más'}</button>
                    <a href="#" class="whatsapp-btn">💬 WhatsApp</a>
                    <a href="#" class="compartir-btn">📤 Compartir</a>
                </div>
            </div>
        </div>
    `;
}

// ---------- WHATSAPP ----------

function abrirWhatsApp(productoId) {
    const producto = catalogoData.productos.find(p => p.id === productoId);
    if (!producto) return;
    
    const numero = catalogoData.whatsappNumber;
    const mensaje = `Hola, me interesa el producto: ${producto.nombre} (${producto.precio} ${producto.moneda || 'CUP'}). ¿Está disponible?`;
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

// ---------- COMPARTIR PRODUCTO ----------

function compartirProducto(productoId) {
    const producto = catalogoData.productos.find(p => p.id === productoId);
    if (!producto) return;
    
    const texto = `¡Mira este producto en Mi Garaje! ${producto.nombre} - ${producto.precio} ${producto.moneda || 'CUP'}`;
    const url = window.location.href;
    
    // Usar Web Share API si está disponible
    if (navigator.share) {
        navigator.share({
            title: producto.nombre,
            text: texto,
            url: url
        }).catch(err => console.log('Error al compartir:', err));
    } else {
        // Fallback: copiar al portapapeles
        navigator.clipboard.writeText(`${texto}\n${url}`);
        alert('Enlace copiado al portapapeles. Puedes pegarlo en WhatsApp o Telegram.');
    }
}

// ---------- PAGINACIÓN ESTILO AMAZON ----------

function renderizarPaginacion() {
    const totalProductos = productosFiltrados.length;
    const totalPaginas = Math.ceil(totalProductos / productosPorPagina);
    
    if (totalPaginas <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    
    // Actualizar botones anterior/siguiente
    prevPageBtn.disabled = (paginaActual === 1);
    nextPageBtn.disabled = (paginaActual === totalPaginas);
    
    // Generar números de página (máximo 5 a la vez)
    let startPage = Math.max(1, paginaActual - 2);
    let endPage = Math.min(totalPaginas, startPage + 4);
    
    if (endPage - startPage < 4 && startPage > 1) {
        startPage = Math.max(1, endPage - 4);
    }
    
    let pagesHTML = '';
    if (startPage > 1) {
        pagesHTML += `<button class="page-number" data-page="1">1</button>`;
        if (startPage > 2) pagesHTML += `<span class="page-dots">...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === paginaActual ? 'active' : '';
        pagesHTML += `<button class="page-number ${activeClass}" data-page="${i}">${i}</button>`;
    }
    
    if (endPage < totalPaginas) {
        if (endPage < totalPaginas - 1) pagesHTML += `<span class="page-dots">...</span>`;
        pagesHTML += `<button class="page-number" data-page="${totalPaginas}">${totalPaginas}</button>`;
    }
    
    pageNumbersDiv.innerHTML = pagesHTML;
    
    // Eventos a los números de página
    document.querySelectorAll('.page-number').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = parseInt(btn.getAttribute('data-page'));
            if (!isNaN(page) && page !== paginaActual) {
                paginaActual = page;
                productoExpandidoId = null;
                renderizarProductos();
                renderizarPaginacion();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
}

function cambiarPagina(delta) {
    const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);
    const nuevaPagina = paginaActual + delta;
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
        paginaActual = nuevaPagina;
        productoExpandidoId = null;
        renderizarProductos();
        renderizarPaginacion();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

prevPageBtn.addEventListener('click', () => cambiarPagina(-1));
nextPageBtn.addEventListener('click', () => cambiarPagina(1));

// ---------- ACTUALIZACIÓN MANUAL ----------

updateBtn.addEventListener('click', () => {
    cargarCatalogo(true);
});

confirmUpdateBtn.addEventListener('click', () => {
    updateNotification.style.display = 'none';
    cargarCatalogo(true);
});

cancelUpdateBtn.addEventListener('click', () => {
    updateNotification.style.display = 'none';
});

// ---------- PANEL ADMIN (doble clic en título) ----------

async function calcularTamanioCache() {
    if (!navigator.onLine) return 'No disponible offline';
    
    try {
        if (!('caches' in window)) return 'No soportado';
        const cache = await caches.open('mi-garaje-v1');
        const keys = await cache.keys();
        let total = 0;
        let imagenesCache = 0;
        
        for (const request of keys) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.blob();
                total += blob.size;
                if (request.url.includes('/images/')) imagenesCache++;
            }
        }
        
        const totalKB = (total / 1024).toFixed(0);
        return { totalKB, imagenesCache, totalProductos: catalogoData?.productos?.length || 0 };
    } catch (error) {
        console.warn('Error calculando caché:', error);
        return 'Error al calcular';
    }
}

async function mostrarPanelAdmin() {
    if (!catalogoData) {
        alert('Espera a que cargue el catálogo primero.');
        return;
    }
    
    const productos = catalogoData.productos;
    
    // Calcular estadísticas
    const totalProductos = productos.length;
    const precios = productos.map(p => p.precio);
    const precioMax = Math.max(...precios);
    const precioMin = Math.min(...precios);
    const productoMasCaro = productos.find(p => p.precio === precioMax);
    const productoMasBarato = productos.find(p => p.precio === precioMin);
    
    // Producto más reciente (por fecha)
    const productosOrdenadosFecha = [...productos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const productoReciente = productosOrdenadosFecha[0];
    
    // Conteo por categoría
    const categoriasCount = {};
    productos.forEach(p => {
        const cat = p.categoria || 'Sin categoría';
        categoriasCount[cat] = (categoriasCount[cat] || 0) + 1;
    });
    
    // Tamaño de caché
    const cacheInfo = await calcularTamanioCache();
    const cacheText = typeof cacheInfo === 'object' 
        ? `${cacheInfo.totalKB} KB (${cacheInfo.imagenesCache}/${cacheInfo.totalProductos} imágenes)`
        : cacheInfo;
    
    const statsHTML = `
        <div class="stats-section">
            <h3>📊 General</h3>
            <div class="stats-grid">
                <div class="stat-item"><span class="stat-label">Total productos:</span><span class="stat-value">${totalProductos}</span></div>
                <div class="stat-item"><span class="stat-label">Última versión:</span><span class="stat-value">${catalogoData.version || 'N/A'}</span></div>
                <div class="stat-item"><span class="stat-label">Producto más reciente:</span><span class="stat-value">${productoReciente?.nombre || 'N/A'}</span></div>
                <div class="stat-item"><span class="stat-label">Fecha más reciente:</span><span class="stat-value">${productoReciente?.fecha || 'N/A'}</span></div>
            </div>
        </div>
        <div class="stats-section">
            <h3>💰 Precios</h3>
            <div class="stats-grid">
                <div class="stat-item"><span class="stat-label">Más caro:</span><span class="stat-value">${precioMax} CUP (${productoMasCaro?.nombre})</span></div>
                <div class="stat-item"><span class="stat-label">Más barato:</span><span class="stat-value">${precioMin} CUP (${productoMasBarato?.nombre})</span></div>
            </div>
        </div>
        <div class="stats-section">
            <h3>📂 Por categoría</h3>
            ${Object.entries(categoriasCount).map(([cat, count]) => `
                <div class="categoria-stats">
                    <span>${cat}</span>
                    <span><strong>${count}</strong> producto${count !== 1 ? 's' : ''}</span>
                </div>
            `).join('')}
        </div>
        <div class="stats-section">
            <h3>💾 Caché local</h3>
            <div class="stats-grid">
                <div class="stat-item"><span class="stat-label">Tamaño:</span><span class="stat-value">${cacheText}</span></div>
                <div class="stat-item"><span class="stat-label">WhatsApp:</span><span class="stat-value">${catalogoData.whatsappNumber}</span></div>
            </div>
        </div>
    `;
    
    document.getElementById('adminStats').innerHTML = statsHTML;
    adminModal.style.display = 'block';
}

// Copiar estadísticas al portapapeles
copyStatsBtn.addEventListener('click', async () => {
    if (!catalogoData) return;
    
    const productos = catalogoData.productos;
    const precios = productos.map(p => p.precio);
    const precioMax = Math.max(...precios);
    const precioMin = Math.min(...precios);
    const productoMasCaro = productos.find(p => p.precio === precioMax);
    const productoMasBarato = productos.find(p => p.precio === precioMin);
    
    const categoriasCount = {};
    productos.forEach(p => {
        const cat = p.categoria || 'Sin categoría';
        categoriasCount[cat] = (categoriasCount[cat] || 0) + 1;
    });
    
    const cacheInfo = await calcularTamanioCache();
    const cacheText = typeof cacheInfo === 'object' 
        ? `${cacheInfo.totalKB} KB (${cacheInfo.imagenesCache}/${cacheInfo.totalProductos} imágenes)`
        : cacheInfo;
    
    let texto = `MI GARAJE - PANEL DEL VENDEDOR\n`;
    texto += `========================\n`;
    texto += `Total productos: ${productos.length}\n`;
    texto += `Última versión: ${catalogoData.version}\n`;
    texto += `Producto más reciente: ${productos.sort((a,b) => new Date(b.fecha) - new Date(a.fecha))[0]?.nombre}\n\n`;
    texto += `Precio más caro: ${precioMax} CUP (${productoMasCaro?.nombre})\n`;
    texto += `Precio más barato: ${precioMin} CUP (${productoMasBarato?.nombre})\n\n`;
    texto += `Por categoría:\n`;
    for (const [cat, count] of Object.entries(categoriasCount)) {
        texto += `  ${cat}: ${count}\n`;
    }
    texto += `\nCaché local: ${cacheText}\n`;
    texto += `WhatsApp: ${catalogoData.whatsappNumber}\n`;
    
    navigator.clipboard.writeText(texto);
    alert('Estadísticas copiadas al portapapeles');
});

// Cerrar modal admin
closeAdminModal.addEventListener('click', () => {
    adminModal.style.display = 'none';
});
window.addEventListener('click', (e) => {
    if (e.target === adminModal) {
        adminModal.style.display = 'none';
    }
});

// Detectar doble clic en el título
mainTitle.addEventListener('dblclick', () => {
    mostrarPanelAdmin();
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
    cargarCatalogo(true);
});
window.addEventListener('offline', actualizarStatusBar);

// ---------- INICIALIZACIÓN ----------

function init() {
    cargarCatalogo(true);
}

document.addEventListener('DOMContentLoaded', init);
