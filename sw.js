// Offline support: serve from cache first, refresh the cache in the background.
const VERSION = 'kiln-v1';
const CORE = [
  './',
  'index.html',
  'hub/sdk.js',
  'hub/config.js',
  'games/registry.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return;

  const network = fetch(req).then(async res => {
    if (res.ok || res.type === 'opaque') {
      const copy = res.clone();
      const cache = await caches.open(VERSION);
      await cache.put(req, copy);
    }
    return res;
  });
  e.respondWith(caches.match(req, { ignoreSearch: sameOrigin }).then(hit => hit || network));
  e.waitUntil(network.then(() => {}, () => {}));
});
