// ── Service Worker · DOMContentLoaded · Update Toast ─────────

function applyUpdate(reg) {
  const r = reg || window._swRegistration;
  if (r && r.waiting) {
    r.waiting.postMessage({ type: 'SKIP_WAITING' });
  } else {
    window.location.reload();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initSwipeNav();
  initChecklist();
  initOnboarding();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/mcguias/sw.js')
      .then(function(reg) {

        setInterval(function() { reg.update(); }, 60 * 60 * 1000);
      })
      .catch(err => console.log('SW error:', err));
  });

  navigator.serviceWorker.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SW_UPDATED') {
      mcShowUpdateToast();
    }

    if (event.data && event.data.type === 'SW_VERSION') {
      var lastVer = McStorage.get('mc_sw_version', null);
      var curVer  = event.data.version;
      if (lastVer && lastVer !== curVer) {
        mcShowUpdateToast();
      }
      McStorage.set('mc_sw_version', curVer);
    }
  });

  navigator.serviceWorker.ready.then(function(reg) {
    if (reg.active) {
      reg.active.postMessage({ type: 'GET_VERSION' });
    }
  }).catch(function() {});
}

function mcShowUpdateToast() {
  if (document.getElementById('mc-update-toast')) return;
  var toast = document.createElement('div');
  toast.id = 'mc-update-toast';
  toast.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);'
    + 'background:#1565c0;color:#fff;padding:12px 18px;border-radius:24px;'
    + 'font-size:13px;font-weight:700;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.3);'
    + 'display:flex;align-items:center;gap:10px;white-space:nowrap;max-width:90vw;';
  toast.innerHTML = '🆕 Nova versão disponível! <button onclick="location.reload()" style="background:#fff;color:#1565c0;border:none;border-radius:16px;padding:4px 12px;font-size:12px;font-weight:800;cursor:pointer;margin-left:4px;">Atualizar</button>'
    + '<button onclick="this.parentNode.remove()" style="background:rgba(255,255,255,0.2);color:#fff;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:14px;line-height:1;flex-shrink:0;">×</button>';
  document.body.appendChild(toast);
}

// Checar atualizações a cada 60s
setInterval(() => { if (window._swRegistration) window._swRegistration.update(); }, 60000);
