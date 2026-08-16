// Bit & Solda — service worker (cache básico + fallback offline)
const VERSION = 'bs-v1';
const BASE = self.location.pathname.replace(/sw\.js$/, '');

const PRECACHE = [
  BASE,
  BASE + 'index.html',
  BASE + 'quiz.html',
  BASE + 'css/styles.css',
  BASE + 'js/theme.js',
  BASE + 'js/store.js',
  BASE + 'js/app.js',
  BASE + 'js/quiz.js',
  BASE + 'data/hardware.json',
  BASE + 'data/manutencao.json',
  BASE + 'data/ti.json',
  BASE + 'manifest.json',
  BASE + 'icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(VERSION).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => cached || caches.match(BASE + 'index.html'));
      return cached || network;
    })
  );
});
