// MC Guias — Service Worker v35
// Atualização: pre-cache de todos os JSON de questões para suporte offline completo

const CACHE = 'mc-guias-v35';
const offlineFallbackPage = '/mcguias/offline.html';

const PRECACHE_ASSETS = [
  '/mcguias/offline.html',
  '/mcguias/',
  '/mcguias/index.html',
  '/mcguias/css/styles.css',
  '/mcguias/js/main.js',
  '/mcguias/js/gamificacao.js',
  '/mcguias/js/auth-guard.js',
  '/mcguias/manifest.json',
  // Questões — garantem funcionamento 100% offline desde a instalação do PWA
  '/mcguias/data/questions/chapa/basico.json',
  '/mcguias/data/questions/lope/basico.json',
  '/mcguias/data/questions/linha/basico.json',
  '/mcguias/data/questions/mcfritas/basico.json',
  '/mcguias/data/questions/fritas/basico.json',
  '/mcguias/data/questions/fritos/basico.json',
  '/mcguias/data/questions/condimentacao/basico.json',
  '/mcguias/data/questions/salao-ngk/basico.json',
  '/mcguias/data/questions/montagem-entrega/basico.json',
  '/mcguias/data/questions/influencer-pagamento/basico.json',
  '/mcguias/data/questions/drive-thru/basico.json',
  '/mcguias/data/questions/bebidas-sobremesas/basico.json',
  '/mcguias/data/questions/embaixador-experiencia/basico.json',
  '/mcguias/data/questions/seguranca-alimento/basico.json',
  '/mcguias/data/questions/estoque-recebimento/basico.json',
  '/mcguias/data/questions/fechamento/basico.json',
  '/mcguias/data/questions/mccafe/basico.json',
  '/mcguias/data/questions/manutencao-preventivas/basico.json',
  '/mcguias/data/questions/best-burguer/basico.json',
  '/mcguias/data/questions/mcdelivery/basico.json',
  '/mcguias/data/questions/gerencia/basico.json',
  '/mcguias/data/questions/lideranca/basico.json',
  '/mcguias/data/questions/treinador/basico.json',
  '/mcguias/data/questions/olimpiada/basico.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) => cache.add(url).catch(() => {}))
      );
    })
  );
});

// ---- Activate: limpa caches antigos, assume clientes ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      const oldCaches = keys.filter((key) => key !== CACHE);
      const isUpdate  = oldCaches.length > 0;
      return Promise.all(oldCaches.map((key) => caches.delete(key)))
        .then(() => self.clients.claim())
        .then(() => {
          if (!isUpdate) return;
          return self.clients.matchAll({ type: 'window' }).then((clients) => {
            clients.forEach((client) => {
              client.postMessage({ type: 'SW_UPDATED', version: CACHE });
            });
          });
        });
    })
  );
});

// ---- Message handler ----
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data.type === 'GET_VERSION') {
    if (event.source) {
      event.source.postMessage({ type: 'SW_VERSION', version: CACHE });
    }
  }
});

// ---- Push Notifications ----
self.addEventListener('push', (event) => {
  let data = { title: 'MC Guias 📚', body: 'Hora de estudar! Mantenha seu streak.', url: '/mcguias/' };
  if (event.data) {
    try { data = Object.assign(data, event.data.json()); } catch (e) {}
  }
  const options = {
    body:     data.body,
    icon:     '/mcguias/icons/icon-192.png',
    badge:    '/mcguias/icons/icon-192.png',
    tag:      data.tag || 'mc-daily-reminder',
    renotify: false,
    data:     { url: data.url || '/mcguias/' },
    actions:  [
      { action: 'open',    title: '📖 Estudar agora' },
      { action: 'dismiss', title: '✕ Fechar'         },
    ],
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ---- Notification click ----
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url : '/mcguias/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].url.indexOf('/mcguias') !== -1 && 'focus' in clients[i]) {
          return clients[i].focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

// ---- Fetch: network-first com fallback de cache ----
self.addEventListener('fetch', (event) => {
  const url        = new URL(event.request.url);
  const isImage    = /\.(png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname);
  const isNavigate = event.request.mode === 'navigate';

  // Ignora cross-origin (CDNs, Google Fonts, etc.)
  if (url.origin !== self.location.origin) return;

  if (isImage) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((resp) => {
          caches.open(CACHE).then((c) => c.put(event.request, resp.clone()));
          return resp;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const networkResp = await fetch(event.request);
      if (networkResp && networkResp.status === 200) {
        cache.put(event.request, networkResp.clone());
      }
      return networkResp;
    } catch (e) {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      if (isNavigate) {
        const offline = await cache.match(offlineFallbackPage);
        if (offline) return offline;
      }
      return new Response('', { status: 408, statusText: 'Offline' });
    }
  })());
});
