const CACHE_NAME = 'breadcrumbs-v8';
const STATIC_ASSETS = [
  '/breadcrumbs/',
  '/breadcrumbs/index.html',
  '/breadcrumbs/css/style.css',
  '/breadcrumbs/js/app.js',
  '/breadcrumbs/js/config.js',
  '/breadcrumbs/js/map.js',
  '/breadcrumbs/js/offlineCache.js',
  '/breadcrumbs/js/ui.js',
  '/breadcrumbs/js/supabase.js',
  '/breadcrumbs/js/pinLogic.js',
  '/breadcrumbs/js/username.js',
  '/breadcrumbs/js/data.js',
  '/breadcrumbs/manifest.json',
  '/breadcrumbs/assets/pin-placeholder.svg',
  '/breadcrumbs/assets/icon.svg',
  '/breadcrumbs/assets/crow-swoop.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.hostname.includes('supabase.co')) {
    event.respondWith(fetchNetworkFirst(event.request));
    return;
  }

  event.respondWith(fetchCacheFirst(event.request));
});

async function fetchCacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function fetchNetworkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (err) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}
