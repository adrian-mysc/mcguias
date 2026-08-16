// Bit & Solda — motor de tema (síncrono, evita flash de tema errado)
(function () {
  var KEY = 'bs_theme';
  var stored = localStorage.getItem(KEY);
  var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  var theme = stored || system;
  document.documentElement.setAttribute('data-theme', theme);

  window.toggleTheme = function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(KEY, next);
    syncFab(next);
    syncMeta(next);
  };

  function syncFab(t) {
    var fab = document.getElementById('theme-fab');
    if (!fab) return;
    fab.textContent = t === 'dark' ? '☀️' : '🌙';
    fab.title = t === 'dark' ? 'Modo claro' : 'Modo escuro';
  }

  function syncMeta(t) {
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.content = t === 'dark' ? '#0a0f0d' : '#eef2f1';
  }

  function inject() {
    if (document.getElementById('theme-fab')) return;
    var cur = document.documentElement.getAttribute('data-theme') || 'light';
    var b = document.createElement('button');
    b.id = 'theme-fab';
    b.className = 'theme-fab';
    b.setAttribute('aria-label', 'Alternar tema');
    b.textContent = cur === 'dark' ? '☀️' : '🌙';
    b.title = cur === 'dark' ? 'Modo claro' : 'Modo escuro';
    b.onclick = window.toggleTheme;
    document.body.appendChild(b);
  }

  function hideSplash() {
    var s = document.getElementById('splash');
    if (!s) return;
    s.classList.add('hide');
    setTimeout(function () { s.style.display = 'none'; }, 420);
  }

  if (document.readyState !== 'loading') {
    inject();
  } else {
    document.addEventListener('DOMContentLoaded', inject);
  }

  if (document.readyState === 'complete') {
    setTimeout(hideSplash, 150);
  } else {
    window.addEventListener('load', function () { setTimeout(hideSplash, 150); });
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    if (localStorage.getItem(KEY)) return;
    var t = e.matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    syncFab(t);
    syncMeta(t);
  });
}());
