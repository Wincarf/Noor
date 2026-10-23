/**
 * Service Worker — cache-first with stale-while-revalidate and cache versioning.
 * On activate, old caches are purged so demo always gets fresh assets.
 */
const CACHE_NAME = 'noor-v3';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icon.svg',
  './styles/main.css',
  './styles/base.css',
  './styles/layout.css',
  './styles/components.css',
  './styles/animations.css',
  './src/app.js',
  './src/state.js',
  './src/utils.js',
  './src/db.js',
  './src/ai.js',
  './src/audio.js',
  './src/sync.js',
  './src/views/home.js',
  './src/views/add.js',
  './src/views/review.js',
  './src/views/history.js',
  './src/views/settings.js',
  './src/views/evidence.js',
];

// Install: pre-cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: purge old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for GET, network-only for POST (sync API)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Always network for API calls
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Stale-while-revalidate: return cached, update in background
        fetch(event.request)
          .then(res => {
            if (res && res.status === 200) {
              caches.open(CACHE_NAME).then(c => c.put(event.request, res));
            }
          })
          .catch(() => {});
        return cached;
      }
      // Not in cache: fetch from network, cache it
      return fetch(event.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
