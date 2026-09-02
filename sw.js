// sw.js — Ingrado service worker: precache the app shell, then serve
// network-first with cache fallback so updates land immediately when online
// and the app still opens offline. Bump CACHE_VERSION on breaking changes.

const CACHE_VERSION = 'scanwise-v7';

const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './icon.svg',
  './manifest.webmanifest',
  './js/main.js',
  './js/schema.js',
  './js/ingredients-db.js',
  './js/analyzer.js',
  './js/scoring.js',
  './js/store.js',
  './js/ocr.js',
  './js/ai.js',
  './js/demo-data.js',
  './js/ui.js',
  './js/barcode.js',
  './js/product-db.js',
  './js/matching.js',
  './js/match-config.js',
  './js/reconcile.js',
  './js/ingredient-parser.js',
  './js/normalize.js',
  './js/nutrition-calc.js',
  './js/dv-constants.js',
  './js/assessment.js',
  './js/categories.js',
  './js/claims.js',
  './js/alternatives.js',
  './js/views/library.js',
  './js/views/landing.js',
  './js/views/home.js',
  './js/views/scan.js',
  './js/views/review.js',
  './js/views/report.js',
  './js/views/history.js',
  './js/views/compare.js',
  './js/views/prefs.js',
  './js/views/pricing.js',
  './js/views/profile.js',
  './js/views/legal.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Never cache API calls; let them fail naturally so the client falls back.
  if (url.pathname.startsWith('/api/')) return;
  // Third-party (e.g. the OCR CDN) — network only, browser cache handles it.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Offline navigation fallback: serve the app shell.
        if (request.mode === 'navigate') {
          const shell = await caches.match('./index.html');
          if (shell) return shell;
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
  );
});
