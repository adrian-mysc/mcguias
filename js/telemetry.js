/* ============================================================
   MC Guias — Telemetria leve
   ------------------------------------------------------------
   Registra eventos do app (app_open, quiz_started, quiz_finished)
   na tabela public.app_events via REST direto do PostgREST.

   IMPORTANTE: NÃO importa o supabase-js (esm.sh). Isso é proposital
   — o carregamento do SDK por CDN é o ponto de falha suspeito que
   impede o sync de muitos usuários. Esta telemetria funciona mesmo
   quando o SDK não carrega, medindo o alcance real do app.

   Best-effort: nunca lança, nunca bloqueia a UI.
   Uso: window.mcTrack('evento', { ...meta }).
   ============================================================ */
(function () {
  var SUPABASE_URL = 'https://iizzeeceqysdfhnkosrc.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpenplZWNlcXlzZGZobmtvc3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MTM4MDYsImV4cCI6MjA5NDI4OTgwNn0.tdoZWMwPoWz6uxmj1-6QNrYU8tt1u7mF8cGUY0DHHho';
  var ENDPOINT = SUPABASE_URL + '/rest/v1/app_events';

  function deviceId() {
    try {
      var k = 'mc_device_id';
      var v = localStorage.getItem(k);
      if (!v) {
        v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
             : (Date.now() + '-' + Math.random().toString(36).slice(2));
        localStorage.setItem(k, v);
      }
      return v;
    } catch (e) { return null; }
  }

  // Extrai o user id da sessão do supabase no localStorage (sb-<ref>-auth-token),
  // sem depender do SDK. Atribuição best-effort.
  function userId() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key || key.indexOf('-auth-token') === -1) continue;
        var raw = JSON.parse(localStorage.getItem(key) || '{}');
        var sess = raw && (raw.currentSession || raw);
        var uid = sess && sess.user && sess.user.id;
        if (uid) return uid;
      }
    } catch (e) {}
    return null;
  }

  function track(event, meta) {
    try {
      var body = JSON.stringify({
        event: String(event || 'unknown').slice(0, 40),
        user_id: userId(),
        anon_id: deviceId(),
        path: location.pathname,
        meta: meta || null
      });
      // fetch keepalive funciona inclusive durante unload (mais confiável que
      // sendBeacon aqui, pois precisamos enviar os headers apikey/Authorization).
      fetch(ENDPOINT, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
          'Prefer': 'return=minimal'
        },
        body: body
      }).catch(function () {});
    } catch (e) {}
  }

  window.mcTrack = track;

  // Evento automático de abertura do app (uma vez por carregamento de página)
  track('app_open', null);
})();
