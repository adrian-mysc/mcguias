/* ============================================================
   MC Guias — Cliente REST puro (SEM SDK / sem esm.sh)
   ------------------------------------------------------------
   Fala direto com o PostgREST (/rest/v1) e o GoTrue (/auth/v1)
   do Supabase usando fetch. Lê a sessão que o supabase-js gravou
   no localStorage (chave sb-<ref>-auth-token) e a renova via REST
   quando expira — sem depender do carregamento do SDK por CDN,
   que é o ponto de falha do sync para muitos usuários.

   Exporta um objeto `db` com: getUserId, getValidToken, select,
   insert, upsert, update, remove, rpc.
   ============================================================ */

const SUPABASE_URL = 'https://iizzeeceqysdfhnkosrc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpenplZWNlcXlzZGZobmtvc3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MTM4MDYsImV4cCI6MjA5NDI4OTgwNn0.tdoZWMwPoWz6uxmj1-6QNrYU8tt1u7mF8cGUY0DHHho';

const REST = SUPABASE_URL + '/rest/v1';
const AUTH = SUPABASE_URL + '/auth/v1';

// ── Sessão (lida do storage do supabase-js) ─────────────────────────────────
function _findAuthKey() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('-auth-token') !== -1) return k;
    }
  } catch (e) {}
  return null;
}

function getSession() {
  try {
    const k = _findAuthKey();
    if (!k) return null;
    const raw = JSON.parse(localStorage.getItem(k) || 'null');
    if (!raw) return null;
    return raw.currentSession || raw; // v2 grava a sessão direta; v1 envolve
  } catch (e) { return null; }
}

function _saveSession(sess) {
  try {
    const k = _findAuthKey() || ('sb-iizzeeceqysdfhnkosrc-auth-token');
    localStorage.setItem(k, JSON.stringify(sess));
  } catch (e) {}
}

function _expired(sess) {
  if (!sess || !sess.expires_at) return false;
  // expires_at em segundos; renova 60s antes
  return (sess.expires_at * 1000) <= (Date.now() + 60000);
}

let _refreshing = null;
async function _refresh(sess) {
  if (!sess || !sess.refresh_token) return null;
  if (_refreshing) return _refreshing;
  _refreshing = (async () => {
    try {
      const res = await fetch(AUTH + '/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ refresh_token: sess.refresh_token })
      });
      if (!res.ok) return null;
      const next = await res.json();
      if (next && next.access_token) { _saveSession(next); return next; }
      return null;
    } catch (e) { return null; }
    finally { _refreshing = null; }
  })();
  return _refreshing;
}

// Retorna uma sessão com access_token válido (renovando se preciso), ou null.
async function getValidSession() {
  let sess = getSession();
  if (!sess) return null;
  if (_expired(sess)) sess = await _refresh(sess);
  return sess && sess.access_token ? sess : null;
}

async function getValidToken() {
  const s = await getValidSession();
  return s ? s.access_token : null;
}

async function getUserId() {
  const s = await getValidSession();
  return s && s.user ? s.user.id : null;
}

// ── Núcleo de requisições ───────────────────────────────────────────────────
async function _headers(extra) {
  const token = await getValidToken();
  const h = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + (token || SUPABASE_ANON_KEY),
    'Content-Type': 'application/json'
  };
  return Object.assign(h, extra || {});
}

async function _req(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch (e) {}
    const err = new Error('REST ' + res.status + ' ' + url + ' ' + detail.slice(0, 200));
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  return ct.indexOf('application/json') !== -1 ? res.json() : null;
}

function _qs(params) {
  const parts = [];
  for (const k in params) {
    if (params[k] == null) continue;
    parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
  }
  return parts.length ? '?' + parts.join('&') : '';
}

// ── API de dados ────────────────────────────────────────────────────────────

// select('tabela', { columns, match:{col:val}, gt:{col:val}, in:{col:[...]},
//                    order:'col.desc', limit, single })
async function select(table, o) {
  o = o || {};
  const params = { select: o.columns || '*' };
  if (o.match) for (const c in o.match) params[c] = 'eq.' + o.match[c];
  if (o.gt)    for (const c in o.gt)    params[c] = 'gt.' + o.gt[c];
  if (o.in)    for (const c in o.in)    params[c] = 'in.(' + o.in[c].join(',') + ')';
  if (o.order) params.order = o.order;
  if (o.limit != null) params.limit = o.limit;
  const headers = await _headers(o.single ? { 'Accept': 'application/vnd.pgrst.object+json' } : null);
  return _req(REST + '/' + table + _qs(params), { method: 'GET', headers });
}

// Conta linhas que satisfazem os filtros (HEAD + Content-Range).
async function count(table, o) {
  o = o || {};
  const params = { select: o.columns || 'id' };
  if (o.match) for (const c in o.match) params[c] = 'eq.' + o.match[c];
  if (o.gt)    for (const c in o.gt)    params[c] = 'gt.' + o.gt[c];
  const headers = await _headers({ 'Prefer': 'count=exact', 'Range-Unit': 'items', 'Range': '0-0' });
  const res = await fetch(REST + '/' + table + _qs(params), { method: 'GET', headers });
  const cr = res.headers.get('content-range') || '';      // ex.: "0-0/42" ou "*/42"
  const total = parseInt((cr.split('/')[1] || '0'), 10);
  return isNaN(total) ? 0 : total;
}

// insert/upsert. opts: { upsert, onConflict, ignoreDuplicates }
async function insert(table, rows, opts) {
  opts = opts || {};
  let prefer = 'return=minimal';
  let q = '';
  if (opts.upsert) {
    prefer += ',resolution=' + (opts.ignoreDuplicates ? 'ignore-duplicates' : 'merge-duplicates');
    if (opts.onConflict) q = '?on_conflict=' + encodeURIComponent(opts.onConflict);
  }
  const headers = await _headers({ 'Prefer': prefer });
  return _req(REST + '/' + table + q, {
    method: 'POST', headers, body: JSON.stringify(rows)
  });
}

function upsert(table, rows, opts) {
  return insert(table, rows, Object.assign({ upsert: true }, opts || {}));
}

async function rpc(fn, args) {
  const headers = await _headers();
  return _req(REST + '/rpc/' + fn, { method: 'POST', headers, body: JSON.stringify(args || {}) });
}

export const db = { getSession, getValidSession, getValidToken, getUserId,
                    select, count, insert, upsert, rpc, SUPABASE_URL, SUPABASE_ANON_KEY };
