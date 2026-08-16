// Registro do service worker com base dinâmica (funciona em qualquer subcaminho de deploy)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = location.pathname.replace(/[^/]*$/, '');
    navigator.serviceWorker.register(base + 'sw.js').catch(() => {});
  });
}
