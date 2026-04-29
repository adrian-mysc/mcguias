// MC Guias — Service Worker v15

const CACHE = "mc-guias-v25";
const offlineFallbackPage = "/mcguias/offline.html";

// ---- Install: pre-cache all pages ----
self.addEventListener('install', async (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([
      offlineFallbackPage,
      '/mcguias/',
      '/mcguias/index.html',
      '/mcguias/css/styles.css',
      '/mcguias/js/main.js',
      '/mcguias/js/game.js',
      '/mcguias/js/gamificacao.js',
      '/mcguias/manifest.json',
      '/mcguias/icons/icon-192.png',
      '/mcguias/icons/icon-512.png',
      '/mcguias/icons/splash-icon.png',
      '/mcguias/pages/quiz.html',
      '/mcguias/pages/quiz-tempos-validades.html',
      '/mcguias/pages/conquistas.html',
      '/mcguias/pages/chapa.html',
      '/mcguias/pages/lope.html',
      '/mcguias/pages/lope2.html',
      '/mcguias/pages/linha.html',
      '/mcguias/pages/mcfritas.html',
      '/mcguias/pages/fritas.html',
      '/mcguias/pages/fritos.html',
      '/mcguias/pages/condimentacao.html',
      '/mcguias/pages/salao-ngk.html',
      '/mcguias/pages/montagem-entrega.html',
      '/mcguias/pages/mcdelivery.html',
      '/mcguias/pages/influencer-pagamento.html',
      '/mcguias/pages/drive-thru.html',
      '/mcguias/pages/bebidas-sobremesas.html',
      '/mcguias/pages/mccafe.html',
      '/mcguias/pages/limpeza.html',
      '/mcguias/pages/jogo-condimentacao.html',
      '/mcguias/pages/treinadores.html',
      '/mcguias/pages/supervisores.html',
      '/mcguias/404.html',
      '/mcguias/pages/fechamento.html',
      '/mcguias/pages/promocao-interna.html',
      '/mcguias/pages/estoque-recebimento.html',
      '/mcguias/pages/seguranca-alimento.html',
      '/mcguias/pages/manutencao-preventivas.html',
      '/mcguias/pages/glossario.html',
      '/mcguias/pages/provas-testes.html',
      '/mcguias/pages/validades-secundarias.html',
      '/mcguias/quiz.html',
    ]))
  );
  // Take over immediately — no waiting for old SW to release
  self.skipWaiting();
});

// ---- Activate: clean old caches, claim clients, reload pages ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      const oldCaches = keys.filter((key) => key !== CACHE);
      const isUpdate = oldCaches.length > 0;
      return Promise.all(oldCaches.map((key) => caches.delete(key)))
        .then(() => self.clients.claim())
        .then(() => {
          if (!isUpdate) return;
          // Force reload all open windows so fresh JS/CSS applies immediately
          return self.clients.matchAll({ type: 'window' }).then((clients) => {
            clients.forEach((client) => {
              client.postMessage({ type: 'SW_UPDATED', version: CACHE });
              client.navigate(client.url);
            });
          });
        });
    })
  );
});

// ---- Message handler ----
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.source && event.source.postMessage({ type: 'SW_VERSION', version: CACHE });
  }
});

// ---- Fetch strategy ----
// Images: cache-first (rarely change, save bandwidth)
// HTML, JS, CSS: network-first with cache fallback
//   → ensures fresh code loads after every deploy, no manual cache clear needed
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isImage = /\.(png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname);
  const isNavigate = event.request.mode === 'navigate';

  if (isImage) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(resp => {
          caches.open(CACHE).then(c => c.put(event.request, resp.clone()));
          return resp;
        });
      })
    );
    return;
  }

  // Network-first for HTML, JS, CSS
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const networkResp = await fetch(event.request);
      cache.put(event.request, networkResp.clone());
      return networkResp;
    } catch {
      return (await cache.match(event.request))
          || (isNavigate ? await cache.match(offlineFallbackPage) : new Response('', { status: 408 }));
    }
  })());
});
