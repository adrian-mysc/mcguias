// MC Guias — Service Worker v16

const CACHE = "mc-guias-v26";
const offlineFallbackPage = "/mcguias/offline.html";

// ---- Install: pre-cache all pages ----
self.addEventListener('install', async (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => clients.claim())
      .then(() => {
        clients.matchAll({ type: 'window' }).then(wcs => {
          wcs.forEach(wc => wc.postMessage({ type: 'SW_UPDATED' }));
        });
      })
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
