/* Service Worker SIPETA MITRA — Versi di-bump setiap update index.html / pwa-config.js */
const VERSION = 'v5.4.2'; // Diubah agar browser/HP otomatis menghapus cache versi lama
const SHELL_CACHE = 'app-shell-' + VERSION;
const RUNTIME_CACHE = 'runtime-' + VERSION;
const PRECACHE = [
  "./",
  "./gas-bridge.js",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./index.html",
  "./manifest.json",
  "./pwa-config.js"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => (k.startsWith('app-shell-') || k.startsWith('runtime-')) && k !== SHELL_CACHE && k !== RUNTIME_CACHE)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Jangan pernah mencegat panggilan ke Apps Script / Google: ditangani oleh gas-bridge.js
  if (/(^|\.)(google\.com|googleusercontent\.com)$/.test(url.hostname)) return;

  // API Cuaca Open-Meteo (Beranda): network-first agar cuaca selalu baru saat online, fallback cache saat offline
  if (url.hostname === 'api.open-meteo.com') {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) =>
        fetch(req).then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => cache.match(req).then((hit) => hit || Response.error()))
      )
    );
    return;
  }

  // Same-origin: app shell, cache first (nama cache berubah di setiap build)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req, { ignoreSearch: true }).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
      })
    );
    return;
  }

  // Cross-origin static assets (CDN Tailwind, Font Awesome, Google Fonts): stale-while-revalidate
  event.respondWith(
    caches.open(RUNTIME_CACHE).then((cache) =>
      cache.match(req).then((hit) => {
        const net = fetch(req).then((res) => {
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        }).catch(() => hit || Response.error());
        return hit || net;
      })
    )
  );
});
