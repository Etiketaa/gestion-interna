const CACHE_NAME = 'bithouse-app-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/css/styles.css',
  '/css/cotizacion.css',
  '/js/app.js',
  '/js/utils.js',
  '/icon.svg',
  '/manifest.json'
];

// Instalar Service Worker y cachear recursos iniciales (opcional pero bueno para PWA)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Hacemos el cache de los assets mínimos. 
        // Si fallan algunos, no rompemos toda la instalación.
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(asset => cache.add(asset).catch(e => console.warn('Cache error:', asset, e)))
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Limpiar caches antiguos al activar el nuevo SW
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar peticiones para servir desde caché si estamos offline
// (estrategia Network First para una app dinámica)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  // Excluimos las peticiones a la API para que siempre vayan a red
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
