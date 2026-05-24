// ==================================================
// app.js - MI GARAJE (VERSIÓN CORREGIDA)
// Errores de orden de funciones solucionados
// ==================================================

// ---------- VARIABLES GLOBALES ----------
let catalogoData = null;
let productosFiltrados = [];
let paginaActual = 1;
let productosPorPagina = 10;
let categoriaActiva = 'Todos';
let ordenActual = 'fecha';
let busquedaActiva = '';
let productoExpandidoId = null;
let versionActual = null;

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

// ========== INSTALACIÓN DE LA PWA (BOTÓN PERSONALIZADO) ==========
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    mostrarBotonInstalar();
});

function mostrarBotonInstalar() {
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
    
    btn.addEventListener('click', async () => {
        if (!deferredPrompt) {
            alert('La instalación no está disponible ahora.');
            return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(outcome === 'accepted' ? '✅ Instalada' : '❌ Rechazada');
        deferredPrompt = null;
        btn.style.display = 'none';
    });
    
    document.body.appendChild(btn);
}

window.addEventListener('appinstalled', () => {
    const btn = document.getElementById('btnInstalar');
    if (btn) btn.style.display = 'none';
});

// ========== FUNCIONES DE PROGRESO (DEFINIDAS PRIMERO) ==========
function actualizarProgreso(porcentaje, texto) {
    if (progressFill) progressFill.style.width = `${porcentaje}%`;
    if (progressText) progressText.textContent = texto;
}

function mostrarProgreso(mostrar) {
    if (progressContainer) progressContainer.style.display = mostrar ? 'block' : 'none';
}

// ========== FUNCIONES AUXILIARES ==========
function actualizarStatusBar() {
    if (navigator.onLine) {
        if (offlineMsg) offlineMsg.style.display = 'none';
    } else {
        if (offlineMsg) offlineMsg.style.display = 'block';
    }
}

// ========== CARGA DEL CATÁLOGO (CORREGIDA) ==========
async function cargarCatalogo(mostrarProgresoFlag = true) {
    console.log('🔄 Iniciando carga del catálogo...');
    
    if (mostrarProgresoFlag) {
        mostrarProgreso(true);
        actualizarProgreso(10, 'Conectando...');
    }
    
    try {
        // Ruta CORRECTA para GitHub Pages
        const url = `data/productos.json?t=${Date.now()}`;
        console.log('📡 Cargando desde:', url);
        
        actualizarProgreso(30, 'Descargando datos...');
        const response = await fetch(url);
        
        console.log('📡 Respuesta:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        actualizarProgreso(60, 'Procesando productos...');
        const nuevoData = await response.json();
        
        console.log('✅ Datos recibidos:', nuevoData.productos?.length || 0, 'productos');
        
        // Verificar versión
        if (versionActual && versionActual !== nuevoData.version && mostrarProgresoFlag) {
            updateNotification.style.display = 'flex';
            setTimeout(() => {
                updateNotification.style.display = 'none';
            }, 10000);
        }
        
        catalogoData = nuevoData;
        versionActual = nuevoData.version;
        
        extraerCategorias();
        aplicarFiltrosYOrden();
        
        actualizarProgreso(100, '¡Listo!');
        setTimeout(() => mostrarProgreso(false), 500);
        actualizarStatusBar();
        
    } catch (error) {
        console.error('❌ ERROR al cargar catálogo:', error);
        if (mostrarProgresoFlag) {
            actualizarProgreso(0, 'Error de carga');
            setTimeout(() => mostrarProgreso(false), 2000);
        }
        
        if (!catalogoData) {
            productosContainer.innerHTML = `
                <div class="loading" style="color: #E63946;">
                    ❌ No se pudo cargar el catálogo.<br>
                    <small>${error.message}</small><br><br>
                    🔄 <a href="#" onclick="location.reload()">Intentar de nuevo</a>
                </div>
            `;
        }
        actualizarStatusBar();
    }
}

// ========== CATEGORÍAS ==========
function extraerCategorias() {
    if (!catalogoData || !categoriasContainer) return;
    
    const categoriasSet = new Set();
    catalogoData.productos.forEach(p => {
        if (p.categoria) categoriasSet.add(p.categoria);
    });
    
    const categorias = Array.from(categoriasSet).sort();
    categoriasContainer.innerHTML = '';
    
    categorias.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.textContent = cat;
        btn.addEventListener('click', () => filtrarPorCategoria(cat));
        categoriasContainer.appendChild(btn);
    });
}

function filtrarPorCategoria(categoria) {
    categoriaActiva = categoria;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    filterAllBtn.classList.remove('active');
    const btnActivo = Array.from(categoriasContainer.children).find(btn => btn.textContent === categoria);
    if (btnActivo) btnActivo.classList.add('active');
    aplicarFiltrosYOrden();
}

function filtrarTodos() {
    categoriaActiva = 'Todos';
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    filterAllBtn.classList.add('active');
    aplicarFiltrosYOrden();
}

if (filterAllBtn) filterAllBtn.addEventListener('click', filtrarTodos);

// ========== FILTROS Y ORDEN ==========
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

function aplicarFiltrosYOrden() {
    if (!catalogoData) return;
    
    let productos = [...catalogoData.productos];
    
    if (busquedaActiva.trim()) {
        const termino = busquedaActiva.toLowerCase().trim();
        productos = productos.filter(p => 
            p.nombre.toLowerCase().includes(termino) || 
            p.descripcion.toLowerCase().includes(termino)
        );
    }
    
    if (categoriaActiva !== 'Todos') {
        productos = productos.filter(p => p.categoria === categoriaActiva);
    }
    
    productosFiltrados = ordenarProductos(productos);
    if (resultCount) resultCount.textContent = `${productosFiltrados.length} producto${productosFiltrados.length !== 1 ? 's' : ''}`;
    
    paginaActual = 1;
    productoExpandidoId = null;
    
    renderizarProductos();
    renderizarPaginacion();
}

if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
        ordenActual = e.target.value;
        aplicarFiltrosYOrden();
    });
}

// ========== BÚSQUEDA ==========
function generarSugerencias(texto) {
    if (!texto.trim() || !catalogoData) {
        suggestionsList.style.display = 'none';
        return;
    }
    
    const termino = texto.toLowerCase().trim();
    const sugerencias = catalogoData.productos.filter(p => 
        p.nombre.toLowerCase().includes(termino) ||
        p.categoria.toLowerCase().includes(termino)
    ).slice(0, 8);
    
    if (sugerencias.length === 0) {
        suggestionsList.style.display = 'none';
        return;
    }
    
    suggestionsList.innerHTML = sugerencias.map(p => `
        <div class="suggestion-item" data-id="${p.id}">
            <span class="suggestion-nombre">${p.nombre}</span>
            <span class="suggestion-categoria">${p.categoria}</span>
        </div>
    `).join('');
    suggestionsList.style.display = 'block';
    
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

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        busquedaActiva = e.target.value;
        if (clearSearchBtn) clearSearchBtn.style.display = busquedaActiva ? 'block' : 'none';
        generarSugerencias(busquedaActiva);
        aplicarFiltrosYOrden();
    });
}

if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        busquedaActiva = '';
        clearSearchBtn.style.display = 'none';
        suggestionsList.style.display = 'none';
        aplicarFiltrosYOrden();
        searchInput.focus();
    });
}

document.addEventListener('click', (e) => {
    if (searchInput && !searchInput.contains(e.target) && suggestionsList && !suggestionsList.contains(e.target)) {
        suggestionsList.style.display = 'none';
    }
});

// ========== RENDERIZADO ==========
function renderizarProductos() {
    if (!productosFiltrados || productosFiltrados.length === 0) {
        productosContainer.innerHTML = '<div class="loading">No se encontraron productos. Pronto añadiremos más hallazgos.</div>';
        return;
    }
    
    const inicio = (paginaActual - 1) * productosPorPagina;
    const fin = inicio + productosPorPagina;
    const productosPagina = productosFiltrados.slice(inicio, fin);
    
    productosContainer.innerHTML = productosPagina.map(p => {
        const esExpandido = productoExpandidoId === p.id;
        const claseExpandida = esExpandido ? 'expandida' : '';
        const descripcionCorta = p.descripcion.substring(0, 100) + (p.descripcion.length > 100 ? '...' : '');
        
        return `
            <div class="producto-card ${claseExpandida}" data-id="${p.id}">
                <img class="producto-imagen" src="${p.imagen}" alt="${p.nombre}" loading="lazy" 
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23ddd%22/%3E%3Ctext x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3ESin imagen%3C/text%3E%3C/svg%3E'">
                <div class="producto-info">
                    <div class="producto-nombre">${p.nombre}</div>
                    <div class="producto-precio">${p.precio} ${p.moneda || 'CUP'}</div>
                    <span class="producto-categoria">${p.categoria || 'General'}</span>
                    <div class="producto-descripcion">${esExpandido ? p.descripcion : descripcionCorta}</div>
                    <div class="card-buttons">
                        <button class="ver-mas-btn">${esExpandido ? 'Ver menos' : 'Ver más'}</button>
                        <a href="#" class="whatsapp-btn">💬 WhatsApp</a>
                        <a href="#" class="compartir-btn">📤 Compartir</a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Eventos
    document.querySelectorAll('.ver-mas-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = btn.closest('.producto-card');
            const id = card.getAttribute('data-id');
            if (productoExpandidoId === id) {
                productoExpandidoId = null;
            } else {
                productoExpandidoId = id;
            }
            renderizarProductos();
        });
    });
    
    document.querySelectorAll('.whatsapp-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const card = btn.closest('.producto-card');
            const id = card.getAttribute('data-id');
            const producto = catalogoData.productos.find(p => p.id === id);
            if (producto) {
                const numero = catalogoData.whatsappNumber;
                const mensaje = `Hola, me interesa el producto: ${producto.nombre} (${producto.precio} ${producto.moneda || 'CUP'}). ¿Está disponible?`;
                window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`, '_blank');
            }
        });
    });
    
    document.querySelectorAll('.compartir-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const card = btn.closest('.producto-card');
            const id = card.getAttribute('data-id');
            const producto = catalogoData.productos.find(p => p.id === id);
            if (producto) {
                const texto = `¡Mira este producto en Mi Garaje! ${producto.nombre} - ${producto.precio} ${producto.moneda || 'CUP'}`;
                if (navigator.share) {
                    navigator.share({ title: producto.nombre, text: texto, url: window.location.href });
                } else {
                    navigator.clipboard.writeText(`${texto}\n${window.location.href}`);
                    alert('Enlace copiado al portapapeles');
                }
            }
        });
    });
}

// ========== PAGINACIÓN ==========
function renderizarPaginacion() {
    const totalProductos = productosFiltrados.length;
    const totalPaginas = Math.ceil(totalProductos / productosPorPagina);
    
    if (totalPaginas <= 1 || !paginationContainer) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    if (prevPageBtn) prevPageBtn.disabled = (paginaActual === 1);
    if (nextPageBtn) nextPageBtn.disabled = (paginaActual === totalPaginas);
    
    let startPage = Math.max(1, paginaActual - 2);
    let endPage = Math.min(totalPaginas, startPage + 4);
    if (endPage - startPage < 4 && startPage > 1) startPage = Math.max(1, endPage - 4);
    
    let pagesHTML = '';
    if (startPage > 1) {
        pagesHTML += `<button class="page-number" data-page="1">1</button>`;
        if (startPage > 2) pagesHTML += `<span class="page-dots">...</span>`;
    }
    for (let i = startPage; i <= endPage; i++) {
        pagesHTML += `<button class="page-number ${i === paginaActual ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    if (endPage < totalPaginas) {
        if (endPage < totalPaginas - 1) pagesHTML += `<span class="page-dots">...</span>`;
        pagesHTML += `<button class="page-number" data-page="${totalPaginas}">${totalPaginas}</button>`;
    }
    pageNumbersDiv.innerHTML = pagesHTML;
    
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

if (prevPageBtn) prevPageBtn.addEventListener('click', () => {
    const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);
    if (paginaActual > 1) paginaActual--;
    productoExpandidoId = null;
    renderizarProductos();
    renderizarPaginacion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

if (nextPageBtn) nextPageBtn.addEventListener('click', () => {
    const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);
    if (paginaActual < totalPaginas) paginaActual++;
    productoExpandidoId = null;
    renderizarProductos();
    renderizarPaginacion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ========== ACTUALIZACIÓN MANUAL ==========
if (updateBtn) {
    updateBtn.addEventListener('click', () => cargarCatalogo(true));
}

if (confirmUpdateBtn) {
    confirmUpdateBtn.addEventListener('click', () => {
        updateNotification.style.display = 'none';
        cargarCatalogo(true);
    });
}

if (cancelUpdateBtn) {
    cancelUpdateBtn.addEventListener('click', () => {
        updateNotification.style.display = 'none';
    });
}

// ========== PANEL ADMIN ==========
async function calcularTamanioCache() {
    if (!navigator.onLine) return 'No disponible offline';
    try {
        if (!('caches' in window)) return 'No soportado';
        const cache = await caches.open('mi-garaje-v1');
        const keys = await cache.keys();
        let total = 0, imagenesCache = 0;
        for (const request of keys) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.blob();
                total += blob.size;
                if (request.url.includes('/images/')) imagenesCache++;
            }
        }
        return `${(total / 1024).toFixed(0)} KB (${imagenesCache}/${catalogoData?.productos?.length || 0} imágenes)`;
    } catch (error) {
        return 'Error';
    }
}

async function mostrarPanelAdmin() {
    if (!catalogoData) {
        alert('Espera a que cargue el catálogo.');
        return;
    }
    
    const productos = catalogoData.productos;
    const precios = productos.map(p => p.precio);
    const precioMax = Math.max(...precios);
    const precioMin = Math.min(...precios);
    const productoMasCaro = productos.find(p => p.precio === precioMax);
    const productoMasBarato = productos.find(p => p.precio === precioMin);
    const productoReciente = [...productos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
    
    const categoriasCount = {};
    productos.forEach(p => {
        const cat = p.categoria || 'Sin categoría';
        categoriasCount[cat] = (categoriasCount[cat] || 0) + 1;
    });
    
    const cacheText = await calcularTamanioCache();
    
    document.getElementById('adminStats').innerHTML = `
        <div class="stats-section"><h3>📊 General</h3>
            <div class="stats-grid">
                <div class="stat-item"><span class="stat-label">Total productos:</span><span class="stat-value">${productos.length}</span></div>
                <div class="stat-item"><span class="stat-label">Última versión:</span><span class="stat-value">${catalogoData.version || 'N/A'}</span></div>
                <div class="stat-item"><span class="stat-label">Producto más reciente:</span><span class="stat-value">${productoReciente?.nombre || 'N/A'}</span></div>
            </div>
        </div>
        <div class="stats-section"><h3>💰 Precios</h3>
            <div class="stats-grid">
                <div class="stat-item"><span class="stat-label">Más caro:</span><span class="stat-value">${precioMax} CUP (${productoMasCaro?.nombre})</span></div>
                <div class="stat-item"><span class="stat-label">Más barato:</span><span class="stat-value">${precioMin} CUP (${productoMasBarato?.nombre})</span></div>
            </div>
        </div>
        <div class="stats-section"><h3>📂 Por categoría</h3>
            ${Object.entries(categoriasCount).map(([cat, count]) => `<div class="categoria-stats"><span>${cat}</span><span><strong>${count}</strong></span></div>`).join('')}
        </div>
        <div class="stats-section"><h3>💾 Caché local</h3>
            <div class="stats-grid">
                <div class="stat-item"><span class="stat-label">Tamaño:</span><span class="stat-value">${cacheText}</span></div>
                <div class="stat-item"><span class="stat-label">WhatsApp:</span><span class="stat-value">${catalogoData.whatsappNumber}</span></div>
            </div>
        </div>
    `;
    adminModal.style.display = 'block';
}

if (copyStatsBtn) {
    copyStatsBtn.addEventListener('click', async () => {
        if (!catalogoData) return;
        const productos = catalogoData.productos;
        const cacheText = await calcularTamanioCache();
        let texto = `MI GARAJE - PANEL DEL VENDEDOR\nTotal: ${productos.length} productos\nVersión: ${catalogoData.version}\nWhatsApp: ${catalogoData.whatsappNumber}\nCaché: ${cacheText}`;
        navigator.clipboard.writeText(texto);
        alert('Estadísticas copiadas');
    });
}

if (closeAdminModal) {
    closeAdminModal.addEventListener('click', () => adminModal.style.display = 'none');
}
window.addEventListener('click', (e) => { if (e.target === adminModal) adminModal.style.display = 'none'; });

if (mainTitle) {
    mainTitle.addEventListener('dblclick', () => mostrarPanelAdmin());
}

// ========== CONEXIÓN ==========
window.addEventListener('online', () => {
    actualizarStatusBar();
    cargarCatalogo(true);
});
window.addEventListener('offline', actualizarStatusBar);

// ========== INICIALIZACIÓN ==========
function init() {
    console.log('🚀 Iniciando Mi Garaje...');
    cargarCatalogo(true);
}

document.addEventListener('DOMContentLoaded', init);
