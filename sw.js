// MC Guias — Service Worker v12

const CACHE = "mc-guias-v20";
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
      '/mcguias/manifest.json',
      '/mcguias/icons/icon-192.png',
      '/mcguias/icons/icon-512.png',
      '/mcguias/icons/splash-icon.png',
      '/mcguias/pages/quiz.html',
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
    ]))
  );
  // Take over immediately without waiting for old SW to be released
  self.skipWaiting();
});

// ---- Activate: clean old caches + notify clients ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      const oldCaches = keys.filter((key) => key !== CACHE);
      const hadOldCache = oldCaches.length > 0;
      return Promise.all(oldCaches.map((key) => {
        console.log('[SW] Deleting old cache:', key);
        return caches.delete(key);
      })).then(() => {
        // Take control of all open pages immediately
        return self.clients.claim();
      }).then(() => {
        // Only notify if this is a real update (old cache existed), not first install
        if (!hadOldCache) return;
        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'SW_UPDATED', version: CACHE });
          });
        });
      });
    })
  );
});

// ---- Message: manual skip waiting from page ----
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "GET_VERSION") {
    event.source && event.source.postMessage({ type: 'SW_VERSION', version: CACHE });
  }
});

// ---- Fetch: network first for navigation, cache first for assets ----
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const networkResp = await fetch(event.request);
        // Update cache with fresh response
        const cache = await caches.open(CACHE);
        cache.put(event.request, networkResp.clone());
        return networkResp;
      } catch (error) {
        const cache = await caches.open(CACHE);
        return (await cache.match(event.request)) || (await cache.match(offlineFallbackPage));
      }
    })());
  } else {
    // Cache first for static assets (CSS, JS, images)
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(resp => {
          // Cache the new asset
          return caches.open(CACHE).then(cache => {
            cache.put(event.request, resp.clone());
            return resp;
          });
        });
      })
    );
  }
});
