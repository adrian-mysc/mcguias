// MC Guias — Theme engine
// Carrega de forma síncrona (sem defer) para evitar flash de tema errado.
// Injeta o botão de alternância após o DOM estar pronto.
(function () {
  var stored = localStorage.getItem('mc_theme');
  var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  var theme  = stored || system;
  document.documentElement.setAttribute('data-theme', theme);

  window.toggleTheme = function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('mc_theme', next);
    _syncFab(next);
    _syncMeta(next);
  };

  function _syncFab(t) {
    var fab = document.getElementById('theme-fab');
    if (!fab) return;
    fab.textContent = t === 'dark' ? '☀️' : '🌙';
    fab.title       = t === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro';
  }

  function _syncMeta(t) {
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.content = t === 'dark' ? '#0d0c0a' : '#f0ede8';
  }

  function _inject() {
    if (document.getElementById('theme-fab')) return;
    var cur = document.documentElement.getAttribute('data-theme') || 'light';
    var b = document.createElement('button');
    b.id        = 'theme-fab';
    b.className = 'theme-fab';
    b.setAttribute('aria-label', 'Alternar tema');
    b.textContent = cur === 'dark' ? '☀️' : '🌙';
    b.title       = cur === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro';
    b.onclick = window.toggleTheme;
    document.body.appendChild(b);
  }

  if (document.readyState !== 'loading') {
    _inject();
  } else {
    document.addEventListener('DOMContentLoaded', _inject);
  }

  // Splash — esconde o overlay de carregamento após o load completo.
  // Centralizado aqui (antes era um <script> inline duplicado em cada página).
  // Se a página não tem #splash, é no-op.
  function _hideSplash() {
    var s = document.getElementById('splash');
    if (!s) return;
    s.classList.add('hide');
    setTimeout(function () { s.style.display = 'none'; }, 420);
  }
  if (document.readyState === 'complete') {
    setTimeout(_hideSplash, 200);
  } else {
    window.addEventListener('load', function () { setTimeout(_hideSplash, 200); });
  }

  // Segue o sistema quando o usuário não definiu preferência
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    if (localStorage.getItem('mc_theme')) return;
    var t = e.matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    _syncFab(t);
    _syncMeta(t);
  });
}());
