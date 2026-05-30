// MC Guias — Service Worker v38
// Atualização: base de caminho dinâmica (BASE) — funciona tanto em /mcguias/
// (GitHub Pages) quanto em / (Vercel/domínio próprio), sem caminho fixo.

const CACHE = 'mc-guias-v38';

// Raiz da aplicação, derivada da própria URL do SW:
//   GitHub Pages → '/mcguias/sw.js'  ⇒ BASE = '/mcguias/'
//   Vercel/raiz  → '/sw.js'          ⇒ BASE = '/'
const BASE = self.location.pathname.replace(/sw\.js$/, '');

const offlineFallbackPage = BASE + 'offline.html';

// Caminhos relativos à raiz; prefixados com BASE em runtime.
const PRECACHE_PATHS = [
  'offline.html',
  '',
  'index.html',
  'css/styles.css',
  'js/main.js',
  'js/gamificacao.js',
  'js/auth-guard.js',
  'js/theme.js',
  'js/questionLoader.js',
  'js/changelog.js',
  'manifest.json',
  // Questões — garantem funcionamento 100% offline desde a instalação do PWA
  'data/questions/chapa/basico.json',
  'data/questions/lope/basico.json',
  'data/questions/linha/basico.json',
  'data/questions/mcfritas/basico.json',
  'data/questions/fritas/basico.json',
  'data/questions/fritos/basico.json',
  'data/questions/condimentacao/basico.json',
  'data/questions/salao-ngk/basico.json',
  'data/questions/montagem-entrega/basico.json',
  'data/questions/influencer-pagamento/basico.json',
  'data/questions/drive-thru/basico.json',
  'data/questions/bebidas-sobremesas/basico.json',
  'data/questions/embaixador-experiencia/basico.json',
  'data/questions/seguranca-alimento/basico.json',
  'data/questions/estoque-recebimento/basico.json',
  'data/questions/fechamento/basico.json',
  'data/questions/mccafe/basico.json',
  'data/questions/manutencao-preventivas/basico.json',
  'data/questions/best-burguer/basico.json',
  'data/questions/mcdelivery/basico.json',
  'data/questions/gerencia/basico.json',
  'data/questions/lideranca/basico.json',
  'data/questions/treinador/basico.json',
  'data/questions/olimpiada/basico.json',
];

const PRECACHE_ASSETS = PRECACHE_PATHS.map((p) => BASE + p);

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
  let data = { title: 'MC Guias 📚', body: 'Hora de estudar! Mantenha seu streak.', url: BASE };
  if (event.data) {
    try { data = Object.assign(data, event.data.json()); } catch (e) {}
  }
  const options = {
    body:     data.body,
    icon:     BASE + 'icons/icon-192.png',
    badge:    BASE + 'icons/icon-192.png',
    tag:      data.tag || 'mc-daily-reminder',
    renotify: false,
    data:     { url: data.url || BASE },
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
    ? event.notification.data.url : BASE;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].url.indexOf(self.location.origin + BASE) !== -1 && 'focus' in clients[i]) {
          return clients[i].focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

// Set de pathnames pré-cacheados para cache-first lookup rápido
const PRECACHE_SET = new Set(PRECACHE_ASSETS);

// ---- Fetch: estratégias por tipo de recurso ----
self.addEventListener('fetch', (event) => {
  const url        = new URL(event.request.url);
  const isImage    = /\.(png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname);
  const isNavigate = event.request.mode === 'navigate';
  const isPrecached = PRECACHE_SET.has(url.pathname);

  // Ignora cross-origin (CDNs, Google Fonts, etc.)
  if (url.origin !== self.location.origin) return;

  // Cache-first para imagens
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

  // Cache-first para assets pré-cacheados (JS, CSS, JSON de questões)
  // Estes só mudam quando o CACHE é bumpeado — servir do cache é sempre seguro e mais rápido
  if (isPrecached) {
    event.respondWith((async () => {
      const cache  = await caches.open(CACHE);
      const cached = await cache.match(event.request);
      if (cached) {
        // Revalida em background sem bloquear a resposta
        fetch(event.request).then((resp) => {
          if (resp && resp.status === 200) cache.put(event.request, resp.clone());
        }).catch(() => {});
        return cached;
      }
      // Fallback: busca na rede se não estiver no cache ainda
      const networkResp = await fetch(event.request);
      if (networkResp && networkResp.status === 200) cache.put(event.request, networkResp.clone());
      return networkResp;
    })());
    return;
  }

  // Network-first com timeout de 3s para navegação e outros requests
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const timeoutPromise = isNavigate
        ? new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        : null;
      const fetchPromise  = fetch(event.request);
      const networkResp   = await (timeoutPromise ? Promise.race([fetchPromise, timeoutPromise]) : fetchPromise);
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
