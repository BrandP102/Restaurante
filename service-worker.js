// =========================================================================
// SERVICE WORKER - LLANERA Y PARRILLA
// =========================================================================

const CACHE_NAME = 'llanera-parrilla-v5';

// Archivos que se guardan en caché para funcionar sin conexión
const ARCHIVOS_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './menu.json',
    './logo.webp',
    './manifest.json',
    './icons/icon-72x72.png',
    './icons/icon-96x96.png',
    './icons/icon-128x128.png',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png'
];

// INSTALACIÓN: Guardar archivos en caché
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Cacheando archivos');
                return cache.addAll(ARCHIVOS_CACHE);
            })
            .catch((err) => console.warn('Algunos archivos no se pudieron cachear:', err))
    );
    self.skipWaiting();
});

// ACTIVACIÓN: Limpiar cachés antiguas
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Eliminando caché antigua:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// FETCH: Estrategia "Network First, Cache Fallback"
// Primero intenta traer de internet, si falla usa el caché
self.addEventListener('fetch', (event) => {
    // No cachear las peticiones a WhatsApp ni a fuentes externas
    if (event.request.url.includes('wa.me') || 
        event.request.url.includes('whatsapp') ||
        event.request.url.includes('fonts.googleapis') ||
        event.request.url.includes('fonts.gstatic')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Si la respuesta es válida, guardar una copia en caché
                if (response && response.status === 200 && event.request.method === 'GET') {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Si falla la red, buscar en caché
                return caches.match(event.request).then((response) => {
                    if (response) return response;
                    // Si no está en caché y es HTML, mostrar el index
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});