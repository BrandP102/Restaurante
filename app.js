// =========================================================================
// LLANERA Y PARRILLA - LÓGICA DE LA CARTA DIGITAL
// =========================================================================

// Variables globales
let menuData = null;
let carrito = []; 
let productoSeleccionadoModal = null;

// =========================================================================
// 1. INICIALIZACIÓN
// =========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    await cargarMenu();
    inicializarEventos();
    actualizarCarritoUI();
    verificarHorario();
    // Verificar horario cada minuto
    setInterval(verificarHorario, 60000);
});

// =========================================================================
// 2. CARGA DEL MENÚ DESDE menu.json
// =========================================================================
async function cargarMenu() {
    try {
        const response = await fetch('menu.json');
        if (!response.ok) throw new Error('No se pudo cargar menu.json');
        menuData = await response.json();
        
        renderizarMenu();
        renderizarSidebar();
        actualizarFooter();
        renderizarBanners();
        inicializarLegal();
    } catch (error) {
        console.error('Error al cargar el menú:', error);
        document.getElementById('carta-container').innerHTML = 
            '<p style="text-align: center; color: #f44336; padding: 50px 0;">Error al cargar el menú. Por favor recarga la página.</p>';
    }
}

// =========================================================================
// 3. RENDERIZADO DEL MENÚ
// =========================================================================
function renderizarMenu() {
    const contenedor = document.getElementById('carta-container');
    contenedor.innerHTML = '';

    // Ordenar categorías por el campo "orden"
    const categoriasOrdenadas = menuData.categorias
        .filter(c => c.activo !== false)
        .sort((a, b) => a.orden - b.orden);

    categoriasOrdenadas.forEach(categoria => {
        // Título de la sección
        const titulo = document.createElement('h2');
        titulo.id = categoria.id;
        titulo.className = 'seccion-titulo';
        titulo.textContent = categoria.nombre;
        contenedor.appendChild(titulo);

        // Grid de productos
        const grid = document.createElement('div');
        grid.className = 'grid-platos';

        categoria.productos.forEach(producto => {
            const tarjeta = crearTarjetaProducto(producto, categoria.nombre);
            grid.appendChild(tarjeta);
        });

        contenedor.appendChild(grid);
    });
}

// =========================================================================
// RENDERIZADO DE BANNERS PUBLICITARIOS (SLIDER AUTOMÁTICO)
// =========================================================================
let intervaloBanners = null;
let bannerActual = 0;
let totalBanners = 0;

function renderizarBanners() {
    const contenedor = document.getElementById('banners-container');
    if (!contenedor || !menuData.banners) return;
    
    // Filtrar solo los banners activos
    const bannersActivos = menuData.banners.filter(b => b.activo === true);
    
    if (bannersActivos.length === 0) {
        contenedor.style.display = 'none';
        return;
    }
    
    contenedor.innerHTML = '';
    totalBanners = bannersActivos.length;
    bannerActual = 0;
    
    // Detener cualquier intervalo previo
    if (intervaloBanners) clearInterval(intervaloBanners);
    
    bannersActivos.forEach((banner, index) => {
        const div = document.createElement('div');
        div.className = 'banner';
        if (index === 0) div.classList.add('activo'); // El primero está activo
        div.dataset.index = index;
        
        // Si tiene imagen, usarla como fondo
        if (banner.imagen && banner.imagen.trim() !== '') {
            div.classList.add('banner-con-imagen');
            div.style.backgroundImage = `url('${banner.imagen}')`;
            
            const textoDiv = document.createElement('div');
            textoDiv.className = 'banner-texto';
            textoDiv.textContent = banner.texto;
            div.appendChild(textoDiv);
        } else {
            // Sin imagen: solo texto con colores personalizados
            div.style.backgroundColor = banner.color_fondo || '#d4a373';
            div.style.color = banner.color_texto || '#000000';
            div.textContent = banner.texto;
        }
        
        // Si tiene mensaje_whatsapp, hacerlo clickeable
        if (banner.mensaje_whatsapp && banner.mensaje_whatsapp.trim() !== '') {
            div.classList.add('banner-clickeable');
            div.addEventListener('click', () => {
                enviarBannerAWhatsApp(banner.mensaje_whatsapp);
            });
        }
        
        contenedor.appendChild(div);
    });
    
    // Agregar indicadores de posición (solo si hay más de 1 banner)
    if (totalBanners > 1) {
        const indicadoresPrevios = document.querySelector('.banner-indicadores');
        if (indicadoresPrevios) indicadoresPrevios.remove();
        
        const indicadores = document.createElement('div');
        indicadores.className = 'banner-indicadores';
        
        for (let i = 0; i < totalBanners; i++) {
            const punto = document.createElement('span');
            punto.className = 'punto' + (i === 0 ? ' activo' : '');
            punto.dataset.index = i;
            
            // Permitir clic en los puntos para ir a ese banner
            punto.addEventListener('click', () => {
                cambiarBanner(i);
                reiniciarIntervaloBanners();
            });
            
            indicadores.appendChild(punto);
        }
        
        contenedor.parentNode.insertBefore(indicadores, contenedor.nextSibling);
        
        // Iniciar rotación automática
        iniciarIntervaloBanners();
    }
}

// =========================================================================
// FUNCIONES DEL SLIDER
// =========================================================================
function cambiarBanner(nuevoIndex) {
    const contenedor = document.getElementById('banners-container');
    const banners = contenedor.querySelectorAll('.banner');
    const indicadores = document.querySelectorAll('.banner-indicadores .punto');
    
    if (banners.length === 0) return;
    
    // Ajustar el índice si se sale del rango
    if (nuevoIndex >= banners.length) nuevoIndex = 0;
    if (nuevoIndex < 0) nuevoIndex = banners.length - 1;
    
    // Desactivar todos
    banners.forEach(b => b.classList.remove('activo'));
    indicadores.forEach(p => p.classList.remove('activo'));
    
    // Activar el nuevo
    banners[nuevoIndex].classList.add('activo');
    if (indicadores[nuevoIndex]) indicadores[nuevoIndex].classList.add('activo');
    
    bannerActual = nuevoIndex;
}

function iniciarIntervaloBanners() {
    intervaloBanners = setInterval(() => {
        cambiarBanner(bannerActual + 1);
    }, 5000); // 5000 ms = 5 segundos
}

function reiniciarIntervaloBanners() {
    if (intervaloBanners) clearInterval(intervaloBanners);
    iniciarIntervaloBanners();
}

// =========================================================================
// FUNCIÓN PARA ENVIAR BANNER A WHATSAPP
// =========================================================================
function enviarBannerAWhatsApp(mensaje) {
    if (!menuData || !menuData.configuracion) {
        alert('Error al cargar la configuración. Recarga la página.');
        return;
    }
    
    const numero = menuData.configuracion.numero_whatsapp;
    
    if (!numero) {
        alert('El número de WhatsApp no está configurado.');
        return;
    }
    
    const mensajeCodificado = encodeURIComponent(mensaje);
    const url = `https://wa.me/${numero}?text=${mensajeCodificado}`;
    
    window.open(url, '_blank');
}

function crearTarjetaProducto(producto, nombreCategoria) {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'tarjeta-plato';
    tarjeta.dataset.id = producto.id;
    tarjeta.dataset.nombre = producto.nombre;
    tarjeta.dataset.descripcion = producto.descripcion;
    tarjeta.dataset.precio = producto.precio;
    tarjeta.dataset.imagen = producto.imagen;
    tarjeta.dataset.categoria = nombreCategoria;

    tarjeta.innerHTML = `
        <img src="${producto.imagen}" alt="${producto.nombre}" class="tarjeta-imagen" loading="lazy">
        <div class="tarjeta-info">
            <h3 class="tarjeta-titulo">${producto.nombre}</h3>
            <p class="tarjeta-descripcion">${producto.descripcion}</p>
            <span class="tarjeta-precio">${formatearPrecio(producto.precio)}</span>
        </div>
    `;

    tarjeta.addEventListener('click', () => abrirModalProducto(producto));
    return tarjeta;
}

function renderizarSidebar() {
    const sidebarLista = document.getElementById('sidebar-lista');
    sidebarLista.innerHTML = '';

    const categoriasOrdenadas = menuData.categorias
        .filter(c => c.activo !== false)
        .sort((a, b) => a.orden - b.orden);

    categoriasOrdenadas.forEach(categoria => {
        const enlace = document.createElement('a');
        enlace.href = `#${categoria.id}`;
        enlace.textContent = categoria.nombre;
        sidebarLista.appendChild(enlace);
    });
}

function actualizarFooter() {
    const config = menuData.configuracion;
    document.getElementById('footer-info').innerHTML = `
        ${config.nombre_restaurante} · ${config.direccion} · Tel: ${config.telefono_contacto}
    `;
    document.title = `${config.nombre_restaurante} - Carta Digital`;
}

// =========================================================================
// 4. MODAL DE PRODUCTO
// =========================================================================
function abrirModalProducto(producto) {
    productoSeleccionadoModal = producto;
    
    document.getElementById('modal-img').src = producto.imagen;
    document.getElementById('modal-titulo').textContent = producto.nombre;
    document.getElementById('modal-desc').textContent = producto.descripcion;
    document.getElementById('modal-precio').textContent = formatearPrecio(producto.precio);
    
    document.getElementById('modal-producto').classList.add('abierto');
    document.getElementById('overlay').classList.add('visible');
}

function cerrarModalProducto() {
    document.getElementById('modal-producto').classList.remove('abierto');
    document.getElementById('overlay').classList.remove('visible');
    productoSeleccionadoModal = null;
}

// =========================================================================
// 5. GESTIÓN DEL CARRITO
// =========================================================================
function agregarAlCarrito(producto) {
    const itemExistente = carrito.find(item => item.id === producto.id);
    
    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            imagen: producto.imagen,
            cantidad: 1
        });
    }
    
    guardarCarrito();
    actualizarCarritoUI();
    mostrarNotificacion(`"${producto.nombre}" agregado al carrito`);
}

function eliminarDelCarrito(id) {
    carrito = carrito.filter(item => item.id !== id);
    guardarCarrito();
    actualizarCarritoUI();
}

function cambiarCantidad(id, cambio) {
    const item = carrito.find(item => item.id === id);
    if (!item) return;
    
    item.cantidad += cambio;
    
    if (item.cantidad <= 0) {
        eliminarDelCarrito(id);
    } else {
        guardarCarrito();
        actualizarCarritoUI();
    }
}

function guardarCarrito() {
    localStorage.setItem('carrito_llanera', JSON.stringify(carrito));
}

function calcularTotal() {
    return carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);
}

function actualizarCarritoUI() {
    // Contador flotante
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    document.getElementById('contador-carrito').textContent = totalItems;
    
    // Items del carrito
    const contenedor = document.getElementById('carrito-items');
    
    if (carrito.length === 0) {
        contenedor.innerHTML = '<p style="text-align: center; color: #777; padding: 20px;">Tu carrito está vacío</p>';
    } else {
        contenedor.innerHTML = '';
        carrito.forEach(item => {
            const div = document.createElement('div');
            div.className = 'carrito-item';
            div.innerHTML = `
                <div class="carrito-item-info">
                    <div class="carrito-item-nombre">${item.nombre}</div>
                    <div class="carrito-item-precio">${formatearPrecio(item.precio)} c/u</div>
                </div>
                <div class="carrito-item-controles">
                    <button class="btn-cantidad" onclick="cambiarCantidad(${item.id}, -1)">−</button>
                    <span>${item.cantidad}</span>
                    <button class="btn-cantidad" onclick="cambiarCantidad(${item.id}, 1)">+</button>
                    <button class="btn-eliminar-item" onclick="eliminarDelCarrito(${item.id})">🗑</button>
                </div>
            `;
            contenedor.appendChild(div);
        });
    }
    
    // Total
    document.getElementById('carrito-total').textContent = formatearPrecio(calcularTotal());
    
    // Botón WhatsApp (habilitado/deshabilitado según horario)
    const btnWhatsApp = document.getElementById('btn-comprar-whatsapp');
    if (!estaAbierto()) {
        btnWhatsApp.disabled = true;
        btnWhatsApp.textContent = '🔒 Fuera de Horario';
    } else if (carrito.length === 0) {
        btnWhatsApp.disabled = true;
        btnWhatsApp.textContent = '🛒 Agrega productos primero';
    } else {
        btnWhatsApp.disabled = false;
        btnWhatsApp.textContent = '📲 Comprar por WhatsApp';
    }
}

// =========================================================================
// 6. VALIDACIÓN DE HORARIO
// =========================================================================
function estaAbierto() {
    if (!menuData) return false;
    
    const ahora = new Date();
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
    
    const [hApertura, mApertura] = menuData.configuracion.hora_apertura.split(':').map(Number);
    const [hCierre, mCierre] = menuData.configuracion.hora_cierre.split(':').map(Number);
    
    const minutosApertura = hApertura * 60 + mApertura;
    const minutosCierre = hCierre * 60 + mCierre;
    
    return horaActual >= minutosApertura && horaActual <= minutosCierre;
}

function verificarHorario() {
    const indicador = document.getElementById('indicador-horario');
    if (!menuData) return;
    
    const abierto = estaAbierto();
    const config = menuData.configuracion;
    const horarioTexto = formatearHora12(config.hora_apertura) + ' - ' + formatearHora12(config.hora_cierre);
    
    if (abierto) {
        indicador.className = 'abierto';
        indicador.textContent = `🟢 Abierto ahora · Pedidos disponibles (${horarioTexto})`;
    } else {
        indicador.className = 'cerrado';
        indicador.textContent = `🔴 Cerrado ahora · Horario de atención: ${horarioTexto}`;
    }
    
    actualizarCarritoUI();
}

// =========================================================================
// 7. GENERACIÓN DEL ENLACE DE WHATSAPP
// =========================================================================
function comprarPorWhatsApp() {
    if (!estaAbierto()) {
        alert('Nuestro horario de atención es de 3:00 PM a 9:45 PM. Vuelve dentro de nuestro horario para realizar tu pedido.');
        return;
    }
    
    if (carrito.length === 0) {
        alert('Tu carrito está vacío. Agrega productos antes de comprar.');
        return;
    }
    
    const config = menuData.configuracion;
    const total = calcularTotal();
    
    // Construir el mensaje
    let mensaje = `¡Hola, ${config.nombre_restaurante}! \n\n`;
    mensaje += `Quisiera realizar el siguiente pedido:\n\n`;
    mensaje += `*RESUMEN DEL PEDIDO:*\n`;
    
    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        mensaje += `• ${item.cantidad}x ${item.nombre} (${formatearPrecio(item.precio)} c/u) = ${formatearPrecio(subtotal)}\n`;
    });
    
    mensaje += `¡Gracias!`;
    
    // Codificar y abrir WhatsApp
    const mensajeCodificado = encodeURIComponent(mensaje);
    const url = `https://wa.me/${config.numero_whatsapp}?text=${mensajeCodificado}`;
    window.open(url, '_blank');
    
    // --- REINICIAR EL CARRITO DE INMEDIATO ---
    carrito = [];
    actualizarCarritoUI();
    
    // Cerrar panel del carrito
    document.getElementById('panel-carrito').classList.remove('abierto');
    document.getElementById('overlay').classList.remove('visible');
    
    // Notificar al cliente
    mostrarNotificacion('✅ Pedido enviado. El carrito fue reiniciado.');
}

// =========================================================================
// 8. UTILIDADES
// =========================================================================
function formatearPrecio(precio) {
    const moneda = menuData?.configuracion?.moneda || '$';
    return moneda + precio.toLocaleString('es-CO');
}

function formatearHora12(hora24) {
    const [h, m] = hora24.split(':');
    const hora = parseInt(h);
    const ampm = hora >= 12 ? 'PM' : 'AM';
    const hora12 = hora % 12 || 12;
    return `${hora12}:${m} ${ampm}`;
}

function mostrarNotificacion(mensaje) {
    // Crear notificación temporal
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
        background: #d4a373; color: #000; padding: 12px 24px;
        border-radius: 25px; font-weight: 600; font-size: 0.9rem;
        z-index: 9999; box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        animation: fadeInOut 2s ease;
    `;
    notif.textContent = mensaje;
    document.body.appendChild(notif);
    
    setTimeout(() => notif.remove(), 2000);
}

// =========================================================================
// 9. EVENTOS E INICIALIZACIÓN
// =========================================================================
function inicializarEventos() {
    // Menú lateral
    document.getElementById('btn-menu-flotante').addEventListener('click', () => {
        document.getElementById('sidebar-menu').classList.add('abierto');
        document.getElementById('overlay').classList.add('visible');
    });
    
    document.getElementById('cerrar-menu').addEventListener('click', () => {
        document.getElementById('sidebar-menu').classList.remove('abierto');
        document.getElementById('overlay').classList.remove('visible');
    });
    
    // Cerrar sidebar al hacer clic en un enlace
    document.getElementById('sidebar-lista').addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            document.getElementById('sidebar-menu').classList.remove('abierto');
            document.getElementById('overlay').classList.remove('visible');
        }
    });
    
    // Modal de producto
    document.getElementById('cerrar-modal').addEventListener('click', cerrarModalProducto);
    
    document.getElementById('btn-agregar-modal').addEventListener('click', () => {
        if (productoSeleccionadoModal) {
            agregarAlCarrito(productoSeleccionadoModal);
            cerrarModalProducto();
        }
    });
    
    // Carrito flotante
    document.getElementById('btn-carrito-flotante').addEventListener('click', () => {
        document.getElementById('panel-carrito').classList.add('abierto');
        document.getElementById('overlay').classList.add('visible');
    });
    
    document.getElementById('cerrar-carrito').addEventListener('click', () => {
        document.getElementById('panel-carrito').classList.remove('abierto');
        document.getElementById('overlay').classList.remove('visible');
    });
    
    // Botón WhatsApp
    document.getElementById('btn-comprar-whatsapp').addEventListener('click', comprarPorWhatsApp);
    
    // Overlay
    document.getElementById('overlay').addEventListener('click', () => {
        document.getElementById('sidebar-menu').classList.remove('abierto');
        document.getElementById('panel-carrito').classList.remove('abierto');
        document.getElementById('modal-legal').classList.remove('abierto');
        cerrarModalProducto();
    });
}

// Estilos para la animación de notificación
const styleAnim = document.createElement('style');
styleAnim.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
        15% { opacity: 1; transform: translateX(-50%) translateY(0); }
        85% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(20px); }
    }
`;
document.head.appendChild(styleAnim);

// =========================================================================
// AVISO DE COOKIES Y TEXTOS LEGALES
// =========================================================================
function inicializarLegal() {
    if (!menuData.legal) return;
    
    // Año actual en el footer
    document.getElementById('anio-actual').textContent = new Date().getFullYear();
    
    // ----- AVISO DE COOKIES -----
    const avisoCookies = document.getElementById('aviso-cookies');
    const avisoCookiesTexto = document.getElementById('aviso-cookies-texto');
    const btnAceptarCookies = document.getElementById('btn-aceptar-cookies');
    
    const cookiesAceptadas = localStorage.getItem('cookies_aceptadas_llanera');
    
    if (!cookiesAceptadas && menuData.legal.aviso_cookies.activo) {
        avisoCookiesTexto.textContent = menuData.legal.aviso_cookies.texto;
        btnAceptarCookies.textContent = menuData.legal.aviso_cookies.texto_boton;
        
        // Mostrar con un pequeño retraso para que no aparezca de inmediato
        setTimeout(() => {
            avisoCookies.classList.add('visible');
        }, 1500);
        
        btnAceptarCookies.addEventListener('click', () => {
            localStorage.setItem('cookies_aceptadas_llanera', 'true');
            avisoCookies.classList.remove('visible');
            setTimeout(() => avisoCookies.style.display = 'none', 400);
        });
    }
    
    // ----- MODAL LEGAL -----
    const modalLegal = document.getElementById('modal-legal');
    const modalLegalTitulo = document.getElementById('modal-legal-titulo');
    const modalLegalTexto = document.getElementById('modal-legal-texto');
    const cerrarModalLegal = document.getElementById('cerrar-modal-legal');
    
    function abrirModalLegal(tipo) {
        if (!menuData.legal[tipo]) return;
        
        modalLegalTitulo.textContent = menuData.legal[tipo].titulo;
        modalLegalTexto.textContent = menuData.legal[tipo].contenido;
        modalLegal.classList.add('abierto');
        document.getElementById('overlay').classList.add('visible');
    }
    
    function cerrarModalLegalFn() {
        modalLegal.classList.remove('abierto');
        document.getElementById('overlay').classList.remove('visible');
    }
    
    document.getElementById('link-privacidad').addEventListener('click', (e) => {
        e.preventDefault();
        abrirModalLegal('privacidad');
    });
    
    document.getElementById('link-terminos').addEventListener('click', (e) => {
        e.preventDefault();
        abrirModalLegal('terminos');
    });
    
    document.getElementById('link-cookies').addEventListener('click', (e) => {
        e.preventDefault();
        abrirModalLegal('cookies');
    });
    
    cerrarModalLegal.addEventListener('click', cerrarModalLegalFn);
}

// =========================================================================
// REGISTRO DEL SERVICE WORKER (PWA)
// =========================================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then((registration) => {
                console.log('✅ Service Worker registrado:', registration.scope);
            })
            .catch((error) => {
                console.warn('❌ Error al registrar Service Worker:', error);
            });
    });
}

// =========================================================================
// DETECCIÓN DE INSTALACIÓN PWA (Muestra un botón personalizado)
// =========================================================================
let eventoInstalacionPWA = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoInstalacionPWA = e;
    mostrarBotonInstalar();
});

function mostrarBotonInstalar() {
    // Evitar mostrar varias veces
    if (document.getElementById('btn-instalar-pwa')) return;
    
    const btn = document.createElement('button');
    btn.id = 'btn-instalar-pwa';
    btn.innerHTML = '📲 Instalar App';
    btn.style.cssText = `
        position: fixed;
        bottom: 90px;
        left: 20px;
        background: #d4a373;
        color: #000;
        border: none;
        padding: 12px 20px;
        border-radius: 25px;
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
        z-index: 1005;
        box-shadow: 0 4px 15px rgba(212, 163, 115, 0.6);
        font-family: 'Poppins', sans-serif;
        animation: pulse 2s infinite;
    `;
    
    // Animación de pulso
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
    `;
    document.head.appendChild(style);
    
    btn.addEventListener('click', async () => {
        if (!eventoInstalacionPWA) return;
        eventoInstalacionPWA.prompt();
        const { outcome } = await eventoInstalacionPWA.userChoice;
        if (outcome === 'accepted') {
            console.log('✅ App instalada');
        }
        eventoInstalacionPWA = null;
        btn.remove();
    });
    
    document.body.appendChild(btn);
}

// Detectar si ya está instalada (no mostrar el botón)
window.addEventListener('appinstalled', () => {
    console.log('PWA instalada correctamente');
    const btn = document.getElementById('btn-instalar-pwa');
    if (btn) btn.remove();
});

// Exponer funciones al scope global (para los onclick inline)
window.cambiarCantidad = cambiarCantidad;
window.eliminarDelCarrito = eliminarDelCarrito;